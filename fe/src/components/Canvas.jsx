import { useState, useRef, useEffect } from 'react'
import { Upload, Image as ImageIcon, X } from 'lucide-react'
import { cn } from '../lib/utils'
import { useDrawing } from '../contexts/DrawingContext'

export function Canvas({ onFurnitureClick, hasChanges, setHasChanges, uploadedImage, setUploadedImage }) {
  const [isDragging, setIsDragging] = useState(false)
  const [isDrawing, setIsDrawing] = useState(false)
  const [paths, setPaths] = useState([]) // Stores normalized paths (0-1 range)
  const [currentPath, setCurrentPath] = useState([])
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })
  const [furniturePins, setFurniturePins] = useState([]) // Stores furniture pins
  const [hoveredPin, setHoveredPin] = useState(null)
  const [draggingPin, setDraggingPin] = useState(null)
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 })
  const [isInteractingWithPin, setIsInteractingWithPin] = useState(false)
  const fileInputRef = useRef(null)
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const imageRef = useRef(null)
  const { isDrawingMode } = useDrawing()

  // Handle Space key press
  useEffect(() => {
    const handleKeyPress = async (e) => {
      if (e.key === ' ' && hasChanges && uploadedImage && imageRef.current) {
        e.preventDefault() // Prevent page scroll
        console.log('Saving canvas images...')

        try {
          // Create a temporary canvas for the annotated image
          const tempCanvas = document.createElement('canvas')
          const tempCtx = tempCanvas.getContext('2d')

          // Set canvas size to match the actual image dimensions
          tempCanvas.width = imageRef.current.naturalWidth
          tempCanvas.height = imageRef.current.naturalHeight

          // Draw the original image
          tempCtx.drawImage(imageRef.current, 0, 0)

          // Draw the paths (drawings) on top
          if (paths.length > 0) {
            tempCtx.globalAlpha = 1  // Full opacity for better visibility
            tempCtx.strokeStyle = '#000000'  // Black color
            tempCtx.lineWidth = Math.max(8, Math.min(16, tempCanvas.width / 50))  // Slightly thinner for cleaner look
            tempCtx.lineCap = 'round'
            tempCtx.lineJoin = 'round'

            paths.forEach(path => {
              if (path.length > 0) {
                tempCtx.beginPath()
                path.forEach((point, index) => {
                  const x = point.x * tempCanvas.width
                  const y = point.y * tempCanvas.height
                  if (index === 0) {
                    tempCtx.moveTo(x, y)
                  } else {
                    tempCtx.lineTo(x, y)
                  }
                })
                tempCtx.stroke()
              }
            })
          }

          // Add furniture labels vertically (instead of dots)
          if (furniturePins.length > 0) {
            tempCtx.globalAlpha = 1
            // Bigger, bold monospace font for better visibility
            const fontSize = Math.max(20, Math.min(30, tempCanvas.width / 60))  // Larger size
            tempCtx.font = `bold ${fontSize}px monospace`  // Bold for better visibility
            tempCtx.textAlign = 'center'
            tempCtx.textBaseline = 'middle'

            furniturePins.forEach(pin => {
              const x = pin.x * tempCanvas.width
              const y = pin.y * tempCanvas.height
              // Use the short product ID instead of long title
              // Check if ID exists and is not a timestamp (which would be a number)
              const label = (pin.id && typeof pin.id === 'string' && pin.id.length === 8) ? pin.id : 'UNKNOWN'

              // Save the current context state
              tempCtx.save()

              // Translate to the pin position and rotate 90 degrees for vertical text
              tempCtx.translate(x, y)
              tempCtx.rotate(-Math.PI / 2)  // Rotate -90 degrees (text reads from bottom to top)

              // Draw white background with more padding for better visibility
              const textMetrics = tempCtx.measureText(label)
              const padding = 8  // More padding for better visibility

              // Background rectangle (now rotated) with drop shadow effect
              // Draw shadow first
              tempCtx.fillStyle = 'rgba(0, 0, 0, 0.3)'  // Semi-transparent black shadow
              tempCtx.fillRect(
                -textMetrics.width / 2 - padding + 3,
                -fontSize/2 - padding + 3,
                textMetrics.width + padding * 2,
                fontSize + padding * 2
              )

              // Then draw white background
              tempCtx.fillStyle = 'rgba(255, 255, 255, 1)'  // Fully opaque white
              tempCtx.fillRect(
                -textMetrics.width / 2 - padding,
                -fontSize/2 - padding,
                textMetrics.width + padding * 2,
                fontSize + padding * 2
              )

              // Draw thicker black border for better visibility
              tempCtx.strokeStyle = '#000000'  // Black border
              tempCtx.lineWidth = 2  // Thicker border for clarity
              tempCtx.strokeRect(
                -textMetrics.width / 2 - padding,
                -fontSize/2 - padding,
                textMetrics.width + padding * 2,
                fontSize + padding * 2
              )

              // Draw text in black for maximum legibility
              tempCtx.fillStyle = '#000000'  // Black text
              tempCtx.fillText(label, 0, 0)  // Draw at origin since we've translated

              // Restore the context state
              tempCtx.restore()
            })
          }

          // Convert canvases to base64
          const originalImage = uploadedImage  // Already base64
          const annotatedImage = tempCanvas.toDataURL('image/png')

          // Send to backend
          const response = await fetch('http://localhost:5000/save_canvas', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              original_image: originalImage,
              annotated_image: annotatedImage
            })
          })

          const result = await response.json()

          if (result.success) {
            console.log('Images saved successfully:', result)
            setHasChanges(false)
          } else {
            console.error('Failed to save images:', result.error)
          }
        } catch (error) {
          console.error('Error saving canvas images:', error)
        }
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [hasChanges, paths, furniturePins, uploadedImage, setHasChanges])

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

    // Check if it's a furniture item being dropped
    const furnitureData = e.dataTransfer.getData('furniture')
    if (furnitureData) {
      const furniture = JSON.parse(furnitureData)

      // Get drop position relative to the image
      if (imageRef.current && containerRef.current) {
        const imgRect = imageRef.current.getBoundingClientRect()

        // Calculate position relative to the image
        const x = e.clientX - imgRect.left
        const y = e.clientY - imgRect.top

        // Normalize coordinates (0-1 range)
        const normalizedX = x / imgRect.width
        const normalizedY = y / imgRect.height

        // Only add pin if dropped on the image
        if (normalizedX >= 0 && normalizedX <= 1 && normalizedY >= 0 && normalizedY <= 1) {
          const newPin = {
            ...furniture,
            pinId: `pin-${Date.now()}`,  // Keep a separate pinId for React keys
            // Keep the original furniture.id (8-char hash from backend)
            x: normalizedX,
            y: normalizedY
          }
          setFurniturePins([...furniturePins, newPin])
          setHasChanges(true) // Mark as changed when pin is added
        }
      }
      return
    }

    // Handle regular file drops
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
    if (!isDrawingMode || !canvasRef.current || isInteractingWithPin) return

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
    ctx.strokeStyle = '#B854F6' // Matches theme primary color: hsl(270 95% 65%)
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
      setHasChanges(true) // Mark as changed when drawing is added
    }
    setIsDrawing(false)
  }

  const clearDrawing = () => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
      if (paths.length > 0) {
        setHasChanges(true) // Mark as changed when drawings are cleared
      }
      setPaths([])
      setCurrentPath([])
    }
  }

  // Handle pin dragging
  const handlePinDragStart = (e, pin) => {
    e.stopPropagation()
    setIsInteractingWithPin(true)
    const pinIdentifier = pin.pinId || pin.id
    setDraggingPin(pinIdentifier)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('pinId', pinIdentifier)

    // Create a transparent drag image to hide the default ghost
    const dragImage = new Image()
    dragImage.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs='
    e.dataTransfer.setDragImage(dragImage, 0, 0)
  }

  const handlePinDragOver = (e) => {
    if (draggingPin) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'

      // Update drag position for visual feedback
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setDragPosition({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        })
      }
    }
  }

  const handlePinDrop = (e) => {
    e.preventDefault()
    const pinId = e.dataTransfer.getData('pinId')

    if (pinId && imageRef.current) {
      const imgRect = imageRef.current.getBoundingClientRect()
      const x = e.clientX - imgRect.left
      const y = e.clientY - imgRect.top

      const normalizedX = x / imgRect.width
      const normalizedY = y / imgRect.height

      // Update pin position if dropped on image
      if (normalizedX >= 0 && normalizedX <= 1 && normalizedY >= 0 && normalizedY <= 1) {
        setFurniturePins(pins => {
          const updatedPins = pins.map(pin => {
            const pinIdentifier = pin.pinId || pin.id
            return pinIdentifier === pinId
              ? { ...pin, x: normalizedX, y: normalizedY }
              : pin
          })
          setHasChanges(true) // Mark as changed when pin is moved
          return updatedPins
        })
      }
    }
    setDraggingPin(null)
    setDragPosition({ x: 0, y: 0 })
    setIsInteractingWithPin(false)
  }

  // Delete pin
  const deletePin = (pinId) => {
    setFurniturePins(pins => pins.filter(pin => {
      const pinIdentifier = pin.pinId || pin.id
      return pinIdentifier !== pinId
    }))
    setHasChanges(true) // Mark as changed when pin is deleted
  }

  return (
    <div className="flex-1 bg-secondary/50 dark:bg-background overflow-hidden relative p-4">
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>

      <div
        ref={containerRef}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={(e) => {
          handleDragOver(e)
          handlePinDragOver(e)
        }}
        onDrop={(e) => {
          // Check if it's a pin being moved
          if (e.dataTransfer.getData('pinId')) {
            handlePinDrop(e)
          } else {
            handleDrop(e)
          }
        }}
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

        {/* Dragging indicator */}
        {draggingPin && dragPosition.x > 0 && (
          <div
            className="absolute pointer-events-none z-50"
            style={{
              left: dragPosition.x - 14,
              top: dragPosition.y - 14
            }}
          >
            <div className="relative w-7 h-7">
              {/* Subtle white border for contrast */}
              <div className="absolute inset-0 bg-white/80 rounded-full shadow-sm"></div>
              {/* Purple ring and dot */}
              <div className="absolute inset-0.5 rounded-full animate-pulse opacity-60" style={{ backgroundColor: '#B854F6' }}></div>
              <div className="absolute inset-1.5 rounded-full" style={{ backgroundColor: '#B854F6' }}></div>
            </div>
          </div>
        )}

        {/* Furniture pins */}
        {uploadedImage && imageRef.current && furniturePins.map((pin) => {
          const imgRect = imageRef.current?.getBoundingClientRect()
          if (!imgRect) return null

          return (
            <div
              key={pin.pinId || pin.id}
              className={`absolute group transition-opacity ${draggingPin === (pin.pinId || pin.id) ? 'opacity-50' : 'opacity-100'}`}
              style={{
                left: imgRect.left - containerRef.current?.getBoundingClientRect().left + pin.x * imgRect.width - 14,
                top: imgRect.top - containerRef.current?.getBoundingClientRect().top + pin.y * imgRect.height - 14,
                zIndex: 20
              }}
              draggable
              onDragStart={(e) => handlePinDragStart(e, pin)}
              onDragEnd={() => {
                setDraggingPin(null)
                setDragPosition({ x: 0, y: 0 })
                setIsInteractingWithPin(false)
              }}
              onMouseDown={(e) => {
                e.stopPropagation()
                setIsInteractingWithPin(true)
              }}
              onMouseUp={(e) => {
                e.stopPropagation()
                setIsInteractingWithPin(false)
              }}
              onMouseEnter={() => setHoveredPin(pin.pinId || pin.id)}
              onMouseLeave={() => {
                setHoveredPin(null)
                setIsInteractingWithPin(false)
              }}
            >
              {/* Pin dot with ring */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onFurnitureClick(pin)
                }}
                className="relative w-7 h-7 cursor-move"
              >
                {/* Subtle white border for contrast */}
                <div className="absolute inset-0 bg-white/80 rounded-full shadow-sm"></div>
                {/* Purple ring and dot */}
                <div className="absolute inset-0.5 rounded-full animate-pulse opacity-30" style={{ backgroundColor: '#B854F6' }}></div>
                <div className="absolute inset-1.5 rounded-full" style={{ backgroundColor: '#B854F6' }}></div>
              </button>

              {/* Delete button - using opacity transition instead of conditional rendering */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  deletePin(pin.pinId || pin.id)
                }}
                className={`absolute -top-2 -right-2 w-5 h-5 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-full flex items-center justify-center shadow-md z-40 transition-opacity ${
                  hoveredPin === (pin.pinId || pin.id) ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
                title="Delete pin"
              >
                <X className="w-3 h-3" />
              </button>

              {/* Tooltip - also using opacity transition */}
              <div className={`absolute bottom-8 left-1/2 -translate-x-1/2 bg-card border border-border rounded-lg px-2 py-1 text-xs text-foreground shadow-lg whitespace-nowrap z-30 transition-opacity ${
                hoveredPin === (pin.pinId || pin.id) ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}>
                {pin.name || pin.title}
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-card border-b border-r border-border rotate-45"></div>
              </div>
            </div>
          )
        })}

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