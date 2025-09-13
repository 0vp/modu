import { useState } from 'react'
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

  const handleAddFurniture = (scrapedData) => {
    // Check if URL already exists
    const existingItem = furnitureItems.find(item => item.url === scrapedData.url)
    if (existingItem) {
      // If item already exists, don't add duplicate
      console.log('Item already exists:', scrapedData.url)
      return
    }

    // Handle the nested products structure from backend
    let productData = scrapedData

    // If the response has a products array, use the first product
    if (scrapedData.products && scrapedData.products.length > 0) {
      productData = {
        ...scrapedData.products[0],
        url: scrapedData.url,
        collage_path: scrapedData.collage_path
      }
    }

    // Extract the first image from the scraped data
    const previewImage = productData.images && productData.images.length > 0
      ? productData.images[0]
      : null

    const newItem = {
      id: productData.id || Date.now(),  // Use product ID from backend if available
      url: productData.url || scrapedData.url,
      title: productData.title || productData.name || 'Furniture Item',
      name: productData.title || productData.name || 'Furniture Item',
      price: productData.price,
      description: productData.description,
      dimensions: productData.dimensions,
      material: productData.material,
      color: productData.color,
      sku: productData.sku,
      availability: productData.availability,
      features: productData.features,
      previewImage,
      images: productData.images || [],
      collage_path: productData.collage_path,
      source: new URL(productData.url || scrapedData.url).hostname.replace('www.', '')
    }

    // Add new item at the beginning (newest first)
    setFurnitureItems([newItem, ...furnitureItems])
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