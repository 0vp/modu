import { Menu, Home, Share2, Play, Users, Settings } from 'lucide-react'
import { cn } from '../lib/utils'

export function Navbar() {
  return (
    <nav className="h-12 border-b border-gray-200 bg-white flex items-center px-4 justify-between">
      <div className="flex items-center gap-4">
        <button className="p-1.5 hover:bg-gray-100 rounded-md transition-colors">
          <Menu className="w-5 h-5 text-gray-700" />
        </button>

        <button className="p-1.5 hover:bg-gray-100 rounded-md transition-colors">
          <Home className="w-5 h-5 text-gray-700" />
        </button>

        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">/</span>
          <span className="text-gray-700 font-medium">Untitled Design</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button className="p-1.5 hover:bg-gray-100 rounded-md transition-colors">
          <Share2 className="w-5 h-5 text-gray-700" />
        </button>

        <button className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center gap-2 text-sm font-medium transition-colors">
          <Play className="w-4 h-4" />
          Present
        </button>

        <div className="ml-4 flex items-center gap-2">
          <button className="p-1.5 hover:bg-gray-100 rounded-md transition-colors">
            <Users className="w-5 h-5 text-gray-700" />
          </button>

          <button className="p-1.5 hover:bg-gray-100 rounded-md transition-colors">
            <Settings className="w-5 h-5 text-gray-700" />
          </button>
        </div>
      </div>
    </nav>
  )
}