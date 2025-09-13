import { Menu, Home, Share2, Play, Users, Settings, Sun, Moon } from 'lucide-react'
import { cn } from '../lib/utils'
import { useTheme } from '../contexts/ThemeContext'

export function Navbar() {
  const { theme, toggleTheme } = useTheme()

  return (
    <nav className="h-12 border-b border-border bg-background flex items-center px-4 justify-between">
      <div className="flex items-center gap-4">
        <button className="p-1.5 hover:bg-accent rounded-md transition-colors">
          <Menu className="w-5 h-5 text-foreground" />
        </button>

        <button className="p-1.5 hover:bg-accent rounded-md transition-colors">
          <Home className="w-5 h-5 text-foreground" />
        </button>

        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">/</span>
          <span className="text-foreground font-medium">Untitled Design</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button className="p-1.5 hover:bg-accent rounded-md transition-colors">
          <Share2 className="w-5 h-5 text-foreground" />
        </button>

        <button className="px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md flex items-center gap-2 text-sm font-medium transition-colors">
          <Play className="w-4 h-4" />
          Present
        </button>

        <div className="ml-4 flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-1.5 hover:bg-accent rounded-md transition-colors"
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? (
              <Moon className="w-5 h-5 text-foreground" />
            ) : (
              <Sun className="w-5 h-5 text-foreground" />
            )}
          </button>

          <button className="p-1.5 hover:bg-accent rounded-md transition-colors">
            <Users className="w-5 h-5 text-foreground" />
          </button>

          <button className="p-1.5 hover:bg-accent rounded-md transition-colors">
            <Settings className="w-5 h-5 text-foreground" />
          </button>
        </div>
      </div>
    </nav>
  )
}