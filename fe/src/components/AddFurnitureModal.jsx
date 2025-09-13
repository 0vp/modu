import { useState, useEffect } from 'react'
import { X, Sofa } from 'lucide-react'
import { cn } from '../lib/utils'

export function AddFurnitureModal({ isOpen, onClose, onAdd }) {
  const [furnitureUrl, setFurnitureUrl] = useState('')

  useEffect(() => {
    if (isOpen) {
      setFurnitureUrl('')
    }
  }, [isOpen])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (furnitureUrl.trim()) {
      onAdd(furnitureUrl.trim())
      onClose()
    }
  }

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Sofa className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Add Furniture</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-accent rounded-md transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4">
          <div className="mb-4">
            <label htmlFor="furniture-input" className="block text-sm font-medium text-foreground mb-2">
              Furniture URL
            </label>
            <input
              id="furniture-input"
              type="url"
              value={furnitureUrl}
              onChange={(e) => setFurnitureUrl(e.target.value)}
              placeholder="https://furniture-store.com/product"
              className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              autoFocus
              required
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Enter a link to a furniture product.
            </p>
          </div>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium bg-primary hover:bg-primary/90 text-primary-foreground rounded-md transition-colors"
            >
              Add
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}