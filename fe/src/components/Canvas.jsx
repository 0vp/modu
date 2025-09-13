import { useState, useRef, useEffect } from 'react'
import { Upload, Image as ImageIcon } from 'lucide-react'
import { cn } from '../lib/utils'
import { useDrawing } from '../contexts/DrawingContext'

export function Canvas() {
  const [isDragging, setIsDragging] = useState(false)
  const [uploadedImage, setUploadedImage] = useState(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [paths, setPaths] = useState([]) // Stores normalized paths (0-1 range)
  const [currentPath, setCurrentPath] = useState([])
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })
  const fileInputRef = useRef(null)
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const imageRef = useRef(null)
  const { isDrawingMode } = useDrawing()

  const handleDragEnter = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files && files[0]) {
      handleFile(files[0])
    }
  }

  const handleFile = (file) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setUploadedImage(e.target.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleFileInput = (e) => {
    const file = e.target.files[0]
    if (file) {
      handleFile(file)
    }
  }

  const handleClick = () => {
    if (!isDrawingMode) {
      fileInputRef.current?.click()
    }
  }

  // Handle canvas resizing and maintain aspect ratio
  useEffect(() => {
    const resizeCanvas = () => {
      if (canvasRef.current && imageRef.current && uploadedImage) {
        const container = containerRef.current.getBoundingClientRect()
        const img = imageRef.current

        // Calculate the displayed image dimensions (maintaining aspect ratio)
        const imgAspect = img.naturalWidth / img.naturalHeight
        const containerAspect = container.width / container.height

        let displayWidth, displayHeight;
        if (imgAspect > containerAspect) {
          // Image is wider
          displayWidth = container.width * 0.9 // 90% to account for padding
          displayHeight = displayWidth / imgAspect
        } else {
          // Image is taller
          displayHeight = container.height * 0.9
          displayWidth = displayHeight * imgAspect
        }

        // Set canvas size to match displayed image
        canvasRef.current.width = displayWidth
        canvasRef.current.height = displayHeight
        setCanvasSize({ width: displayWidth, height: displayHeight })

        // Center the canvas
        const leftOffset = (container.width - displayWidth) / 2
        const topOffset = (container.height - displayHeight) / 2
        canvasRef.current.style.left = `${leftOffset}px`
        canvasRef.current.style.top = `${topOffset}px`

        // Redraw all paths with new dimensions
        redrawCanvas([...paths, ...(isDrawing ? [currentPath] : [])])
      }
    }

    // Use ResizeObserver to detect container size changes (including sidebar toggle)
    let resizeObserver;
    if (containerRef.current && uploadedImage) {
      resizeObserver = new ResizeObserver(resizeCanvas)
      resizeObserver.observe(containerRef.current)
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      if (resizeObserver) {
        resizeObserver.disconnect()
      }
    }
  }, [uploadedImage, paths, currentPath, isDrawing])

  const startDrawing = (e) => {
    if (!isDrawingMode || !canvasRef.current) return

    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Normalize coordinates to 0-1 range
    const normalizedX = x / canvas.width
    const normalizedY = y / canvas.height

    setCurrentPath([{ x: normalizedX, y: normalizedY }])
    setIsDrawing(true)
  }

  const redrawCanvas = (allPaths) => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    // Clear the entire canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Redraw all paths
    ctx.globalAlpha = 0.8
    ctx.strokeStyle = '#8b5cf6'
    // Scale line width based on canvas size
    ctx.lineWidth = Math.max(12, Math.min(24, canvas.width / 40))
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    allPaths.forEach(path => {
      if (path.length > 0) {
        ctx.beginPath()
        path.forEach((point, index) => {
          // Convert normalized coordinates back to canvas coordinates
          const x = point.x * canvas.width
          const y = point.y * canvas.height

          if (index === 0) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        })
        ctx.stroke()
      }
    })
  }

  const draw = (e) => {
    if (!isDrawing || !isDrawingMode || !canvasRef.current) return

    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Normalize coordinates to 0-1 range
    const normalizedX = x / canvas.width
    const normalizedY = y / canvas.height

    const newPath = [...currentPath, { x: normalizedX, y: normalizedY }]
    setCurrentPath(newPath)

    // Redraw everything including the current path
    redrawCanvas([...paths, newPath])
  }

  const stopDrawing = () => {
    if (isDrawing && currentPath.length > 0) {
      // Save the completed path
      setPaths([...paths, currentPath])
      setCurrentPath([])
    }
    setIsDrawing(false)
  }

  const clearDrawing = () => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
      setPaths([])
      setCurrentPath([])
    }
  }

  return (
    <div className="flex-1 bg-secondary/50 dark:bg-background overflow-hidden relative p-4">
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>

      <div
        ref={containerRef}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        className={cn(
          "relative w-full h-full border-2 border-dashed rounded-lg transition-all flex items-center justify-center",
          isDrawingMode
            ? "cursor-crosshair"
            : "cursor-pointer",
          isDragging
            ? "border-primary bg-primary/10"
            : "border-border bg-card dark:bg-card/50 hover:border-primary/50 hover:bg-secondary"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileInput}
          className="hidden"
        />

        {uploadedImage ? (
          <div className="w-full h-full flex items-center justify-center p-8 relative">
            <img
              ref={imageRef}
              src={uploadedImage}
              alt="Uploaded"
              className="max-w-full max-h-full object-contain rounded-lg shadow-md"
              onLoad={() => {
                // Trigger canvas resize when image loads
                if (canvasRef.current && imageRef.current) {
                  const container = containerRef.current.getBoundingClientRect()
                  const img = imageRef.current

                  const imgAspect = img.naturalWidth / img.naturalHeight
                  const containerAspect = container.width / container.height

                  let displayWidth, displayHeight;
                  if (imgAspect > containerAspect) {
                    displayWidth = container.width * 0.9
                    displayHeight = displayWidth / imgAspect
                  } else {
                    displayHeight = container.height * 0.9
                    displayWidth = displayHeight * imgAspect
                  }

                  canvasRef.current.width = displayWidth
                  canvasRef.current.height = displayHeight
                  setCanvasSize({ width: displayWidth, height: displayHeight })

                  const leftOffset = (container.width - displayWidth) / 2
                  const topOffset = (container.height - displayHeight) / 2
                  canvasRef.current.style.left = `${leftOffset}px`
                  canvasRef.current.style.top = `${topOffset}px`
                }
              }}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-muted-foreground">
            <div className="mb-4 p-4 bg-secondary/50 rounded-full">
              {isDragging ? (
                <Upload className="w-8 h-8 text-primary" />
              ) : (
                <ImageIcon className="w-8 h-8" />
              )}
            </div>

            <p className="text-lg font-medium mb-2">
              {isDragging ? "Drop your image here" : "Drag & drop an image"}
            </p>

            <p className="text-sm text-muted-foreground/70 mb-4">
              or click to browse
            </p>

            <div className="flex items-center gap-4 text-xs text-muted-foreground/60">
              <span>PNG</span>
              <span>•</span>
              <span>JPG</span>
              <span>•</span>
              <span>SVG</span>
              <span>•</span>
              <span>GIF</span>
            </div>
          </div>
        )}

        {uploadedImage && (
          <canvas
            ref={canvasRef}
            className="absolute pointer-events-none"
            style={{
              pointerEvents: isDrawingMode ? 'auto' : 'none',
              position: 'absolute',
              width: 'auto',
              height: 'auto'
            }}
          />
        )}

        {uploadedImage && (
          <div className="absolute top-4 right-4 flex gap-2">
            {isDrawingMode && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  clearDrawing()
                }}
                className="px-3 py-1.5 bg-card hover:bg-accent border border-border rounded-lg text-sm text-foreground shadow-sm transition-colors"
              >
                Clear Drawing
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation()
                setUploadedImage(null)
                clearDrawing()
              }}
              className="px-3 py-1.5 bg-card hover:bg-accent border border-border rounded-lg text-sm text-foreground shadow-sm transition-colors"
            >
              Clear Image
            </button>
          </div>
        )}
      </div>
    </div>
  )
}