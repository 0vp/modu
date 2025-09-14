#!/usr/bin/env python3
"""
Script to scrape multiple furniture URLs
"""

import requests
import json
import time

# List of URLs to scrape
urls = [
    "https://www.ikea.com/ca/en/p/onsevig-rug-low-pile-multicolor-60497078/",
    "https://www.ikea.com/ca/en/p/finnala-sofa-gunnared-beige-s39319059/#content",
    "https://www.ikea.com/ca/en/p/jaettebo-chaise-longue-modules-samsala-dark-yellow-green-s49511288/",
    "https://www.leons.ca/products/fog-3-piece-queen-bed-package-white-black",
    "https://www.ikea.com/ca/en/p/blodflaeder-picture-nazare-80601917/"
]

# API endpoint
API_URL = "http://localhost:5000/scrape"

print("Starting batch scraping...\n")
print("=" * 60)

results = []
successful = 0
failed = 0

for i, url in enumerate(urls, 1):
    print(f"\n[{i}/{len(urls)}] Scraping: {url}")
    print("-" * 40)
    
    try:
        # Make the request
        response = requests.get(API_URL, params={"url": url}, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            
            # Check if products were found
            if data.get("products") and len(data["products"]) > 0:
                product = data["products"][0]
                color_id = product.get("id", "N/A")
                title = product.get("title", "Unknown")
                price = product.get("price", "N/A")
                
                print(f"✅ SUCCESS")
                print(f"   Color ID: #{color_id.upper()}")
                print(f"   Title: {title}")
                print(f"   Price: {price}")
                print(f"   Collage: {data.get('collage_path', 'N/A')}")
                
                results.append({
                    "url": url,
                    "success": True,
                    "color_id": color_id,
                    "title": title,
                    "price": price
                })
                successful += 1
            else:
                print(f"⚠️  No products found")
                results.append({
                    "url": url,
                    "success": False,
                    "reason": "No products found"
                })
                failed += 1
        else:
            print(f"❌ FAILED - Status code: {response.status_code}")
            results.append({
                "url": url,
                "success": False,
                "reason": f"HTTP {response.status_code}"
            })
            failed += 1
            
    except requests.exceptions.Timeout:
        print(f"❌ FAILED - Request timeout")
        results.append({
            "url": url,
            "success": False,
            "reason": "Timeout"
        })
        failed += 1
    except Exception as e:
        print(f"❌ FAILED - Error: {str(e)}")
        results.append({
            "url": url,
            "success": False,
            "reason": str(e)
        })
        failed += 1
    
    # Small delay between requests to be nice to the server
    if i < len(urls):
        time.sleep(1)

# Print summary
print("\n" + "=" * 60)
print("SCRAPING COMPLETE")
print("=" * 60)
print(f"Total URLs: {len(urls)}")
print(f"Successful: {successful}")
print(f"Failed: {failed}")

print("\n" + "=" * 60)
print("SUMMARY OF SCRAPED PRODUCTS")
print("=" * 60)

for result in results:
    if result["success"]:
        print(f"\n✅ {result['url']}")
        print(f"   Color ID: #{result['color_id'].upper()}")
        print(f"   Title: {result['title']}")
        print(f"   Price: {result['price']}")
    else:
        print(f"\n❌ {result['url']}")
        print(f"   Reason: {result['reason']}")

