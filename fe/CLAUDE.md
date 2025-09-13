# Modu Furniture Viewer - Frontend

## Project Overview
A React-based furniture visualization application with a Figma-like interface that allows users to add furniture items via URL scraping and view them in detail.

## Tech Stack
- **Framework**: Vite + React (JavaScript)
- **Styling**: Tailwind CSS v3 + shadcn/ui components
- **Icons**: Lucide React
- **State Management**: React useState hooks
- **Theme**: Violet color scheme with dark/light mode support

## Key Features
1. **Furniture Management**
   - Add furniture via URL (integrates with backend scraper)
   - Prevents duplicate entries (checks by URL)
   - Shows newest items first
   - Search functionality for furniture items

2. **UI Components**
   - Collapsible sidebar with furniture list
   - Drag & drop image upload area in main canvas
   - Floating utility toolbar at bottom
   - Dark/light mode toggle

3. **Furniture Details Modal**
   - Image gallery with thumbnails
   - Product specifications (price, dimensions, materials, etc.)
   - Scrollable content area
   - "View Original" link to source

## Project Structure
```
/fe
├── src/
│   ├── components/
│   │   ├── Navbar.jsx           # Top navigation with theme toggle
│   │   ├── Sidebar.jsx          # Left sidebar with furniture list
│   │   ├── Canvas.jsx           # Main drag & drop area
│   │   ├── FloatingBar.jsx      # Bottom utility toolbar
│   │   ├── AddFurnitureModal.jsx # Modal for adding furniture URLs
│   │   └── FurnitureDetailsModal.jsx # Detailed view of furniture
│   ├── contexts/
│   │   └── ThemeContext.jsx     # Dark/light mode management
│   ├── lib/
│   │   └── utils.js             # Utility functions (cn for classnames)
│   ├── App.jsx                  # Main app component
│   ├── main.jsx                 # App entry point
│   └── index.css                # Global styles & theme variables
├── tailwind.config.js           # Tailwind configuration
├── postcss.config.js            # PostCSS configuration
└── vite.config.js               # Vite configuration
```

## Backend Integration
The frontend communicates with a Flask backend running on `http://localhost:5000`

### Key Endpoints:
- `GET /scrape?url={furniture_url}` - Scrapes furniture data from provided URL

### Response Format:
```json
{
  "products": [{
    "title": "Product name",
    "price": "$XXX.XX",
    "description": "...",
    "dimensions": "Width x Height x Depth",
    "images": ["url1", "url2", "url3"],
    "material": "Materials used",
    "color": "Available colors",
    "sku": "Product SKU",
    "availability": "In stock/Out of stock",
    "features": "Special features"
  }],
  "url": "original_url",
  "collage_path": "path_to_collage_image"
}
```

## Development Commands
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Important Notes
1. **CORS**: Backend must have CORS enabled (flask-cors) to allow frontend requests
2. **Port**: Frontend runs on port 5173, backend on port 5000
3. **Theme**: Uses HSL color values with CSS variables for easy theming
4. **Responsive**: Designed for desktop use with collapsible sidebar
5. **State**: All furniture data is stored in React state (not persisted)

## Color Scheme (Violet Theme)
- Primary: Purple/Violet (`hsl(270 95% 65%)`)
- Background: White (light) / Dark gray (dark)
- Accent: Light gray variations
- Success: Green for availability badges
- Text: High contrast for accessibility

## Future Enhancements
- Persist furniture list to localStorage or backend
- Add ability to delete furniture items
- Implement drag & drop to reorder furniture
- Add categories/tags for furniture organization
- Export furniture list functionality
- 3D model viewing support
- Multi-image drag & drop in canvas

## Known Issues
- Furniture data is lost on page refresh (not persisted)
- No error boundary for component failures
- No loading states for slow network requests

## Testing
No tests implemented yet. Consider adding:
- Component tests with React Testing Library
- E2E tests with Playwright/Cypress
- Unit tests for utility functions