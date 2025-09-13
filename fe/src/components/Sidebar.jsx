import { useState, useEffect } from 'react'
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Sofa,
  Package
} from 'lucide-react'
import { cn } from '../lib/utils'
import { AddFurnitureModal } from './AddFurnitureModal'

export function Sidebar({ onFurnitureClick }) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [furnitureItems, setFurnitureItems] = useState([])
  
  // Load cached items on mount
  useEffect(() => {
    const loadCachedItems = async () => {
      try {
        const response = await fetch('http://localhost:5000/cache')
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.cache) {
            // Convert cache object to array of furniture items
            const items = []
            for (const [hash, cacheItem] of Object.entries(data.cache)) {
              if (cacheItem.products && cacheItem.products.length > 0) {
                // Process each product from the cache
                cacheItem.products.forEach((product, index) => {
                  const previewImage = product.images && product.images.length > 0
                    ? product.images[0]
                    : null
                  
                  items.push({
                    id: product.id || `${hash}_${index}`,
                    url: cacheItem.url,
                    title: product.title || 'Furniture Item',
                    name: product.title || 'Furniture Item',
                    price: product.price,
                    description: product.description,
                    dimensions: product.dimensions,
                    material: product.material,
                    color: product.color,
                    sku: product.sku,
                    availability: product.availability,
                    features: product.features,
                    previewImage,
                    images: product.images || [],
                    collage_path: cacheItem.collage_path,
                    source: new URL(cacheItem.url).hostname.replace('www.', ''),
                    timestamp: cacheItem.timestamp
                  })
                })
              }
            }
            
            // Sort by timestamp (newest first) and set items
            items.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''))
            setFurnitureItems(items)
            console.log(`Loaded ${items.length} cached furniture items`)
          }
        }
      } catch (error) {
        console.error('Failed to load cached items:', error)
      }
    }
    
    loadCachedItems()
  }, [])

  const handleAddFurniture = (scrapedData) => {
    // Handle the nested products structure from backend
    if (scrapedData.products && scrapedData.products.length > 0) {
      // Process each product from the scraped data
      const newItems = []
      scrapedData.products.forEach((product) => {
        // Check if this product ID already exists
        const existingItem = furnitureItems.find(item => item.id === product.id)
        if (existingItem) {
          console.log('Product already exists with ID:', product.id)
          return
        }
        
        // Extract the first image from the product
        const previewImage = product.images && product.images.length > 0
          ? product.images[0]
          : null
        
        const newItem = {
          id: product.id || Date.now(),  // Use product ID from backend
          url: scrapedData.url,
          title: product.title || 'Furniture Item',
          name: product.title || 'Furniture Item',
          price: product.price,
          description: product.description,
          dimensions: product.dimensions,
          material: product.material,
          color: product.color,
          sku: product.sku,
          availability: product.availability,
          features: product.features,
          previewImage,
          images: product.images || [],
          collage_path: scrapedData.collage_path,
          source: new URL(scrapedData.url).hostname.replace('www.', ''),
          timestamp: scrapedData.timestamp
        }
        
        newItems.push(newItem)
      })
      
      if (newItems.length > 0) {
        // Add new items at the beginning (newest first)
        setFurnitureItems([...newItems, ...furnitureItems])
      }
    }
  }

  const filteredItems = furnitureItems.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <>
      <aside
        className={cn(
          "h-full bg-card border-r border-border transition-all duration-300 flex flex-col",
          isCollapsed ? "w-16" : "w-80"
        )}
      >
        <div className="p-3 border-b border-border">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex-shrink-0 w-10 h-10 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg flex items-center justify-center transition-colors"
              title="Add furniture"
            >
              <Plus className="w-5 h-5" />
            </button>

            {!isCollapsed && (
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search furniture..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-secondary/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {!isCollapsed && (
            <div className="space-y-2">
              {filteredItems.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No furniture added yet
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Click + to add furniture
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Furniture ({filteredItems.length})
                  </p>
                  {filteredItems.map((item) => (
                    <button
                      key={item.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('furniture', JSON.stringify(item))
                        e.dataTransfer.effectAllowed = 'copy'
                      }}
                      onClick={() => onFurnitureClick(item)}
                      className="w-full flex gap-3 p-2 hover:bg-accent rounded-lg transition-colors group text-left cursor-move"
                    >
                      {item.previewImage ? (
                        <img
                          src={item.previewImage}
                          alt={item.name}
                          className="w-12 h-12 object-cover rounded-md flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-secondary/50 rounded-md flex items-center justify-center flex-shrink-0">
                          <Sofa className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {item.name}
                        </p>
                        {item.price && (
                          <p className="text-xs text-primary font-semibold">
                            {item.price}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground truncate">
                          {item.source}
                        </p>
                      </div>
                    </button>
                  ))}
                </>
              )}
            </div>
          )}

          {isCollapsed && furnitureItems.length > 0 && (
            <div className="space-y-2">
              {furnitureItems.slice(0, 8).map((item) => (
                <button
                  key={item.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('furniture', JSON.stringify(item))
                    e.dataTransfer.effectAllowed = 'copy'
                  }}
                  onClick={() => onFurnitureClick(item)}
                  className="block w-full hover:bg-accent rounded-lg transition-colors p-1 cursor-move"
                  title={item.name}
                >
                  {item.previewImage ? (
                    <img
                      src={item.previewImage}
                      alt={item.name}
                      className="w-full aspect-square object-cover rounded-md"
                    />
                  ) : (
                    <div className="w-full aspect-square bg-secondary/50 rounded-md flex items-center justify-center">
                      <Sofa className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="p-3 border-t border-border">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-full flex items-center justify-center p-2 text-muted-foreground hover:bg-accent rounded-lg transition-colors"
          >
            {isCollapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <ChevronLeft className="w-5 h-5" />
            )}
          </button>
        </div>
      </aside>

      <AddFurnitureModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAddFurniture}
      />
    </>
  )
}