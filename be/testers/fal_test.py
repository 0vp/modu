#!/usr/bin/env python3
"""
Quick test for FAL API with bytedance/seedream model
"""

import requests
import json

# Test with the images from your test file
test_data = {
    "prompt": "keep the exact same image dimensions as image 1, but make the walls red",
    "images": [
        "/Users/q/Desktop/projects/modu/sample/template.png"
    ],
    "num_images": 1
}

print("Testing FAL API with bytedance/seedream/v4/edit model...")
print(f"Prompt: {test_data['prompt']}")
print(f"Images: {len(test_data['images'])} local files")

try:
    response = requests.post(
        "http://localhost:5000/generate",
        json=test_data,
        headers={"Content-Type": "application/json"},
        timeout=30
    )
    
    print(f"\nStatus Code: {response.status_code}")
    result = response.json()
    
    if result.get("success"):
        print("✅ Success!")
        if result.get("images"):
            for img in result["images"]:
                print(f"Generated: {img.get('url', 'No URL')}")
    else:
        print("❌ Failed:")
        print(json.dumps(result, indent=2))
        
except Exception as e:
    print(f"Error: {e}")