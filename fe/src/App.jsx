import { useState } from 'react'
import { Navbar } from './components/Navbar'
import { Sidebar } from './components/Sidebar'
import { Canvas } from './components/Canvas'
import { FloatingBar } from './components/FloatingBar'
import { FurnitureDetailsModal } from './components/FurnitureDetailsModal'
import { ThemeProvider } from './contexts/ThemeContext'
import { DrawingProvider } from './contexts/DrawingContext'

function App() {
  const [selectedFurniture, setSelectedFurniture] = useState(null)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)

  const handleFurnitureClick = (furniture) => {
    setSelectedFurniture(furniture)
    setIsDetailsModalOpen(true)
  }

  return (
    <ThemeProvider>
      <DrawingProvider>
        <div className="h-screen flex flex-col bg-background overflow-hidden">
          <Navbar />

          <div className="flex-1 flex overflow-hidden">
            <Sidebar onFurnitureClick={handleFurnitureClick} />
            <Canvas onFurnitureClick={handleFurnitureClick} />
          </div>

          <FloatingBar />

          <FurnitureDetailsModal
            isOpen={isDetailsModalOpen}
            onClose={() => {
              setIsDetailsModalOpen(false)
              setSelectedFurniture(null)
            }}
            furniture={selectedFurniture}
          />
        </div>
      </DrawingProvider>
    </ThemeProvider>
  )
}

export default App