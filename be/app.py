from flask import Flask, jsonify, request
from flask_cors import CORS
import requests
from bs4 import BeautifulSoup
import os
import json
from dotenv import load_dotenv
from cerebras.cloud.sdk import Cerebras
import hashlib
from datetime import datetime
import unicodedata
from PIL import Image, ImageDraw, ImageFont
from io import BytesIO
import math
import threading
import time
from fal import generate_image, generate_from_product
import base64
import uuid

load_dotenv()

app = Flask(__name__)
# Enable CORS for all routes and origins
CORS(app, resources={r"/*": {"origins": "*"}})

DATA_FOLDER = 'product_data'
CACHE_FILE = os.path.join(DATA_FOLDER, 'db.json')

# Create data folder if it doesn't exist
if not os.path.exists(DATA_FOLDER):
    os.makedirs(DATA_FOLDER)

def load_cache():
    """Load cache from db.json file"""
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, 'r') as f:
                return json.load(f)
        except:
            return {}
    return {}

def save_cache(cache):
    """Save cache to db.json file"""
    with open(CACHE_FILE, 'w') as f:
        json.dump(cache, f, indent=2)

def get_url_hash(url):
    """Generate a hash for the URL to use as cache key"""
    return hashlib.md5(url.encode()).hexdigest()

def create_product_collage_sync(products, url_hash):
    """Create a 1080p collage of product images with title (synchronous version)"""
    if not products or not products[0].get('images'):
        return None
    
    product = products[0]  # Use first product
    image_urls = product.get('images', [])[:9]  # Max 9 images for 3x3 grid
    
    if not image_urls:
        return None
    
    try:
        # Create 1920x1080 canvas
        collage = Image.new('RGB', (1920, 1080), color='white')
        draw = ImageDraw.Draw(collage)
        
        # Add product ID at the top (instead of long title)
        product_id = product.get('id', 'Unknown')
        title = product.get('title', 'Product')
        # Show ID prominently with title as subtitle
        display_text = f"ID: {product_id} - {title[:60]}" if len(title) > 60 else f"ID: {product_id} - {title}"
        try:
            # Try to use a larger font, fallback to default if not available
            font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 48)
        except:
            font = ImageFont.load_default()

        # Draw ID and title with black background
        draw.rectangle([0, 0, 1920, 100], fill='black')
        draw.text((50, 25), display_text, fill='white', font=font)
        
        # Calculate grid layout
        num_images = len(image_urls)
        cols = math.ceil(math.sqrt(num_images))
        rows = math.ceil(num_images / cols)
        
        # Available space (leaving space for title)
        available_width = 1920
        available_height = 980  # 1080 - 100 for title
        
        img_width = available_width // cols
        img_height = available_height // rows
        
        # Download and place images
        for idx, img_url in enumerate(image_urls):
            try:
                # Download image
                response = requests.get(img_url, timeout=5)
                img = Image.open(BytesIO(response.content))
                
                # Calculate position
                row = idx // cols
                col = idx % cols
                x = col * img_width
                y = 100 + (row * img_height)  # 100px offset for title
                
                # Resize image to fit cell while maintaining aspect ratio
                img.thumbnail((img_width - 10, img_height - 10), Image.Resampling.LANCZOS)
                
                # Center image in cell
                img_x = x + (img_width - img.width) // 2
                img_y = y + (img_height - img.height) // 2
                
                # Paste image
                collage.paste(img, (img_x, img_y))
                
                # Draw border
                draw.rectangle([x, y, x + img_width, y + img_height], outline='gray', width=1)
                
            except Exception as e:
                print(f"Error loading image {img_url}: {e}")
                continue
        
        # Save collage
        image_filename = f"{url_hash}.jpg"
        image_path = os.path.join(DATA_FOLDER, image_filename)
        collage.save(image_path, 'JPEG', quality=95)
        
        # Update cache with collage path
        cache = load_cache()
        if url_hash in cache:
            cache[url_hash]['collage_path'] = os.path.abspath(image_path)
            save_cache(cache)
        
        print(f"Collage created successfully: {image_path}")
        return os.path.abspath(image_path)
    
    except Exception as e:
        print(f"Error creating collage: {e}")
        return None

def create_product_collage_async(products, url_hash):
    """Create product collage asynchronously in background thread"""
    thread = threading.Thread(target=create_product_collage_sync, args=(products, url_hash))
    thread.daemon = True  # Daemon thread will not prevent app from shutting down
    thread.start()
    print(f"Started async collage generation for {url_hash}")

@app.route('/')
def root():
    return jsonify({
        "message": "Welcome to the Flask API",
        "status": "active"
    })

@app.route('/scrape', methods=['GET'])
def scrape():
    url = request.args.get('url')
    if not url:
        return jsonify({
            "error": "URL parameter is required"
        }), 400

    # Check cache first
    cache = load_cache()
    url_hash = get_url_hash(url)
    
    if url_hash in cache:
        cached_data = cache[url_hash]
        cached_data['from_cache'] = True
        # Check if collage exists, create async if not
        if 'collage_path' not in cached_data and cached_data.get('products'):
            # Generate expected path
            expected_path = os.path.abspath(os.path.join(DATA_FOLDER, f"{url_hash}.jpg"))
            if os.path.exists(expected_path):
                # Collage exists, add path
                cached_data['collage_path'] = expected_path
                cache[url_hash]['collage_path'] = expected_path
                save_cache(cache)
            else:
                # Start async generation
                create_product_collage_async(cached_data.get('products', []), url_hash)
                cached_data['collage_generating'] = True
        return jsonify(cached_data)
    
    headers = {
        'accept-encoding': 'gzip, deflate, zstd',
        'accept-language': 'en-US,en;q=0.9,en-GB;q=0.8',
        'cache-control': 'max-age=0',
        'priority': 'u=0, i',
        'sec-ch-ua': '"Not;A=Brand";v="99", "Microsoft Edge";v="139", "Chromium";v="139"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
        'sec-fetch-dest': 'document',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-site': 'none',
        'sec-fetch-user': '?1',
        'upgrade-insecure-requests': '1',
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0'
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        title = soup.find('title').text if soup.find('title') else 'No title found'
        
        # Remove only scripts and styles, keep all other content
        for element in soup(['script', 'style', 'noscript']):
            element.decompose()
        
        # Get ALL text content from the entire page
        text_content = soup.get_text(separator=' ', strip=True)
        
        # Extract ALL images from the page
        images_with_context = []
        for img in soup.find_all('img'):
            img_src = img.get('src', '')
            # Skip very small images (likely icons)
            if img_src and not any(skip in img_src.lower() for skip in ['icon', 'logo', 'svg', 'data:image']):
                img_data = {
                    'src': img_src,
                    'alt': img.get('alt', ''),
                    'title': img.get('title', ''),
                    'context': ''
                }
                
                # Get surrounding text context
                parent = img.parent
                if parent:
                    img_data['context'] = parent.get_text(strip=True)[:300]
                
                images_with_context.append(img_data)
        
        scraped_data = {
            "url": url,
            "status_code": response.status_code,
            "title": title,
            "content": text_content,
            "content_length": len(text_content),
            "product_images": images_with_context[:50]
        }
        
        # Always analyze with Cerebras AI
        try:
            products = analyze_products(scraped_data, url)
            
            # Get URL hash
            url_hash = get_url_hash(url)
            
            result = {
                "url": url,
                "status_code": response.status_code,
                "title": title,
                "products": products,
                "timestamp": datetime.now().isoformat()
            }
            
            # Generate expected collage path
            expected_collage_path = os.path.abspath(os.path.join(DATA_FOLDER, f"{url_hash}.jpg"))
            result['collage_path'] = expected_collage_path
            result['collage_generating'] = True
            
            # Save to cache first
            cache = load_cache()
            cache[url_hash] = result.copy()
            save_cache(cache)
            
            # Start async collage generation AFTER returning response
            create_product_collage_async(products, url_hash)
            
            result['from_cache'] = False
            return jsonify(result)
        except Exception as e:
            return jsonify({
                "url": url,
                "status_code": response.status_code,
                "title": title,
                "error": str(e),
                "products": [],
                "from_cache": False
            })
        
    except requests.exceptions.RequestException as e:
        return jsonify({
            "error": f"Failed to fetch URL: {str(e)}",
            "url": url
        }), 500
    except Exception as e:
        return jsonify({
            "error": f"Error processing content: {str(e)}",
            "url": url
        }), 500

def analyze_products(scraped_data, url):
    """
    Analyzes scraped content and images to extract furniture product information
    """
    client = Cerebras(
        api_key=os.environ.get("CEREBRAS_API_KEY")
    )
    
    # Prepare the context for the AI - include MORE content
    context = f"""
    Page Title: {scraped_data.get('title', '')}
    
    Full Page Content (first 10000 chars):
    {scraped_data.get('content', '')[:]}
    
    Product Images Found ({len(scraped_data.get('product_images', []))} total):
    """
    
    # Include more images for better analysis
    for img in scraped_data.get('product_images', [])[:30]:
        context += f"\n- Image: {img['src']}"
        if img['alt']:
            context += f"\n  Alt text: {img['alt']}"
        if img['context']:
            context += f"\n  Context: {img['context'][:200]}"
    
    system_prompt = """You are a furniture product data extractor. Analyze the ENTIRE webpage content and ALL images to extract complete product information. Ensure that all image URLs are related to the product, and are not of other product images or logos on the page. Remove all parameters from the image URLs (such as ?f=u).
    
    IMPORTANT: Extract ALL available details including prices, dimensions, materials, colors, SKUs, and any other specifications mentioned ANYWHERE on the page.
    
    Return a JSON object with the following structure:
    {
        "products": [
            {
                "title": "Product name",
                "description": "Detailed description combining all available information",
                "price": "Extract the exact price shown (look for $, CAD, regular price, sale price)",
                "dimensions": "Extract ALL dimensions (width, height, depth, etc.)",
                "images": ["image_url1", "image_url2", "image_url3"],
                "material": "All materials mentioned",
                "color": "All color options available",
                "sku": "Product SKU or item number if available",
                "availability": "In stock/out of stock if mentioned",
                "features": "Any special features or specifications"
            }
        ]
    }
    
    Look through the ENTIRE content for product details - they may be scattered throughout the page."""
    
    completion = client.chat.completions.create(
        messages=[
            {
                "role": "system",
                "content": system_prompt
            },
            {
                "role": "user",
                "content": context
            }
        ],
        model="gpt-oss-120b",
        stream=False,
        max_completion_tokens=20000,
        temperature=0.7,
        top_p=0.8
    )
    
    response = completion.choices[0].message.content
    
    # Try to parse the JSON response
    try:
        json_start = response.find('{')
        json_end = response.rfind('}') + 1
        if json_start != -1 and json_end > json_start:
            json_str = response[json_start:json_end]
            parsed = json.loads(json_str)
            products = parsed.get('products', [])

            # Clean up Unicode characters and add unique IDs
            for i, product in enumerate(products):
                # Generate a short unique ID for each product
                # Use first 8 chars of MD5 hash of URL + product title + index
                product_unique = f"{url}_{product.get('title', '')}_{i}"
                product_id = hashlib.md5(product_unique.encode()).hexdigest()[:8]
                product['id'] = product_id  # e.g., "a3b7c9d1"

                # Clean up Unicode characters in all product fields
                for key, value in product.items():
                    if isinstance(value, str) and key != 'id':  # Don't modify the ID
                        # Normalize Unicode to ASCII equivalent
                        value = unicodedata.normalize('NFKD', value)
                        # Replace any remaining non-ASCII characters
                        value = value.encode('ascii', 'ignore').decode('ascii')
                        product[key] = value

            return products
    except json.JSONDecodeError:
        return []
    
    return []

@app.route('/save_canvas', methods=['POST'])
def save_canvas():
    """
    Save canvas images (original and annotated) to product_data folder

    Expected JSON body:
    {
        "original_image": "data:image/...",  # Base64 encoded original image
        "annotated_image": "data:image/...",  # Base64 encoded annotated image
    }
    """
    try:
        data = request.json

        if not data.get('original_image') or not data.get('annotated_image'):
            return jsonify({
                "success": False,
                "error": "Both original_image and annotated_image are required"
            }), 400

        # Generate unique timestamp-based filename
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        unique_id = str(uuid.uuid4())[:8]

        # Decode and save original image
        original_data = data['original_image'].split(',')[1]  # Remove data:image/png;base64, prefix
        original_bytes = base64.b64decode(original_data)
        original_filename = f"original_{timestamp}_{unique_id}.png"
        original_path = os.path.join(DATA_FOLDER, original_filename)

        with open(original_path, 'wb') as f:
            f.write(original_bytes)

        # Decode and save annotated image
        annotated_data = data['annotated_image'].split(',')[1]
        annotated_bytes = base64.b64decode(annotated_data)
        annotated_filename = f"annotated_{timestamp}_{unique_id}.png"
        annotated_path = os.path.join(DATA_FOLDER, annotated_filename)

        with open(annotated_path, 'wb') as f:
            f.write(annotated_bytes)

        print(f"[{datetime.now().isoformat()}] Canvas images saved")
        print(f"  Original: {original_filename}")
        print(f"  Annotated: {annotated_filename}")

        return jsonify({
            "success": True,
            "original_path": os.path.abspath(original_path),
            "annotated_path": os.path.abspath(annotated_path),
            "filenames": {
                "original": original_filename,
                "annotated": annotated_filename
            },
            "timestamp": datetime.now().isoformat()
        })

    except Exception as e:
        print(f"[{datetime.now().isoformat()}] Error saving canvas: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e),
            "message": "Failed to save canvas images"
        }), 500

@app.route('/generate', methods=['POST'])
def generate():
    """
    Generate images using FAL AI with bytedance/seedream/v4/edit model
    
    Expected JSON body:
    {
        "prompt": "image generation/edit prompt",
        "images": ["/path/to/local/image.jpg", "https://url/to/image.jpg"],  # REQUIRED - local paths or URLs
        "num_images": 1,  # optional, default 1
        "guidance_scale": 3.5,  # optional, default 3.5
        "num_inference_steps": 28  # optional, default 28
    }
    
    Or for product-based generation:
    {
        "product_url": "https://furniture-site.com/product",
        "style": "modern product photography"  # optional
    }
    
    Note: The 'images' field is required and can contain:
    - Local file paths (e.g., "/Users/q/Desktop/image.jpg" or "./product_data/collage.jpg")
    - URLs (e.g., "https://example.com/image.jpg")
    - Mix of both
    """
    try:
        # Start timing
        start_time = time.time()
        
        data = request.json
        
        # Log the request
        print(f"[{datetime.now().isoformat()}] Generate request received")
        print(f"  Prompt: {data.get('prompt', '')}")
        print(f"  Images: {len(data.get('images', []))} provided")
        
        # Check if this is a product-based generation
        if 'product_url' in data:
            # Fetch product data from cache or scrape
            url = data['product_url']
            cache = load_cache()
            url_hash = get_url_hash(url)
            
            if url_hash in cache:
                product_data = cache[url_hash]
            else:
                # Need to scrape first
                return jsonify({
                    "success": False,
                    "error": "Product not found in cache. Please scrape the URL first using /scrape endpoint"
                }), 400
            
            # Generate from product
            style = data.get('style', 'modern product photography')
            
            # Time the FAL API call
            fal_start = time.time()
            result = generate_from_product(product_data, style)
            fal_duration = time.time() - fal_start
            
        else:
            # Direct prompt-based generation
            prompt = data.get('prompt')
            if not prompt:
                return jsonify({
                    "success": False,
                    "error": "Prompt is required"
                }), 400
            
            # Get image paths (support both 'images' and 'image_urls' for compatibility)
            images = data.get('images') or data.get('image_urls')
            if not images:
                return jsonify({
                    "success": False,
                    "error": "Images list is required for the edit model"
                }), 400
            
            # Always use the bytedance/seedream edit model
            kwargs = {
                'model': 'fal-ai/nano-banana/edit', # fal-ai/nano-banana/edit, fal-ai/bytedance/seedream/v4/edit
                'num_images': data.get('num_images', 1),
                'output_format': data.get('output_format', 'jpeg')
            }
            
            # Time the FAL API call
            fal_start = time.time()
            result = generate_image(prompt, images, **kwargs)
            fal_duration = time.time() - fal_start
        
        # Calculate total time
        total_duration = time.time() - start_time
        
        # Add timing information to result
        if result.get('success'):
            result['timing'] = {
                'fal_api_duration': round(fal_duration, 2),
                'total_duration': round(total_duration, 2),
                'overhead': round(total_duration - fal_duration, 2),
                'timestamp': datetime.now().isoformat()
            }
            
            # Log success
            print(f"[{datetime.now().isoformat()}] Generation successful")
            print(f"  FAL API: {result['timing']['fal_api_duration']}s")
            print(f"  Total: {result['timing']['total_duration']}s")
            if result.get('images'):
                print(f"  Generated {len(result['images'])} image(s)")
            
            return jsonify(result)
        else:
            result['timing'] = {
                'fal_api_duration': round(fal_duration, 2) if 'fal_duration' in locals() else None,
                'total_duration': round(total_duration, 2),
                'timestamp': datetime.now().isoformat()
            }
            
            # Log failure
            print(f"[{datetime.now().isoformat()}] Generation failed")
            print(f"  Error: {result.get('error', 'Unknown error')}")
            print(f"  Duration: {result['timing']['total_duration']}s")
            
            return jsonify(result), 500
            
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e),
            "message": "Failed to process generation request"
        }), 500


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)