# Furniture Product Scraper API

## Overview
Flask API that scrapes furniture product websites and uses Cerebras AI to extract structured product information.

## Setup

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Environment Variables
Create a `.env` file with:
```
CEREBRAS_API_KEY=your_api_key_here
```

### 3. Start the Server
```bash
python app.py
```

If port 5000 is in use:
```bash
python stop5000.py  # Kill processes on port 5000
python app.py
```

## API Endpoints

### Root Endpoint
```bash
GET /
```
Returns API status.

### Scrape Endpoint
```bash
GET /scrape?url=<website_url>
```

#### Features:
- **Automatic AI Analysis**: Always analyzes content with Cerebras AI
- **Caching**: Stores results in `db.json` to avoid re-scraping
- **Full Page Scraping**: Gets entire page content (not filtered)
- **Image Extraction**: Captures all product images with context
- **Unicode Handling**: Automatically converts Unicode to ASCII

#### Response Format:
```json
{
  "url": "https://example.com",
  "status_code": 200,
  "title": "Page Title",
  "products": [
    {
      "title": "Product Name",
      "description": "Detailed product description",
      "price": "$999.00",
      "dimensions": "Width: 241cm, Height: 85cm, Depth: 98cm",
      "images": ["image1.jpg", "image2.jpg"],
      "material": "Polyester, Wood, Steel",
      "color": "Beige, Gray, Black",
      "sku": "393.190.59",
      "availability": "In stock",
      "features": "10-year warranty, Machine washable"
    }
  ],
  "timestamp": "2025-09-13T11:03:07.770570",
  "from_cache": false
}
```

## Example Usage

### Basic Scraping
```bash
curl "http://localhost:5000/scrape?url=https://www.ikea.com/ca/en/p/finnala-sofa-gunnared-beige-s39319059/"
```

### With Python
```python
import requests

response = requests.get('http://localhost:5000/scrape', 
                        params={'url': 'https://furniture-site.com/product'})
data = response.json()
print(data['products'])
```

## Cache Management
- Cache stored in `db.json`
- Each URL is hashed (MD5) as a unique key
- Cached responses include `"from_cache": true`
- To clear cache: `rm db.json`

## Files Structure
```
be/
├── app.py              # Main Flask application
├── requirements.txt    # Python dependencies
├── stop5000.py        # Port 5000 cleanup script
├── .env               # Environment variables (API keys)
├── db.json            # Cache storage
└── CLAUDE.md          # This documentation
```

## Dependencies
- Flask 3.0.0
- requests 2.31.0
- beautifulsoup4 4.12.3
- cerebras-cloud-sdk
- python-dotenv
- pydantic<2.0 (for Cerebras compatibility)

## Technical Details

### Scraping Process
1. Check cache for existing results
2. Fetch page with browser-like headers
3. Parse HTML with BeautifulSoup
4. Extract all text content (removing only scripts/styles)
5. Extract all images with surrounding context
6. Send to Cerebras AI for analysis
7. Clean Unicode characters
8. Cache and return results

### AI Model
- Uses Cerebras `gpt-oss-120b` model
- Analyzes up to 10,000 characters of content
- Processes up to 30 product images
- Extracts: title, description, price, dimensions, materials, colors, SKU, availability, features

### Headers Used
Mimics Microsoft Edge browser to avoid blocking:
```python
'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0'
```

## Troubleshooting

### Port Already in Use
```bash
python stop5000.py
python app.py
```

### Pydantic Compatibility Error
```bash
pip install 'pydantic<2.0'
```

### Clear Cache
```bash
rm db.json
```

### Check Logs
Background processes can be monitored if running with:
```bash
python app.py &
# Check output with process ID
```