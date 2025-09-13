import { createContext, useContext, useState } from 'react'

const DrawingContext = createContext()

export function DrawingProvider({ children }) {
  const [isDrawingMode, setIsDrawingMode] = useState(false)
  const [isEraserMode, setIsEraserMode] = useState(false)

  return (
    <DrawingContext.Provider value={{
      isDrawingMode,
      setIsDrawingMode,
      isEraserMode,
      setIsEraserMode
    }}>
      {children}
    </DrawingContext.Provider>
  )
}

export function useDrawing() {
  const context = useContext(DrawingContext)
  if (!context) {
    throw new Error('useDrawing must be used within a DrawingProvider')
  }
  return context
}