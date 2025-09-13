from flask import Flask, jsonify, request
import requests
from bs4 import BeautifulSoup
import os
import json
from dotenv import load_dotenv
from cerebras.cloud.sdk import Cerebras

load_dotenv()

app = Flask(__name__)

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
        
        # Remove common non-content elements
        for element in soup(['script', 'style', 'footer', 'nav', 'header', 'aside', 'form', 'noscript']):
            element.decompose()
        
        # Remove elements with common footer/header class names
        for element in soup.find_all(class_=['footer', 'header', 'navigation', 'navbar', 'sidebar', 
                                              'menu', 'cookie', 'consent', 'banner', 'advertisement',
                                              'ads', 'social', 'share', 'subscribe', 'newsletter']):
            element.decompose()
        
        # Remove elements with common footer/header IDs
        for element in soup.find_all(id=['footer', 'header', 'navigation', 'navbar', 'sidebar',
                                         'menu', 'cookie-banner', 'consent-banner']):
            element.decompose()
        
        # Focus on main content areas
        main_content = soup.find(['main', 'article']) or soup.find(class_=['content', 'main-content', 'post', 'entry']) or soup.body
        
        if main_content:
            text_content = main_content.get_text(separator=' ', strip=True)
        else:
            text_content = soup.get_text(separator=' ', strip=True)
        
        # Extract product images with context
        images_with_context = []
        for img in soup.find_all('img'):
            img_data = {
                'src': img.get('src', ''),
                'alt': img.get('alt', ''),
                'title': img.get('title', ''),
                'context': ''
            }
            
            # Get context from parent elements
            parent = img.parent
            for _ in range(3):  # Look up to 3 levels up
                if parent:
                    # Check for product-related classes
                    if parent.get('class'):
                        classes = ' '.join(parent.get('class', []))
                        if 'product' in classes.lower() or 'item' in classes.lower():
                            img_data['context'] = parent.get_text(strip=True)[:200]
                            break
                    parent = parent.parent if parent else None
            
            # Filter for product images (skip icons, logos, etc)
            if img_data['src'] and any(keyword in img_data['src'].lower() for keyword in ['product', 'item', 'furniture', 'jpg', 'jpeg', 'png']):
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
            return jsonify({
                "url": url,
                "status_code": response.status_code,
                "title": title,
                "products": products
            })
        except Exception as e:
            return jsonify({
                "url": url,
                "status_code": response.status_code,
                "title": title,
                "error": str(e),
                "products": []
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
    
    # Prepare the context for the AI
    context = f"""
    Page Title: {scraped_data.get('title', '')}
    
    Page Content (first 3000 chars):
    {scraped_data.get('content', '')[:3000]}
    
    Product Images Found ({len(scraped_data.get('product_images', []))} total):
    """
    
    for img in scraped_data.get('product_images', [])[:10]:
        context += f"\n- Image: {img['src']}"
        if img['alt']:
            context += f"\n  Alt text: {img['alt']}"
        if img['context']:
            context += f"\n  Context: {img['context'][:100]}"
    
    system_prompt = """You are a furniture product data extractor. Analyze the provided webpage content and images to extract structured product information.
    
    Return a JSON object with the following structure:
    {
        "products": [
            {
                "title": "Product name",
                "description": "One sentence description",
                "price": "Price as shown or 'Price not available'",
                "dimensions": "Dimensions if available or 'Not specified'",
                "images": ["image_url1", "image_url2"],
                "material": "Material if mentioned",
                "color": "Color options if available"
            }
        ]
    }
    
    Focus on furniture products only. Extract as many products as you can identify from the content."""
    
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
            return parsed.get('products', [])
    except json.JSONDecodeError:
        return []
    
    return []


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)