import { useState, useEffect } from 'react'
import { X, Sofa, Loader2 } from 'lucide-react'

export function AddFurnitureModal({ isOpen, onClose, onAdd }) {
  const [furnitureUrl, setFurnitureUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      setFurnitureUrl('')
      setError('')
    }
  }, [isOpen])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!furnitureUrl.trim()) return

    setIsLoading(true)
    setError('')

    try {
      console.log('Sending URL to scrape:', furnitureUrl.trim())

      // Encode the URL as a query parameter
      const params = new URLSearchParams({ url: furnitureUrl.trim() })
      const response = await fetch(`http://localhost:5000/scrape?${params}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        mode: 'cors',
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Scrape error:', errorText)
        throw new Error(`Failed to scrape: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      console.log('Received scraped data:', data)

      // Pass the scraped data to the parent component
      onAdd({
        url: furnitureUrl.trim(),
        ...data
      })

      onClose()
    } catch (err) {
      console.error('Error adding furniture:', err)

      // Check if it's a network/CORS error
      if (err.message === 'Failed to fetch') {
        setError('Cannot connect to server. Make sure the backend is running with CORS enabled on port 5000.')
      } else {
        setError(err.message || 'Failed to add furniture. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !isLoading) {
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
            disabled={isLoading}
            className="p-1 hover:bg-accent rounded-md transition-colors disabled:opacity-50"
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
              className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
              autoFocus
              required
              disabled={isLoading}
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Enter a link to a furniture product.
            </p>
            {error && (
              <p className="mt-2 text-xs text-destructive">
                {error}
              </p>
            )}
          </div>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-md transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium bg-primary hover:bg-primary/90 text-primary-foreground rounded-md transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Scraping...
                </>
              ) : (
                'Add'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}