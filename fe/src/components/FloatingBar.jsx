import { useState } from 'react'
import {
  Paintbrush,
  Eraser,
  Send
} from 'lucide-react'
import { cn } from '../lib/utils'
import { useDrawing } from '../contexts/DrawingContext'

export function FloatingBar({ onGenerate }) {
  console.log('FloatingBar rendered with onGenerate:', typeof onGenerate, onGenerate)
  const [inputValue, setInputValue] = useState('')
  const { isDrawingMode, setIsDrawingMode, isEraserMode, setIsEraserMode } = useDrawing()

  const handleSend = () => {
    console.log('Send button clicked')
    console.log('inputValue:', inputValue)
    console.log('onGenerate:', typeof onGenerate, onGenerate)

    if (inputValue.trim() && onGenerate) {
      console.log('Generating with prompt:', inputValue.trim())
      onGenerate(inputValue.trim())
      setInputValue('')
    } else if (!inputValue.trim()) {
      console.log('No input text')
    } else if (!onGenerate) {
      console.log('onGenerate function not available')
    }
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-card rounded-xl shadow-lg border border-border p-2 flex items-center gap-2 z-50">
      <button
        onClick={() => {
          setIsDrawingMode(!isDrawingMode)
          if (isEraserMode) setIsEraserMode(false)  // Turn off eraser when enabling drawing
        }}
        className={cn(
          "p-2 rounded-lg transition-colors group",
          isDrawingMode
            ? "bg-primary text-primary-foreground"
            : "hover:bg-accent"
        )}
        title={isDrawingMode ? "Exit drawing mode" : "Enter drawing mode"}
      >
        <Paintbrush className={cn(
          "w-5 h-5",
          isDrawingMode
            ? "text-primary-foreground"
            : "text-muted-foreground group-hover:text-foreground"
        )} />
      </button>

      <button
        onClick={() => {
          setIsEraserMode(!isEraserMode)
          if (isDrawingMode) setIsDrawingMode(false)  // Turn off drawing when enabling eraser
        }}
        className={cn(
          "p-2 rounded-lg transition-colors group",
          isEraserMode
            ? "bg-primary text-primary-foreground"
            : "hover:bg-accent"
        )}
        title={isEraserMode ? "Exit eraser mode" : "Enter eraser mode"}
      >
        <Eraser className={cn(
          "w-5 h-5",
          isEraserMode
            ? "text-primary-foreground"
            : "text-muted-foreground group-hover:text-foreground"
        )} />
      </button>

      <div className="flex items-center gap-2 pl-2 border-l border-border">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type a message..."
          className="w-48 px-3 py-2 bg-secondary/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        />

        <button
          onClick={handleSend}
          className={cn(
            "p-2 rounded-lg transition-colors",
            inputValue.trim()
              ? "bg-primary hover:bg-primary/90 text-primary-foreground"
              : "bg-secondary text-muted-foreground cursor-not-allowed"
          )}
          disabled={!inputValue.trim()}
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}