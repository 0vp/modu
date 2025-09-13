import { useState, useRef } from 'react'
import { Upload, Image as ImageIcon } from 'lucide-react'
import { cn } from '../lib/utils'

export function Canvas() {
  const [isDragging, setIsDragging] = useState(false)
  const [uploadedImage, setUploadedImage] = useState(null)
  const fileInputRef = useRef(null)

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
    fileInputRef.current?.click()
  }

  return (
    <div className="flex-1 bg-gray-100 overflow-hidden relative">
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>

      <div className="h-full flex items-center justify-center p-8">
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={handleClick}
          className={cn(
            "w-full max-w-3xl h-96 border-2 border-dashed rounded-lg transition-all cursor-pointer",
            isDragging
              ? "border-blue-500 bg-blue-50"
              : "border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50"
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
            <div className="h-full flex items-center justify-center p-4">
              <img
                src={uploadedImage}
                alt="Uploaded"
                className="max-w-full max-h-full object-contain rounded-lg shadow-md"
              />
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-500">
              <div className="mb-4 p-4 bg-gray-100 rounded-full">
                {isDragging ? (
                  <Upload className="w-8 h-8 text-blue-500" />
                ) : (
                  <ImageIcon className="w-8 h-8" />
                )}
              </div>

              <p className="text-lg font-medium mb-2">
                {isDragging ? "Drop your image here" : "Drag & drop an image"}
              </p>

              <p className="text-sm text-gray-400 mb-4">
                or click to browse
              </p>

              <div className="flex items-center gap-4 text-xs text-gray-400">
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
        </div>
      </div>

      {uploadedImage && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            setUploadedImage(null)
          }}
          className="absolute top-4 right-4 px-3 py-1.5 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 shadow-sm transition-colors"
        >
          Clear Canvas
        </button>
      )}
    </div>
  )
}