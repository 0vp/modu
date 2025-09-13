# Modu Furniture Viewer - Frontend

## Project Overview
A React-based furniture visualization and annotation application with a Figma-like interface that allows users to add furniture items via URL scraping, annotate images with drawings, and place interactive furniture pins on images.

## Tech Stack
- **Framework**: Vite + React (JavaScript)
- **Styling**: Tailwind CSS v3 + shadcn/ui components
- **Icons**: Lucide React
- **State Management**: React useState hooks + Context API
- **Theme**: Violet color scheme (#B854F6 / hsl(270 95% 65%)) with dark/light mode support

## Key Features

### 1. **Furniture Management**
- Add furniture via URL (integrates with backend scraper)
- Prevents duplicate entries (checks by URL)
- Shows newest items first (LIFO order)
- Search functionality across name, source, and description
- Draggable furniture items from sidebar to canvas

### 2. **Canvas Drawing Features**
- Toggle drawing mode with paintbrush button in toolbar
- Draw with semi-transparent purple strokes (#B854F6, 80% opacity)
- Brush size scales with canvas size
- Clear drawing functionality (separate from image clear)
- Drawings maintain position when sidebar toggles or window resizes
- Normalized coordinate system (0-1 range) for responsive scaling
- Drawing disabled when interacting with furniture pins

### 3. **Interactive Furniture Pins**
- Drag furniture items from sidebar onto canvas to create pins
- Moveable pins - drag to reposition anywhere on image
- Delete pins with X button that appears on hover
- Click pins to view full furniture details modal
- Pins have subtle white background (80% opacity) for visibility
- Tooltips show furniture name on hover
- Visual feedback during dragging (semi-transparent original, following indicator)
- Pins maintain relative position when layout changes

### 4. **UI Components**
- **Navbar**: Top navigation with "Temp View 3D" button and theme toggle
- **Sidebar**: Collapsible with furniture list, search, and add button
- **Canvas**: Central area for image upload and annotation
- **FloatingBar**: Bottom toolbar with paintbrush, options dropdown, and message input
- **Modals**: Add furniture URL modal and detailed furniture view modal

### 5. **Responsive Design**
- All annotations (drawings and pins) use normalized coordinates
- ResizeObserver handles sidebar toggle events
- Maintains aspect ratio of uploaded images
- Canvas automatically resizes and repositions

## Project Structure
```
/fe
├── src/
│   ├── components/
│   │   ├── Navbar.jsx           # Top navigation with theme toggle
│   │   ├── Sidebar.jsx          # Left sidebar with draggable furniture list
│   │   ├── Canvas.jsx           # Main area with drawing & pins support
│   │   ├── FloatingBar.jsx      # Bottom toolbar with paintbrush toggle
│   │   ├── AddFurnitureModal.jsx # Modal for adding furniture URLs
│   │   └── FurnitureDetailsModal.jsx # Detailed view of furniture
│   ├── contexts/
│   │   ├── ThemeContext.jsx     # Dark/light mode management
│   │   └── DrawingContext.jsx   # Drawing mode state management
│   ├── lib/
│   │   └── utils.js             # Utility functions (cn for classnames)
│   ├── App.jsx                  # Main app component with centralized state
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
- `POST /generate` - Generate images using FAL AI (new endpoint)

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
  "collage_path": "path_to_collage_image",
  "from_cache": true/false
}
```

## Canvas Interaction States
1. **Normal Mode**: Click to upload image, drag to pan
2. **Drawing Mode**: Paintbrush active, click and drag to draw
3. **Pin Interaction**: Drag pins to move, hover for tooltip, click for details
4. **Drag States**: Visual feedback for both furniture and pin dragging

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

## Important Implementation Details

### Coordinate System
- All drawings and pins use normalized coordinates (0-1 range)
- Coordinates are relative to the image, not the canvas
- This ensures annotations stay in place during resize events

### Drawing System
- Uses HTML5 Canvas API with 2D context
- Paths stored as arrays of normalized points
- Redraws entire canvas on each frame to maintain transparency
- Global alpha set to 0.8 for semi-transparent strokes

### Pin Management
- Pins stored with furniture data and normalized position
- White background with 80% opacity for contrast
- Z-index management ensures proper layering
- Event propagation stopped to prevent drawing conflicts

## Color Scheme (Violet Theme)
- Primary: Purple/Violet (`#B854F6` / `hsl(270 95% 65%)`)
- Background: White (light) / Dark gray (dark)
- Accent: Light gray variations
- Success: Green for availability badges
- Destructive: Red for delete actions
- Text: High contrast for accessibility

## Current Capabilities
✅ Add and search furniture from URLs
✅ Drag furniture to canvas as pins
✅ Move and delete pins
✅ Draw annotations on images
✅ View detailed furniture information
✅ Dark/light mode toggle
✅ Responsive layout with proper scaling
✅ Prevent drawing when interacting with pins
✅ Visual feedback for all interactions

## Known Limitations
- Furniture data is lost on page refresh (not persisted)
- No undo/redo for drawings
- No export functionality for annotated images
- Single brush size and color
- No grouping or layers for pins

## Future Enhancements
- Persist state to localStorage or backend
- Export annotated images with pins and drawings
- Multiple brush sizes and colors
- Undo/redo functionality
- Pin grouping and labeling
- Collaborative features
- Touch device support
- Mobile responsive design

## Testing
No tests implemented yet. Consider adding:
- Component tests with React Testing Library
- E2E tests with Playwright/Cypress
- Unit tests for coordinate normalization
- Integration tests for backend communication