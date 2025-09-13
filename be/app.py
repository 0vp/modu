from flask import Flask, jsonify, request
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

load_dotenv()

app = Flask(__name__)

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
        
        # Add title at the top
        title = product.get('title', 'Product')
        try:
            # Try to use a larger font, fallback to default if not available
            font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 48)
        except:
            font = ImageFont.load_default()
        
        # Draw title with black background
        draw.rectangle([0, 0, 1920, 100], fill='black')
        draw.text((50, 25), title[:80], fill='white', font=font)
        
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
            products = analyze_products(scraped_data)
            
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

def analyze_products(scraped_data):
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
            
            # Clean up Unicode characters in all product fields using unicodedata
            for product in products:
                for key, value in product.items():
                    if isinstance(value, str):
                        # Normalize Unicode to ASCII equivalent
                        value = unicodedata.normalize('NFKD', value)
                        # Replace any remaining non-ASCII characters
                        value = value.encode('ascii', 'ignore').decode('ascii')
                        product[key] = value
            
            return products
    except json.JSONDecodeError:
        return []
    
    return []


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)