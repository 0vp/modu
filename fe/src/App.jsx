import { Navbar } from './components/Navbar'
import { Sidebar } from './components/Sidebar'
import { Canvas } from './components/Canvas'
import { FloatingBar } from './components/FloatingBar'
import { ThemeProvider } from './contexts/ThemeContext'

function App() {
  return (
    <ThemeProvider>
      <div className="h-screen flex flex-col bg-background overflow-hidden">
      <Navbar />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <Canvas />
      </div>

        <FloatingBar />
      </div>
    </ThemeProvider>
  )
}

export default App