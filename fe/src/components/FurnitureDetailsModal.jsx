import { useState } from 'react'
import {
  X,
  ExternalLink,
  Package,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  Ruler,
  Palette,
  Tag,
  CheckCircle,
  Info,
  Layers
} from 'lucide-react'

export function FurnitureDetailsModal({ isOpen, onClose, furniture }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  if (!isOpen || !furniture) return null

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const nextImage = () => {
    if (furniture.images && furniture.images.length > 1) {
      setCurrentImageIndex((prev) => (prev + 1) % furniture.images.length)
    }
  }

  const prevImage = () => {
    if (furniture.images && furniture.images.length > 1) {
      setCurrentImageIndex((prev) =>
        prev === 0 ? furniture.images.length - 1 : prev - 1
      )
    }
  }

  const hasMultipleImages = furniture.images && furniture.images.length > 1

  // Helper function to render detail items
  const DetailItem = ({ icon: Icon, label, value, className = "" }) => {
    if (!value || (Array.isArray(value) && value.length === 0)) return null

    return (
      <div className={`flex gap-3 ${className}`}>
        <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
          <p className="text-sm text-foreground">
            {Array.isArray(value) ? value.join(', ') : value}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-40 p-4 pb-24"
      onClick={handleBackdropClick}
    >
      <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-6xl h-[calc(100vh-120px)] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Furniture Details</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-accent rounded-md transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content - Scrollable Container */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            {/* Top Section - Title, Price, Availability */}
            <div className="mb-6">
              <h3 className="text-2xl font-semibold text-foreground mb-2">
                {furniture.title || furniture.name || 'Untitled Furniture'}
              </h3>

              <div className="flex flex-wrap items-center gap-4">
                {furniture.price && (
                  <div className="flex items-center gap-2 text-primary">
                    <span className="text-xl font-bold">
                      {furniture.price.startsWith('$') ? furniture.price : `$${furniture.price}`}
                    </span>
                  </div>
                )}

                {furniture.availability && (
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm">
                    <CheckCircle className="w-4 h-4" />
                    {furniture.availability}
                  </div>
                )}
              </div>
            </div>

            {/* Image Gallery Section */}
            {furniture.images && furniture.images.length > 0 && (
              <div className="mb-6">
                <div className="relative max-w-md mx-auto">
                  <div className="aspect-square bg-secondary/20 rounded-lg overflow-hidden">
                    <img
                      src={furniture.images[currentImageIndex]}
                      alt={`${furniture.title || furniture.name} - Image ${currentImageIndex + 1}`}
                      className="w-full h-full object-contain"
                    />
                  </div>

                  {hasMultipleImages && (
                    <>
                      <button
                        onClick={prevImage}
                        className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button
                        onClick={nextImage}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </div>

                {/* Thumbnail Gallery */}
                {furniture.images && furniture.images.length > 1 && (
                  <div className="flex justify-center gap-2 mt-3">
                    {furniture.images.slice(0, 8).map((img, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentImageIndex(index)}
                        className={`w-16 h-16 rounded overflow-hidden border-2 transition-all ${
                          index === currentImageIndex
                            ? 'border-primary'
                            : 'border-transparent hover:border-gray-300'
                        }`}
                      >
                        <img
                          src={img}
                          alt={`Thumbnail ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}

                {furniture.images.length > 1 && (
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    {currentImageIndex + 1} of {furniture.images.length} images
                  </p>
                )}
              </div>
            )}

            {/* Description */}
            {furniture.description && (
              <div className="mb-6 pb-6 border-b border-border">
                <h4 className="text-sm font-semibold text-foreground mb-2">Description</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {furniture.description}
                </p>
              </div>
            )}

            {/* Product Details Grid */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <DetailItem
                icon={Tag}
                label="SKU / Item Number"
                value={furniture.sku}
              />

              <DetailItem
                icon={Ruler}
                label="Dimensions"
                value={furniture.dimensions}
              />

              <DetailItem
                icon={Layers}
                label="Material"
                value={furniture.material}
              />

              <DetailItem
                icon={Palette}
                label="Color Options"
                value={furniture.color}
              />
            </div>

            {/* Features */}
            {furniture.features && (
              <div className="mb-6">
                <div className="flex gap-3">
                  <Info className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Features & Specifications</p>
                    {typeof furniture.features === 'string' ? (
                      <p className="text-sm text-foreground">{furniture.features}</p>
                    ) : Array.isArray(furniture.features) ? (
                      <ul className="text-sm text-foreground space-y-1">
                        {furniture.features.map((feature, index) => (
                          <li key={index} className="flex items-start">
                            <span className="text-primary mr-2">•</span>
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </div>
              </div>
            )}

            {/* Source */}
            {furniture.source && (
              <div className="pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  Source: <span className="font-medium">{furniture.source}</span>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer - Fixed */}
        <div className="p-4 border-t border-border flex justify-between items-center flex-shrink-0">
          <p className="text-xs text-muted-foreground">
            Added: {new Date(furniture.id).toLocaleString()}
          </p>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-md transition-colors"
            >
              Close
            </button>
            <a
              href={furniture.url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 text-sm font-medium bg-primary hover:bg-primary/90 text-primary-foreground rounded-md transition-colors flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              View Original
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}