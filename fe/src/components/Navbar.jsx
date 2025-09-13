import { Menu, Home, Play, Sun, Moon } from 'lucide-react'
import { cn } from '../lib/utils'
import { useTheme } from '../contexts/ThemeContext'

export function Navbar({ hasChanges, uploadedImage }) {
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
        {/* Status indicator */}
        {uploadedImage && (
          <div className={cn(
            "px-3 py-1.5 rounded-lg text-sm font-medium transition-all mr-2",
            hasChanges
              ? "bg-yellow-500/20 border border-yellow-500/50 text-yellow-700 dark:text-yellow-400"
              : "bg-green-500/20 border border-green-500/50 text-green-700 dark:text-green-400"
          )}>
            {hasChanges ? (
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
                Unsaved changes - Press Space to save
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                No changes
              </span>
            )}
          </div>
        )}

        <button className="px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md flex items-center gap-2 text-sm font-medium transition-colors">
          <Play className="w-4 h-4" />
          Temp View 3D
        </button>

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
      </div>
    </nav>
  )
}