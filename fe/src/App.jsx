import { Navbar } from './components/Navbar'
import { Sidebar } from './components/Sidebar'
import { Canvas } from './components/Canvas'
import { FloatingBar } from './components/FloatingBar'

function App() {
  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">
      <Navbar />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <Canvas />
      </div>

      <FloatingBar />
    </div>
  )
}

export default App