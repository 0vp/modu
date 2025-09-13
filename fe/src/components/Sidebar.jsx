import { useState } from 'react'
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Sofa,
  ExternalLink,
  Armchair,
  Lamp
} from 'lucide-react'
import { cn } from '../lib/utils'
import { AddFurnitureModal } from './AddFurnitureModal'

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [furnitureItems, setFurnitureItems] = useState([])

  const handleAddFurniture = (url) => {
    try {
      const urlObj = new URL(url)
      const hostname = urlObj.hostname.replace('www.', '')
      const pathname = urlObj.pathname

      // Extract a name from the URL path or use hostname
      let itemName = 'Furniture Item'
      if (pathname && pathname !== '/') {
        const parts = pathname.split('/').filter(p => p)
        itemName = parts[parts.length - 1]
          .replace(/-/g, ' ')
          .replace(/_/g, ' ')
          .replace(/\.\w+$/, '') // Remove file extension if any
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')
      } else {
        itemName = hostname.charAt(0).toUpperCase() + hostname.slice(1)
      }

      setFurnitureItems([...furnitureItems, {
        id: Date.now(),
        url,
        name: itemName,
        source: hostname
      }])
    } catch {
      // If URL parsing fails, use a fallback
      setFurnitureItems([...furnitureItems, {
        id: Date.now(),
        url,
        name: 'Furniture Item',
        source: 'External'
      }])
    }
  }

  const filteredItems = furnitureItems.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.source.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Rotate through different furniture icons
  const getFurnitureIcon = (index) => {
    const icons = [Sofa, Armchair, Lamp]
    const Icon = icons[index % icons.length]
    return <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
  }

  return (
    <>
      <aside
        className={cn(
          "h-full bg-card border-r border-border transition-all duration-300 flex flex-col",
          isCollapsed ? "w-16" : "w-64"
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
                  <Sofa className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
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
                  {filteredItems.map((item, index) => (
                    <a
                      key={item.id}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 hover:bg-accent rounded-lg transition-colors group"
                    >
                      {getFurnitureIcon(index)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground truncate">
                          {item.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {item.source}
                        </p>
                      </div>
                      <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    </a>
                  ))}
                </>
              )}
            </div>
          )}

          {isCollapsed && furnitureItems.length > 0 && (
            <div className="space-y-1">
              {furnitureItems.slice(0, 8).map((item, index) => (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center p-2 hover:bg-accent rounded-lg transition-colors"
                  title={item.name}
                >
                  {getFurnitureIcon(index)}
                </a>
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