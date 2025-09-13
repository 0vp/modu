import os
import fal_client
from dotenv import load_dotenv
import json
import base64
from PIL import Image
import requests
from io import BytesIO

# Load environment variables
load_dotenv()

# Set FAL API key from environment
fal_client.api_key = os.environ.get("FAL_KEY")

def convert_local_image_to_data_url(image_path):
    """
    Convert a local image file to a data URL for FAL API
    
    Args:
        image_path (str): Path to local image file
    
    Returns:
        str: Data URL of the image
    """
    try:
        # Determine the image type from extension
        ext = os.path.splitext(image_path)[1].lower()
        mime_types = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp'
        }
        mime_type = mime_types.get(ext, 'image/jpeg')
        
        # Read and encode the image
        with open(image_path, 'rb') as image_file:
            encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
            return f"data:{mime_type};base64,{encoded_string}"
    except Exception as e:
        print(f"Error converting image {image_path}: {e}")
        return None

def get_image_dimensions(image_path_or_url):
    """
    Get dimensions of an image from path or URL
    
    Args:
        image_path_or_url (str): Local path or URL to image
    
    Returns:
        tuple: (width, height) or None if unable to get dimensions
    """
    try:
        if image_path_or_url.startswith('http://') or image_path_or_url.startswith('https://'):
            # Download image from URL
            response = requests.get(image_path_or_url, timeout=10)
            img = Image.open(BytesIO(response.content))
        else:
            # Open local image
            img = Image.open(image_path_or_url)
        
        return img.size  # Returns (width, height)
    except Exception as e:
        print(f"Error getting image dimensions: {e}")
        return None

def generate_image(prompt, image_paths=None, **kwargs):
    """
    Generate an image using FAL AI
    
    Args:
        prompt (str): Text prompt for image generation
        image_paths (list): Optional list of image paths for image-to-image generation
        **kwargs: Additional parameters for the FAL model
    
    Returns:
        dict: Response from FAL API containing generated image URL and metadata
    """
    try:
        # For bytedance/seedream model
        model = kwargs.get("model", "fal-ai/bytedance/seedream/v4/edit")
        
        # Get dimensions from first image (the base image)
        image_size = None
        width, height = None, None
        if image_paths and len(image_paths) > 0:
            dimensions = get_image_dimensions(image_paths[0])
            if dimensions:
                width, height = dimensions
                image_size = {
                    "width": width,
                    "height": height
                }
                print(f"Using image size from first image: {image_size}")
                
                # Add dimensions to the prompt
                prompt = f"{prompt} \n output size: width: 864 px, height: 1152 px"
                print(f"Enhanced prompt: {prompt}")
        
        # Convert local paths to data URLs
        converted_images = []
        if image_paths:
            for path in image_paths:
                if path.startswith('http://') or path.startswith('https://'):
                    # It's already a URL
                    converted_images.append(path)
                else:
                    # It's a local path, convert to data URL
                    data_url = convert_local_image_to_data_url(path)
                    if data_url:
                        converted_images.append(data_url)
        
        # Build parameters for bytedance/seedream model
        params = {
            "prompt": prompt,
            "image_urls": converted_images,  # Note: image_urls (plural) for this model
            "num_images": kwargs.get("num_images", 1),
            "output_format": kwargs.get("output_format", "jpeg")
        }
        
        # Add image size if detected from first image
        if image_size:
            params["image_size"] = image_size
        
        # Submit request to FAL using subscribe for better handling
        result = fal_client.subscribe(
            model,
            arguments=params,
            with_logs=True
        )
        
        return {
            "success": True,
            "images": result.get("images", []),
            "metadata": {
                "model": model,
                "prompt": prompt,
                "seed": result.get("seed"),
                "has_nsfw_content": result.get("has_nsfw_content", False)
            }
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "message": "Failed to generate image"
        }

def generate_from_product(product_data, style="modern product photography"):
    """
    Generate product images based on scraped product data
    
    Args:
        product_data (dict): Product information from scraper
        style (str): Style of image generation
    
    Returns:
        dict: Generated image response
    """
    # Extract product info
    product = product_data.get("products", [{}])[0] if product_data.get("products") else {}
    title = product.get("title", "Product")
    description = product.get("description", "")
    material = product.get("material", "")
    color = product.get("color", "")
    
    # Build prompt from product data
    prompt_parts = [title]
    
    if description:
        prompt_parts.append(description[:100])  # Limit description length
    
    if color:
        prompt_parts.append(f"in {color}")
        
    if material:
        prompt_parts.append(f"made of {material}")
    
    prompt_parts.append(style)
    prompt_parts.append("high quality, professional lighting, 8k resolution")
    
    full_prompt = ", ".join(prompt_parts)
    
    # Get existing product images for reference
    image_urls = product.get("images", [])[:3]  # Use first 3 images as reference
    
    return generate_image(full_prompt, image_paths=image_urls)

# Test function
if __name__ == "__main__":
    # Test basic generation
    test_result = generate_image("A modern minimalist sofa in a bright living room")
    print(json.dumps(test_result, indent=2))