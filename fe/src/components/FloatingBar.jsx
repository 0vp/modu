import { useState } from 'react'
import {
  Undo,
  Redo,
  Copy,
  ChevronDown,
  Send,
  MessageSquare,
  Palette,
  Layers
} from 'lucide-react'
import { cn } from '../lib/utils'

export function FloatingBar() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')

  const dropdownOptions = [
    { label: 'Export as PNG', value: 'png' },
    { label: 'Export as SVG', value: 'svg' },
    { label: 'Export as PDF', value: 'pdf' },
    { label: 'Share Link', value: 'share' },
  ]

  const handleSend = () => {
    if (inputValue.trim()) {
      console.log('Sending:', inputValue)
      setInputValue('')
    }
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-card rounded-xl shadow-lg border border-border p-2 flex items-center gap-2 z-50">
      <div className="flex items-center gap-1 pr-2 border-r border-border">
        <button
          className="p-2 hover:bg-accent rounded-lg transition-colors group"
          title="Undo"
        >
          <Undo className="w-5 h-5 text-muted-foreground group-hover:text-foreground" />
        </button>

        <button
          className="p-2 hover:bg-accent rounded-lg transition-colors group"
          title="Redo"
        >
          <Redo className="w-5 h-5 text-muted-foreground group-hover:text-foreground" />
        </button>

        <button
          className="p-2 hover:bg-accent rounded-lg transition-colors group"
          title="Copy"
        >
          <Copy className="w-5 h-5 text-muted-foreground group-hover:text-foreground" />
        </button>
      </div>

      <div className="flex items-center gap-1">
        <button
          className="p-2 hover:bg-accent rounded-lg transition-colors group"
          title="Comments"
        >
          <MessageSquare className="w-5 h-5 text-muted-foreground group-hover:text-foreground" />
        </button>

        <button
          className="p-2 hover:bg-accent rounded-lg transition-colors group"
          title="Colors"
        >
          <Palette className="w-5 h-5 text-muted-foreground group-hover:text-foreground" />
        </button>

        <button
          className="p-2 hover:bg-accent rounded-lg transition-colors group"
          title="Layers"
        >
          <Layers className="w-5 h-5 text-muted-foreground group-hover:text-foreground" />
        </button>
      </div>

      <div className="relative pl-2 border-l border-border">
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="px-3 py-2 hover:bg-accent rounded-lg transition-colors flex items-center gap-2 text-sm text-foreground"
        >
          <span>Options</span>
          <ChevronDown className={cn(
            "w-4 h-4 transition-transform",
            isDropdownOpen && "rotate-180"
          )} />
        </button>

        {isDropdownOpen && (
          <div className="absolute bottom-full left-0 mb-2 bg-card rounded-lg shadow-lg border border-border py-1 min-w-[150px]">
            {dropdownOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  console.log('Selected:', option.value)
                  setIsDropdownOpen(false)
                }}
                className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-accent transition-colors"
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>

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