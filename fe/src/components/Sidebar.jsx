import { useState } from 'react'
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Square,
  Circle,
  Triangle,
  Type,
  Image,
  PenTool,
  MousePointer,
  Hand,
  Layers
} from 'lucide-react'
import { cn } from '../lib/utils'

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const tools = [
    { icon: MousePointer, name: 'Select', shortcut: 'V' },
    { icon: Hand, name: 'Hand', shortcut: 'H' },
    { icon: Square, name: 'Rectangle', shortcut: 'R' },
    { icon: Circle, name: 'Circle', shortcut: 'O' },
    { icon: Triangle, name: 'Triangle', shortcut: 'T' },
    { icon: PenTool, name: 'Pen', shortcut: 'P' },
    { icon: Type, name: 'Text', shortcut: 'T' },
    { icon: Image, name: 'Image', shortcut: 'I' },
    { icon: Layers, name: 'Layers', shortcut: 'L' },
  ]

  return (
    <aside
      className={cn(
        "h-full bg-gray-50 border-r border-gray-200 transition-all duration-300 flex flex-col",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      <div className="p-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <button
            className="flex-shrink-0 w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center transition-colors"
            title="Add new"
          >
            <Plus className="w-5 h-5" />
          </button>

          {!isCollapsed && (
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {!isCollapsed && (
          <div className="p-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Tools</h3>
            <div className="space-y-1">
              {tools.map((tool) => (
                <button
                  key={tool.name}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors group"
                >
                  <tool.icon className="w-4 h-4 text-gray-600 group-hover:text-gray-900" />
                  <span className="flex-1 text-left">{tool.name}</span>
                  <span className="text-xs text-gray-400">{tool.shortcut}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {isCollapsed && (
          <div className="p-2 space-y-1">
            {tools.slice(0, 5).map((tool) => (
              <button
                key={tool.name}
                className="w-full p-3 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded-lg transition-colors group"
                title={tool.name}
              >
                <tool.icon className="w-5 h-5 group-hover:text-gray-900" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="p-3 border-t border-gray-200">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full flex items-center justify-center p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          {isCollapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <ChevronLeft className="w-5 h-5" />
          )}
        </button>
      </div>
    </aside>
  )
}