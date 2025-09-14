import { useState, useRef, useEffect } from 'react'
import { Upload, Image as ImageIcon, X } from 'lucide-react'
import { cn } from '../lib/utils'
import { useDrawing } from '../contexts/DrawingContext'

export function Canvas({ onFurnitureClick, hasChanges, setHasChanges, uploadedImage, setUploadedImage, onGenerateRequest }) {
    const [isDragging, setIsDragging] = useState(false)
    const [isDrawing, setIsDrawing] = useState(false)
    const [isErasing, setIsErasing] = useState(false)
    const [paths, setPaths] = useState([]) // Stores normalized paths (0-1 range)
    const [currentPath, setCurrentPath] = useState([])
    const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })
    const [furniturePins, setFurniturePins] = useState([]) // Stores furniture pins
    const [generatedPinIds, setGeneratedPinIds] = useState(new Set()) // Track which pins have been generated
    const [hoveredPin, setHoveredPin] = useState(null)
    const [draggingPin, setDraggingPin] = useState(null)
    const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 })
    const [isInteractingWithPin, setIsInteractingWithPin] = useState(false)
    const [isGenerating, setIsGenerating] = useState(false) // Track AI generation state
    const fileInputRef = useRef(null)
    const canvasRef = useRef(null)
    const containerRef = useRef(null)
    const imageRef = useRef(null)
    const generationCallbackRef = useRef(null)
    const { isDrawingMode, isEraserMode } = useDrawing()

    // Handle Space key press
    useEffect(() => {
        const handleKeyPress = async (e) => {
            // Don't trigger if typing in an input or textarea
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return
            }

            // Debug logging
            if (e.key === ' ') {
                console.log('Spacebar pressed - checking conditions:')
                console.log('- uploadedImage:', !!uploadedImage)
                console.log('- imageRef.current:', !!imageRef.current)
                console.log('- isGenerating:', isGenerating)
                console.log('- hasChanges:', hasChanges)
                console.log('- furniturePins.length:', furniturePins.length)
                console.log('- generatedPinIds.size:', generatedPinIds.size)
            }

            // Allow spacebar if there's an image and either hasChanges OR there are furniture pins
            if (e.key === ' ' && uploadedImage && imageRef.current && !isGenerating && (hasChanges || furniturePins.length > 0)) {
                e.preventDefault() // Prevent page scroll
                console.log('Conditions met - Saving canvas images...')
                setIsGenerating(true) // Start generation process

                try {
                    // Define ungeneratedPins at the beginning
                    const ungeneratedPins = furniturePins.filter(pin => !generatedPinIds.has(pin.pinId))

                    // Create a temporary canvas for the annotated image
                    const tempCanvas = document.createElement('canvas')
                    const tempCtx = tempCanvas.getContext('2d')

                    // Set canvas size to match the actual image dimensions
                    tempCanvas.width = imageRef.current.naturalWidth
                    tempCanvas.height = imageRef.current.naturalHeight

                    // Draw the original image
                    tempCtx.drawImage(imageRef.current, 0, 0)

                    // Draw the paths (drawings) on top
                    if (paths.length > 0) {
                        tempCtx.globalAlpha = 1  // Full opacity for better visibility
                        tempCtx.strokeStyle = '#FF0000'  // Red color for hand-drawn annotations
                        tempCtx.lineWidth = Math.max(8, Math.min(16, tempCanvas.width / 50))  // Slightly thinner for cleaner look
                        tempCtx.lineCap = 'round'
                        tempCtx.lineJoin = 'round'

                        paths.forEach(path => {
                            if (path.length > 0) {
                                tempCtx.beginPath()
                                path.forEach((point, index) => {
                                    const x = point.x * tempCanvas.width
                                    const y = point.y * tempCanvas.height
                                    if (index === 0) {
                                        tempCtx.moveTo(x, y)
                                    } else {
                                        tempCtx.lineTo(x, y)
                                    }
                                })
                                tempCtx.stroke()
                            }
                        })
                    }

                    // Add furniture labels vertically (instead of dots) - only for ungenerated pins
                    if (ungeneratedPins.length > 0) {
                        tempCtx.globalAlpha = 1
                        // Bigger, bold monospace font for better visibility
                        const fontSize = Math.max(20, Math.min(30, tempCanvas.width / 60))  // Larger size
                        tempCtx.font = `bold ${fontSize}px monospace`  // Bold for better visibility
                        tempCtx.textAlign = 'center'
                        tempCtx.textBaseline = 'middle'

                        // Constants for squiggly circle sizing
                        const CIRCLE_HEIGHT_BOOST = 1.5   // Extra height multiplier for better visibility

                        /* COMMENTED OUT: No longer needed without labels
                        // Helper function to get contrast color
                        const getContrastColor = (hexColor) => {
                          const r = parseInt(hexColor.substr(0, 2), 16)
                          const g = parseInt(hexColor.substr(2, 2), 16)
                          const b = parseInt(hexColor.substr(4, 2), 16)
                          const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
                          return luminance > 0.5 ? '#000000' : '#FFFFFF'
                        }
                        */

                        // Helper function to draw a hand-drawn squiggly circle
                        const drawSquigglyCircle = (ctx, centerX, centerY, radiusX, radiusY, color) => {
                            ctx.strokeStyle = color  // Use the provided color
                            ctx.lineWidth = Math.max(8, Math.min(16, tempCanvas.width / 100))  // Thicker adaptive line width
                            ctx.lineCap = 'round'
                            ctx.lineJoin = 'round'
                            ctx.setLineDash([])  // Solid line

                            ctx.beginPath()

                            // Generate points around an ellipse with random variations
                            const numPoints = 20 + Math.floor(Math.random() * 10)  // 20-30 points for organic look
                            const angleStep = (Math.PI * 2) / numPoints

                            // Store points to ensure we close the shape properly
                            const points = []

                            for (let i = 0; i <= numPoints; i++) {
                                const angle = i * angleStep

                                // Add random variations to make it look hand-drawn
                                const wobbleRadius = 0.05 + Math.random() * 0.15  // 5-20% variation
                                const wobbleAngle = Math.random() * 0.2 - 0.1  // Small angle variation

                                // Calculate base ellipse point
                                let rx = radiusX * (1 + (Math.random() - 0.5) * wobbleRadius)
                                let ry = radiusY * (1 + (Math.random() - 0.5) * wobbleRadius)

                                // Add slight waviness
                                const waveAmplitude = 0.03
                                rx += radiusX * waveAmplitude * Math.sin(angle * 3)
                                ry += radiusY * waveAmplitude * Math.cos(angle * 3)

                                const x = centerX + rx * Math.cos(angle + wobbleAngle)
                                const y = centerY + ry * Math.sin(angle + wobbleAngle)

                                if (i === 0) {
                                    ctx.moveTo(x, y)
                                    points.push({ x, y })
                                } else if (i === numPoints) {
                                    // Close the shape by connecting to the first point with slight offset for organic look
                                    const firstPoint = points[0]
                                    ctx.lineTo(firstPoint.x + (Math.random() - 0.5) * 2, firstPoint.y + (Math.random() - 0.5) * 2)
                                } else {
                                    // Add slight curve between points for more organic look
                                    const prevX = centerX + radiusX * Math.cos(angle - angleStep / 2 + wobbleAngle)
                                    const prevY = centerY + radiusY * Math.sin(angle - angleStep / 2 + wobbleAngle)
                                    ctx.quadraticCurveTo(prevX, prevY, x, y)
                                    points.push({ x, y })
                                }
                            }

                            ctx.stroke()
                        }

                        ungeneratedPins.forEach(pin => {
                            const x = pin.x * tempCanvas.width
                            const y = pin.y * tempCanvas.height
                            // Use the 6-char color ID
                            // Check if ID exists and is a valid 6-char hex color
                            const isValidColorId = pin.id && typeof pin.id === 'string' && pin.id.length === 6 && /^[0-9a-fA-F]{6}$/.test(pin.id)
                            const colorId = isValidColorId ? pin.id : 'cccccc'  // Default to light gray

                            // Draw squiggly circle at pin location
                            // Using a reasonable fixed size for the circles since we don't have label dimensions
                            const circleRadiusX = 80  // Fixed reasonable width
                            const circleRadiusY = 80 * CIRCLE_HEIGHT_BOOST  // Apply height boost
                            const circleCenterX = x
                            const circleCenterY = y

                            // Use the same color as the product ID
                            const circleColor = `#${colorId}`
                            drawSquigglyCircle(tempCtx, circleCenterX, circleCenterY, circleRadiusX, circleRadiusY, circleColor)

                            // No longer drawing product images inside circles

                            /* COMMENTED OUT: Label generation
                            const label = `#${colorId.toUpperCase()}`
              
                            // Draw colored background with padding
                            const textMetrics = tempCtx.measureText(label)
                            const padding = 8  // Padding for better visibility
              
                            // Position label to the right of the pin
                            const labelX = x + 20  // Offset to the right of pin
                            const labelY = y  // Same vertical position as pin
              
                            // Calculate label box dimensions
                            const boxWidth = textMetrics.width + padding * 2
                            const boxHeight = fontSize + padding * 2
              
                            // Background rectangle with drop shadow effect
                            // Draw shadow first
                            tempCtx.fillStyle = 'rgba(0, 0, 0, 0.3)'  // Semi-transparent black shadow
                            tempCtx.fillRect(
                              labelX - padding + 3,
                              labelY - fontSize/2 - padding + 3,
                              boxWidth,
                              boxHeight
                            )
              
                            // Then draw colored background
                            tempCtx.fillStyle = `#${colorId}`  // Use product color
                            tempCtx.fillRect(
                              labelX - padding,
                              labelY - fontSize/2 - padding,
                              boxWidth,
                              boxHeight
                            )
              
                            // Draw border for definition
                            tempCtx.strokeStyle = 'rgba(0, 0, 0, 0.3)'  // Subtle black border
                            tempCtx.lineWidth = 1  // Thin border
                            tempCtx.strokeRect(
                              labelX - padding,
                              labelY - fontSize/2 - padding,
                              boxWidth,
                              boxHeight
                            )
              
                            // Draw text with contrasting color
                            const textColor = getContrastColor(colorId)
                            tempCtx.fillStyle = textColor
                            tempCtx.textAlign = 'left'  // Align text to left
                            tempCtx.fillText(label, labelX, labelY)
                            */
                        })
                    }

                    // Convert canvases to base64
                    const originalImage = uploadedImage  // Already base64
                    const annotatedImage = tempCanvas.toDataURL('image/png')

                    // Collect collages with their center points
                    const collages = []

                    // Log for debugging
                    console.log('Total pins:', furniturePins.length)
                    console.log('Generated pins:', generatedPinIds.size)
                    console.log('Ungenerated pins:', ungeneratedPins.length)

                    ungeneratedPins.forEach(pin => {
                        // Convert normalized coordinates to pixel coordinates
                        const centerX = pin.x * tempCanvas.width
                        const centerY = pin.y * tempCanvas.height

                        // Add to collages array if it has a collage_path
                        if (pin.collage_path) {
                            collages.push({
                                path: pin.collage_path,
                                x: centerX,
                                y: centerY
                            })
                        }
                    })

                    console.log('Sending collages to backend:', collages)

                    // Send to backend
                    const response = await fetch('http://localhost:5000/save_canvas', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            original_image: originalImage,
                            annotated_image: annotatedImage,
                            collages: collages  // Array of {path, x, y} objects
                        })
                    })

                    const result = await response.json()

                    if (result.success) {
                        console.log('Images saved successfully:', result)

                        // Only proceed with generation if there are furniture pins
                        if (furniturePins.length === 0) {
                            console.log('No furniture pins to generate with')
                            setIsGenerating(false)
                            setHasChanges(false)
                            return
                        }

                        // If all pins are already generated, log but still proceed
                        if (ungeneratedPins.length === 0) {
                            console.log('All pins already generated, proceeding anyway for potential re-generation')
                        }

                        // Generate the prompt for image replacement task
                        const uniquePins = {}  // Track unique products by ID
                        ungeneratedPins.forEach(pin => {
                            const isValidColorId = pin.id && typeof pin.id === 'string' && pin.id.length === 6 && /^[0-9a-fA-F]{6}$/.test(pin.id)
                            const productId = isValidColorId ? pin.id : 'UNKNOWN'
                            if (productId !== 'UNKNOWN' && !uniquePins[productId]) {
                                uniquePins[productId] = pin
                            }
                        })

                        // Build prompt structure exactly as specified
                        const prompt = {
                            task: "interior-design-furniture-placement",
                            "personality": "You are an interior design engineer who combines technical precision with creative vision to create spaces that are both functional and aesthetically pleasing. You integrate engineering principles with modern interior design trends, ensuring every recommendation balances safety, practicality, and sustainability while enhancing visual harmony and user experience.",
                            inputs: {
                                "Image 1": "Base image (empty room / existing layout) – to be used as foundation with exact angle, lighting, and framing.",
                                "Image 2": "Annotated version of Image 1 with colored circles and product collages overlayed at circle centers – shows which products to place and general placement zones.",
                                "product_images": "Each product image corresponding to collages in Image 2 – full sized, showing how product looks and how it functions in real world."
                            },
                            instructions: "Use Image 1 as the base. From Image 2, extract each product collage and place that product into Image 1 at the center of the corresponding colored circle. Match perspective, lighting, scale (pitch/yaw/roll, x/y/z position) to the room’s camera and vanishing points. If product overlaps existing furniture in a way that makes it physically impossible or unnatural, either remove the conflicting furniture or choose a better placement. If part of product would fall outside frame, it’s acceptable—show as much as fits naturally. Decide whether to replace or add each product depending on spatial flow and visual harmony. Remove all annotations (circles, collages) in the final rendered output so only the room with integrated furniture remains.",
                            rules: [
                                "Use image 0 (base) as foundation; image 1 shows placement guides with product collages.",
                                "Ensure that the output image is exactly as if a camera took it, no extra titles, borders, overlayed images, etc. The output image should be exactly the same as the annotated image, but with the products placed in the correct positions.",
                                "Furniture collages at circle centers show exact products to place—extract and use those full-sized product images.",
                                "Colored circles mark placement zones—replace existing furniture or fill empty space in those zones.",
                                "Match room’s perspective, scale, lighting, and orientation; ignore collage sizes or color of circles when placing products.",
                                "Remove ALL annotations (circles, collages, guides) from final image—only show the final room with furniture integrated.",
                                "Ensure photorealistic integration: proper shadows, reflections, material texture, lighting consistency.",
                                "Ensure all add furniture are exactly like the reference furniture, product, artworks."
                            ],
                            images: [
                                {
                                    index: 0,
                                    role: "base",
                                    path: result.original_path
                                },
                                {
                                    index: 1,
                                    role: "annotated-with-collages",
                                    path: result.annotated_path
                                }
                            ]
                        }

                        // Add product images and details (starting from index 2)
                        let imageIndex = 2
                        for (const [productId, pin] of Object.entries(uniquePins)) {
                            // Add to images array with essential product info
                            prompt.images.push({
                                index: imageIndex,
                                role: "product",
                                color_id: `#${productId.toUpperCase()}`,
                                name: pin.name || pin.title || "Unknown Product",
                                // path: pin.collage_path || null,
                                dimensions: pin.dimensions || null,
                                color: pin.color || null,
                                material: pin.material || null
                            })

                            imageIndex++
                        }

                        // Convert structured prompt to JSON string
                        const promptText = JSON.stringify(prompt);

                        // Log the prompt with clear delimiters for easy copying
                        console.log('===== PROMPT START =====');
                        console.log(promptText);
                        console.log('===== PROMPT END =====');
                        console.log(`Prompt size: ${promptText.length} characters`);

                        // Collect all image paths for the generation
                        const imagePaths = [];

                        // Add original and annotated images
                        if (result.original_path) {
                            imagePaths.push(result.original_path);
                        }
                        if (result.annotated_path) {
                            imagePaths.push(result.annotated_path);
                        }

                        // Add product collage images
                        Object.values(uniquePins).forEach(pin => {
                            if (pin.collage_path) {
                                imagePaths.push(pin.collage_path);
                            }
                        });

                        console.log('Starting AI generation with images:', imagePaths);

                        // Prepare request body
                        const requestBody = {
                            prompt: promptText,
                            images: imagePaths,
                            num_images: 1,
                            output_format: 'jpeg'
                        };

                        const requestBodyStr = JSON.stringify(requestBody);

                        // Call the generate endpoint
                        try {
                            const generateResponse = await fetch('http://localhost:5000/generate', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: requestBodyStr
                            });

                            const generateResult = await generateResponse.json();

                            if (generateResult.success && generateResult.images && generateResult.images.length > 0) {
                                console.log('Generation successful:', generateResult);

                                // Get the first generated image
                                const generatedImageUrl = generateResult.images[0].url;

                                // Load the image with CORS enabled to avoid tainting the canvas
                                const img = new Image();
                                img.crossOrigin = 'anonymous';  // Enable CORS

                                img.onload = () => {
                                    // Convert to base64 to avoid CORS issues
                                    const canvas = document.createElement('canvas');
                                    canvas.width = img.width;
                                    canvas.height = img.height;
                                    const ctx = canvas.getContext('2d');
                                    ctx.drawImage(img, 0, 0);

                                    try {
                                        const base64Image = canvas.toDataURL('image/jpeg');
                                        // Set the base64 image instead of the URL
                                        setUploadedImage(base64Image);
                                    } catch (e) {
                                        console.error('Failed to convert image to base64:', e);
                                        // Fallback: use the URL directly (will have CORS issues on next save)
                                        setUploadedImage(generatedImageUrl);
                                    }
                                };

                                img.onerror = () => {
                                    console.error('Failed to load generated image');
                                    // Fallback: try to use the URL directly
                                    setUploadedImage(generatedImageUrl);
                                };

                                img.src = generatedImageUrl;

                                // Mark ungenerated pins as generated instead of clearing them
                                const newGeneratedIds = new Set(generatedPinIds);
                                ungeneratedPins.forEach(pin => {
                                    newGeneratedIds.add(pin.pinId);
                                });
                                setGeneratedPinIds(newGeneratedIds);

                                // Clear drawings for a fresh start
                                setPaths([]);
                                setCurrentPath([]);

                                // Clear the drawing canvas
                                if (canvasRef.current) {
                                    const ctx = canvasRef.current.getContext('2d');
                                    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                                }

                                console.log('Canvas updated with generated image');
                            } else {
                                console.error('Generation failed:', generateResult.error || 'Unknown error');
                                alert(`Image generation failed: ${generateResult.error || 'Unknown error'}`);
                            }
                        } catch (genError) {
                            console.error('Error calling generate endpoint:', genError);
                            alert('Failed to generate image. Please try again.');
                        } finally {
                            setIsGenerating(false);
                        }

                        // Don't set hasChanges to false here - only on send button
                    } else {
                        console.error('Failed to save images:', result.error)
                        setIsGenerating(false)
                    }
                } catch (error) {
                    console.error('Error saving canvas images:', error)
                    setIsGenerating(false)
                }
            }
        }

        window.addEventListener('keydown', handleKeyPress)
        return () => window.removeEventListener('keydown', handleKeyPress)
    }, [hasChanges, paths, furniturePins, uploadedImage, setHasChanges, isGenerating, setUploadedImage, generatedPinIds])

    // Function to generate with custom prompt (called from FloatingBar)
    const handleGenerateWithPrompt = async (promptText) => {
        if (!uploadedImage || !imageRef.current || isGenerating) {
            console.log('Cannot generate: missing image or already generating')
            console.log('uploadedImage:', !!uploadedImage, 'imageRef:', !!imageRef.current, 'isGenerating:', isGenerating)
            return
        }

        console.log('Generating with custom prompt:', promptText)
        setIsGenerating(true)

        try {
            // Create a temporary canvas for the annotated image (without furniture pins)
            const tempCanvas = document.createElement('canvas')
            const tempCtx = tempCanvas.getContext('2d')

            // Set canvas size to match the actual image dimensions
            tempCanvas.width = imageRef.current.naturalWidth
            tempCanvas.height = imageRef.current.naturalHeight

            // Draw the original image
            tempCtx.drawImage(imageRef.current, 0, 0)

            // Draw the paths (drawings) on top
            if (paths.length > 0) {
                tempCtx.globalAlpha = 1  // Full opacity for better visibility
                tempCtx.strokeStyle = '#FF0000'  // Red color for hand-drawn annotations
                tempCtx.lineWidth = Math.max(8, Math.min(16, tempCanvas.width / 50))  // Slightly thinner for cleaner look
                tempCtx.lineCap = 'round'
                tempCtx.lineJoin = 'round'

                paths.forEach(path => {
                    if (path.length > 0) {
                        tempCtx.beginPath()
                        path.forEach((point, index) => {
                            const x = point.x * tempCanvas.width
                            const y = point.y * tempCanvas.height
                            if (index === 0) {
                                tempCtx.moveTo(x, y)
                            } else {
                                tempCtx.lineTo(x, y)
                            }
                        })
                        tempCtx.stroke()
                    }
                })
            }

            // Get the annotated image as base64 (without furniture pins)
            const annotatedImage = tempCanvas.toDataURL('image/jpeg')

            // Save the annotated image to backend
            const saveResponse = await fetch('http://localhost:5000/save_canvas', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    original_image: uploadedImage,
                    annotated_image: annotatedImage,
                    furniture_pins: [] // No furniture pins for this use case
                })
            })

            const result = await saveResponse.json()

            if (result.success) {
                // Mark as saved (triggers navbar to show "No changes")
                setHasChanges(false)

                // Build simpler prompt structure for custom prompt
                const prompt = {
                    task: "interior-design-custom",
                    personality: "You are an interior design engineer who combines technical precision with creative vision to create spaces that are both functional and aesthetically pleasing.",
                    inputs: {
                        "Image 1": "Base image (room) - to be used as foundation",
                        "Image 2": "Annotated version with hand-drawn sketches showing desired changes"
                    },
                    instructions: promptText, // Use the custom prompt from user
                    rules: [
                        "Use Image 1 as foundation and Image 2 to understand desired changes",
                        "Hand-drawn red annotations indicate areas to modify or enhance or delete",
                        "Maintain room's perspective, scale, lighting, and orientation",
                        "Ensure photorealistic integration with proper shadows and reflections",
                        "Output should look like a real photograph without any overlays or annotations"
                    ],
                    images: [
                        {
                            index: 0,
                            role: "base",
                            path: result.original_path
                        },
                        {
                            index: 1,
                            role: "annotated",
                            path: result.annotated_path
                        }
                    ]
                }

                const promptStr = JSON.stringify(prompt)
                console.log('Custom prompt size:', promptStr.length, 'characters')

                // Call the generate endpoint
                const generateResponse = await fetch('http://localhost:5000/generate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        prompt: promptStr,
                        images: [result.original_path, result.annotated_path],
                        num_images: 1,
                        output_format: 'jpeg'
                    })
                })

                const generateResult = await generateResponse.json()

                if (generateResult.success && generateResult.images && generateResult.images.length > 0) {
                    console.log('Generation successful:', generateResult)

                    // Get the first generated image
                    const generatedImageUrl = generateResult.images[0].url

                    // Load the image with CORS enabled
                    const img = new Image()
                    img.crossOrigin = 'anonymous'

                    img.onload = () => {
                        // Convert to base64 to avoid CORS issues
                        const canvas = document.createElement('canvas')
                        canvas.width = img.width
                        canvas.height = img.height
                        const ctx = canvas.getContext('2d')
                        ctx.drawImage(img, 0, 0)

                        try {
                            const base64Image = canvas.toDataURL('image/jpeg')
                            setUploadedImage(base64Image)
                        } catch (e) {
                            console.error('Failed to convert image to base64:', e)
                            setUploadedImage(generatedImageUrl)
                        }
                    }

                    img.onerror = () => {
                        console.error('Failed to load generated image')
                        setUploadedImage(generatedImageUrl)
                    }

                    img.src = generatedImageUrl

                    // Keep furniture pins but clear drawings for a fresh start
                    // Note: Send button doesn't use furniture pins, so we don't mark anything as generated
                    setPaths([])
                    setCurrentPath([])

                    // Clear the drawing canvas
                    if (canvasRef.current) {
                        const ctx = canvasRef.current.getContext('2d')
                        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
                    }

                    setHasChanges(false)
                    console.log('Canvas updated with generated image')
                } else {
                    console.error('Generation failed:', generateResult.error || 'Unknown error')
                    alert(`Image generation failed: ${generateResult.error || 'Unknown error'}`)
                }
            } else {
                console.error('Failed to save images:', result.error)
                alert('Failed to prepare images for generation')
            }
        } catch (error) {
            console.error('Error during generation:', error)
            alert('Failed to generate image. Please try again.')
        } finally {
            setIsGenerating(false)
        }
    }

    // Store the function in the ref for parent access
    useEffect(() => {
        generationCallbackRef.current = handleGenerateWithPrompt
    })

    // Expose the generation function through the callback only once
    useEffect(() => {
        console.log('Canvas: Setting up generation function, onGenerateRequest:', typeof onGenerateRequest, onGenerateRequest)
        if (onGenerateRequest) {
            // Pass a wrapper function that calls the current ref
            const wrapper = (promptText) => {
                console.log('Canvas: Wrapper called with:', promptText)
                if (generationCallbackRef.current) {
                    generationCallbackRef.current(promptText)
                } else {
                    console.log('Canvas: generationCallbackRef.current is null')
                }
            }
            console.log('Canvas: Calling onGenerateRequest with wrapper function')
            // Use a callback to set the function to avoid React treating it as a state updater
            onGenerateRequest(() => wrapper)
            console.log('Canvas: onGenerateRequest called successfully')
        } else {
            console.log('Canvas: onGenerateRequest is not provided')
        }
    }, [onGenerateRequest]) // Only depend on onGenerateRequest

    const handleDragEnter = (e) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(true)
    }

    const handleDragLeave = (e) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(false)
    }

    const handleDragOver = (e) => {
        e.preventDefault()
        e.stopPropagation()
    }

    const handleDrop = (e) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(false)

        // Check if it's a furniture item being dropped
        const furnitureData = e.dataTransfer.getData('furniture')
        if (furnitureData) {
            const furniture = JSON.parse(furnitureData)

            // Get drop position relative to the image
            if (imageRef.current && containerRef.current) {
                const imgRect = imageRef.current.getBoundingClientRect()

                // Calculate position relative to the image
                const x = e.clientX - imgRect.left
                const y = e.clientY - imgRect.top

                // Normalize coordinates (0-1 range)
                const normalizedX = x / imgRect.width
                const normalizedY = y / imgRect.height

                // Only add pin if dropped on the image
                if (normalizedX >= 0 && normalizedX <= 1 && normalizedY >= 0 && normalizedY <= 1) {
                    const newPin = {
                        ...furniture,
                        pinId: `pin-${Date.now()}`,  // Keep a separate pinId for React keys
                        // Keep the original furniture.id (6-char color hash from backend)
                        x: normalizedX,
                        y: normalizedY
                    }
                    setFurniturePins([...furniturePins, newPin])
                    setHasChanges(true) // Mark as changed when pin is added
                }
            }
            return
        }

        // Handle regular file drops
        const files = e.dataTransfer.files
        if (files && files[0]) {
            handleFile(files[0])
        }
    }

    const handleFile = (file) => {
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader()
            reader.onload = (e) => {
                setUploadedImage(e.target.result)
            }
            reader.readAsDataURL(file)
        }
    }

    const handleFileInput = (e) => {
        const file = e.target.files[0]
        if (file) {
            handleFile(file)
        }
    }

    const handleClick = () => {
        if (!isDrawingMode && !isEraserMode) {
            fileInputRef.current?.click()
        }
    }

    // Handle canvas resizing and maintain aspect ratio
    useEffect(() => {
        const resizeCanvas = () => {
            if (canvasRef.current && imageRef.current && uploadedImage) {
                const container = containerRef.current.getBoundingClientRect()
                const img = imageRef.current

                // Calculate the displayed image dimensions (maintaining aspect ratio)
                const imgAspect = img.naturalWidth / img.naturalHeight
                const containerAspect = container.width / container.height

                let displayWidth, displayHeight;
                if (imgAspect > containerAspect) {
                    // Image is wider
                    displayWidth = container.width * 0.9 // 90% to account for padding
                    displayHeight = displayWidth / imgAspect
                } else {
                    // Image is taller
                    displayHeight = container.height * 0.9
                    displayWidth = displayHeight * imgAspect
                }

                // Set canvas size to match displayed image
                canvasRef.current.width = displayWidth
                canvasRef.current.height = displayHeight
                setCanvasSize({ width: displayWidth, height: displayHeight })

                // Center the canvas
                const leftOffset = (container.width - displayWidth) / 2
                const topOffset = (container.height - displayHeight) / 2
                canvasRef.current.style.left = `${leftOffset}px`
                canvasRef.current.style.top = `${topOffset}px`

                // Redraw all paths with new dimensions
                redrawCanvas([...paths, ...(isDrawing ? [currentPath] : [])])
            }
        }

        // Use ResizeObserver to detect container size changes (including sidebar toggle)
        let resizeObserver;
        if (containerRef.current && uploadedImage) {
            resizeObserver = new ResizeObserver(resizeCanvas)
            resizeObserver.observe(containerRef.current)
        }

        resizeCanvas()
        window.addEventListener('resize', resizeCanvas)

        return () => {
            window.removeEventListener('resize', resizeCanvas)
            if (resizeObserver) {
                resizeObserver.disconnect()
            }
        }
    }, [uploadedImage, paths, currentPath, isDrawing])

    // Eraser function to split paths where the eraser touches
    const eraseAtPoint = (normalizedX, normalizedY) => {
        const eraseRadius = 0.02 // 2% of canvas size for eraser radius

        setPaths(prevPaths => {
            const newPaths = []

            prevPaths.forEach(path => {
                let currentSegment = []
                let lastPointWasErased = false

                for (let i = 0; i < path.length; i++) {
                    const point = path[i]
                    const distance = Math.sqrt(
                        Math.pow(point.x - normalizedX, 2) +
                        Math.pow(point.y - normalizedY, 2)
                    )

                    if (distance > eraseRadius) {
                        // Point is outside eraser radius
                        if (lastPointWasErased && currentSegment.length > 0) {
                            // We were erasing, but now we're not - save the previous segment if it has points
                            if (currentSegment.length > 1) {
                                newPaths.push(currentSegment)
                            }
                            currentSegment = []
                        }
                        currentSegment.push(point)
                        lastPointWasErased = false
                    } else {
                        // Point is inside eraser radius - this creates a break in the path
                        lastPointWasErased = true
                    }
                }

                // Add any remaining segment
                if (currentSegment.length > 1) {
                    newPaths.push(currentSegment)
                }
            })

            return newPaths
        })

        // Mark as changed when erasing
        if (paths.length > 0) {
            setHasChanges(true)
        }

        // Trigger redraw
        redrawCanvas(paths)
    }

    const startDrawing = (e) => {
        if ((!isDrawingMode && !isEraserMode) || !canvasRef.current || isInteractingWithPin) return

        const canvas = canvasRef.current
        const rect = canvas.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top

        // Normalize coordinates to 0-1 range
        const normalizedX = x / canvas.width
        const normalizedY = y / canvas.height

        if (isEraserMode) {
            // Start erasing
            setIsErasing(true)
            eraseAtPoint(normalizedX, normalizedY)
        } else {
            // Start drawing
            setCurrentPath([{ x: normalizedX, y: normalizedY }])
            setIsDrawing(true)
        }
    }

    const redrawCanvas = (allPaths) => {
        if (!canvasRef.current) return

        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')

        // Clear the entire canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        // Redraw all paths
        ctx.globalAlpha = 0.8
        ctx.strokeStyle = '#B854F6' // Matches theme primary color: hsl(270 95% 65%)
        // Scale line width based on canvas size
        ctx.lineWidth = Math.max(12, Math.min(24, canvas.width / 40))
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'

        allPaths.forEach(path => {
            if (path.length > 0) {
                ctx.beginPath()
                path.forEach((point, index) => {
                    // Convert normalized coordinates back to canvas coordinates
                    const x = point.x * canvas.width
                    const y = point.y * canvas.height

                    if (index === 0) {
                        ctx.moveTo(x, y)
                    } else {
                        ctx.lineTo(x, y)
                    }
                })
                ctx.stroke()
            }
        })
    }

    const draw = (e) => {
        if ((!isDrawing && !isErasing) || !canvasRef.current) return

        if (isErasing && isEraserMode) {
            // Continue erasing
            const canvas = canvasRef.current
            const rect = canvas.getBoundingClientRect()
            const x = e.clientX - rect.left
            const y = e.clientY - rect.top
            const normalizedX = x / canvas.width
            const normalizedY = y / canvas.height
            eraseAtPoint(normalizedX, normalizedY)
            return
        }

        if (!isDrawing || !isDrawingMode) return

        const canvas = canvasRef.current
        const rect = canvas.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top

        // Normalize coordinates to 0-1 range
        const normalizedX = x / canvas.width
        const normalizedY = y / canvas.height

        const newPath = [...currentPath, { x: normalizedX, y: normalizedY }]
        setCurrentPath(newPath)

        // Redraw everything including the current path
        redrawCanvas([...paths, newPath])
    }

    const stopDrawing = () => {
        if (isDrawing && currentPath.length > 0) {
            // Save the completed path
            setPaths([...paths, currentPath])
            setCurrentPath([])
            setHasChanges(true) // Mark as changed when drawing is added
        }
        setIsDrawing(false)
        setIsErasing(false)
    }

    const clearDrawing = () => {
        if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d')
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
            if (paths.length > 0) {
                setHasChanges(true) // Mark as changed when drawings are cleared
            }
            setPaths([])
            setCurrentPath([])
        }
    }

    // Handle pin dragging
    const handlePinDragStart = (e, pin) => {
        e.stopPropagation()
        setIsInteractingWithPin(true)
        const pinIdentifier = pin.pinId || pin.id
        setDraggingPin(pinIdentifier)
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('pinId', pinIdentifier)

        // Create a transparent drag image to hide the default ghost
        const dragImage = new Image()
        dragImage.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs='
        e.dataTransfer.setDragImage(dragImage, 0, 0)
    }

    const handlePinDragOver = (e) => {
        if (draggingPin) {
            e.preventDefault()
            e.dataTransfer.dropEffect = 'move'

            // Update drag position for visual feedback
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect()
                setDragPosition({
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top
                })
            }
        }
    }

    const handlePinDrop = (e) => {
        e.preventDefault()
        const pinId = e.dataTransfer.getData('pinId')

        if (pinId && imageRef.current) {
            const imgRect = imageRef.current.getBoundingClientRect()
            const x = e.clientX - imgRect.left
            const y = e.clientY - imgRect.top

            const normalizedX = x / imgRect.width
            const normalizedY = y / imgRect.height

            // Update pin position if dropped on image
            if (normalizedX >= 0 && normalizedX <= 1 && normalizedY >= 0 && normalizedY <= 1) {
                setFurniturePins(pins => {
                    const updatedPins = pins.map(pin => {
                        const pinIdentifier = pin.pinId || pin.id
                        return pinIdentifier === pinId
                            ? { ...pin, x: normalizedX, y: normalizedY }
                            : pin
                    })
                    setHasChanges(true) // Mark as changed when pin is moved
                    return updatedPins
                })
            }
        }
        setDraggingPin(null)
        setDragPosition({ x: 0, y: 0 })
        setIsInteractingWithPin(false)
    }

    // Delete pin
    const deletePin = (pinId) => {
        setFurniturePins(pins => pins.filter(pin => {
            const pinIdentifier = pin.pinId || pin.id
            return pinIdentifier !== pinId
        }))
        setHasChanges(true) // Mark as changed when pin is deleted
    }

    return (
        <div className="flex-1 bg-secondary/50 dark:bg-background overflow-hidden relative p-4">
            <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>

            <div
                ref={containerRef}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={(e) => {
                    handleDragOver(e)
                    handlePinDragOver(e)
                }}
                onDrop={(e) => {
                    // Check if it's a pin being moved
                    if (e.dataTransfer.getData('pinId')) {
                        handlePinDrop(e)
                    } else {
                        handleDrop(e)
                    }
                }}
                onClick={handleClick}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                className={cn(
                    "relative w-full h-full border-2 border-dashed rounded-lg transition-all flex items-center justify-center",
                    isDrawingMode
                        ? "cursor-crosshair"
                        : isEraserMode
                            ? "cursor-grab"
                            : "cursor-pointer",
                    isDragging
                        ? "border-primary bg-primary/10"
                        : "border-border bg-card dark:bg-card/50 hover:border-primary/50 hover:bg-secondary"
                )}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileInput}
                    className="hidden"
                />

                {uploadedImage ? (
                    <div className="w-full h-full flex items-center justify-center p-8 relative">
                        <img
                            ref={imageRef}
                            src={uploadedImage}
                            alt="Uploaded"
                            crossOrigin={uploadedImage.startsWith('http') ? 'anonymous' : undefined}
                            className="max-w-full max-h-full object-contain rounded-lg shadow-md"
                            onLoad={() => {
                                // Trigger canvas resize when image loads
                                if (canvasRef.current && imageRef.current) {
                                    const container = containerRef.current.getBoundingClientRect()
                                    const img = imageRef.current

                                    const imgAspect = img.naturalWidth / img.naturalHeight
                                    const containerAspect = container.width / container.height

                                    let displayWidth, displayHeight;
                                    if (imgAspect > containerAspect) {
                                        displayWidth = container.width * 0.9
                                        displayHeight = displayWidth / imgAspect
                                    } else {
                                        displayHeight = container.height * 0.9
                                        displayWidth = displayHeight * imgAspect
                                    }

                                    canvasRef.current.width = displayWidth
                                    canvasRef.current.height = displayHeight
                                    setCanvasSize({ width: displayWidth, height: displayHeight })

                                    const leftOffset = (container.width - displayWidth) / 2
                                    const topOffset = (container.height - displayHeight) / 2
                                    canvasRef.current.style.left = `${leftOffset}px`
                                    canvasRef.current.style.top = `${topOffset}px`
                                }
                            }}
                        />
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <div className="mb-4 p-4 bg-secondary/50 rounded-full">
                            {isDragging ? (
                                <Upload className="w-8 h-8 text-primary" />
                            ) : (
                                <ImageIcon className="w-8 h-8" />
                            )}
                        </div>

                        <p className="text-lg font-medium mb-2">
                            {isDragging ? "Drop your image here" : "Drag & drop an image"}
                        </p>

                        <p className="text-sm text-muted-foreground/70 mb-4">
                            or click to browse
                        </p>

                        <div className="flex items-center gap-4 text-xs text-muted-foreground/60">
                            <span>PNG</span>
                            <span>•</span>
                            <span>JPG</span>
                            <span>•</span>
                            <span>SVG</span>
                            <span>•</span>
                            <span>GIF</span>
                        </div>
                    </div>
                )}

                {/* Loading overlay during generation */}
                {isGenerating && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50 rounded-lg">
                        <div className="bg-card p-6 rounded-lg shadow-xl flex flex-col items-center gap-4">
                            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-lg font-medium text-foreground">Designing your space...</p>
                            <p className="text-sm text-muted-foreground">This may take a few moments</p>
                        </div>
                    </div>
                )}


                {uploadedImage && (
                    <canvas
                        ref={canvasRef}
                        className="absolute pointer-events-none"
                        style={{
                            pointerEvents: (isDrawingMode || isEraserMode) ? 'auto' : 'none',
                            position: 'absolute',
                            width: 'auto',
                            height: 'auto'
                        }}
                    />
                )}

                {/* Dragging indicator */}
                {draggingPin && dragPosition.x > 0 && (
                    <div
                        className="absolute pointer-events-none z-50"
                        style={{
                            left: dragPosition.x - 14,
                            top: dragPosition.y - 14
                        }}
                    >
                        <div className="relative w-7 h-7">
                            {/* Subtle white border for contrast */}
                            <div className="absolute inset-0 bg-white/80 rounded-full shadow-sm"></div>
                            {/* Purple ring and dot */}
                            <div className="absolute inset-0.5 rounded-full animate-pulse opacity-60" style={{ backgroundColor: '#B854F6' }}></div>
                            <div className="absolute inset-1.5 rounded-full" style={{ backgroundColor: '#B854F6' }}></div>
                        </div>
                    </div>
                )}

                {/* Furniture pins */}
                {uploadedImage && imageRef.current && furniturePins.map((pin) => {
                    const imgRect = imageRef.current?.getBoundingClientRect()
                    if (!imgRect) return null

                    return (
                        <div
                            key={pin.pinId || pin.id}
                            className={`absolute group transition-opacity ${draggingPin === (pin.pinId || pin.id) ? 'opacity-50' : 'opacity-100'}`}
                            style={{
                                left: imgRect.left - containerRef.current?.getBoundingClientRect().left + pin.x * imgRect.width - 14,
                                top: imgRect.top - containerRef.current?.getBoundingClientRect().top + pin.y * imgRect.height - 14,
                                zIndex: 20
                            }}
                            draggable
                            onDragStart={(e) => handlePinDragStart(e, pin)}
                            onDragEnd={() => {
                                setDraggingPin(null)
                                setDragPosition({ x: 0, y: 0 })
                                setIsInteractingWithPin(false)
                            }}
                            onMouseDown={(e) => {
                                e.stopPropagation()
                                setIsInteractingWithPin(true)
                            }}
                            onMouseUp={(e) => {
                                e.stopPropagation()
                                setIsInteractingWithPin(false)
                            }}
                            onMouseEnter={() => setHoveredPin(pin.pinId || pin.id)}
                            onMouseLeave={() => {
                                setHoveredPin(null)
                                setIsInteractingWithPin(false)
                            }}
                        >
                            {/* Pin dot with ring */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onFurnitureClick(pin)
                                }}
                                className="relative w-7 h-7 cursor-move"
                            >
                                {/* Subtle white border for contrast */}
                                <div className="absolute inset-0 bg-white/80 rounded-full shadow-sm"></div>
                                {/* Purple ring and dot */}
                                <div className="absolute inset-0.5 rounded-full animate-pulse opacity-30" style={{ backgroundColor: '#B854F6' }}></div>
                                <div className="absolute inset-1.5 rounded-full" style={{ backgroundColor: '#B854F6' }}></div>
                            </button>

                            {/* Delete button - using opacity transition instead of conditional rendering */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    deletePin(pin.pinId || pin.id)
                                }}
                                className={`absolute -top-2 -right-2 w-5 h-5 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-full flex items-center justify-center shadow-md z-40 transition-opacity ${hoveredPin === (pin.pinId || pin.id) ? 'opacity-100' : 'opacity-0 pointer-events-none'
                                    }`}
                                title="Delete pin"
                            >
                                <X className="w-3 h-3" />
                            </button>

                            {/* Tooltip - also using opacity transition */}
                            <div className={`absolute bottom-8 left-1/2 -translate-x-1/2 bg-card border border-border rounded-lg px-2 py-1 text-xs text-foreground shadow-lg whitespace-nowrap z-30 transition-opacity ${hoveredPin === (pin.pinId || pin.id) ? 'opacity-100' : 'opacity-0 pointer-events-none'
                                }`}>
                                {pin.name || pin.title}
                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-card border-b border-r border-border rotate-45"></div>
                            </div>
                        </div>
                    )
                })}

                {uploadedImage && (
                    <div className="absolute top-4 right-4 flex gap-2">
                        {(isDrawingMode || isEraserMode) && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    clearDrawing()
                                }}
                                className="px-3 py-1.5 bg-card hover:bg-accent border border-border rounded-lg text-sm text-foreground shadow-sm transition-colors"
                            >
                                Clear Drawing
                            </button>
                        )}
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                setUploadedImage(null)
                                clearDrawing()
                            }}
                            className="px-3 py-1.5 bg-card hover:bg-accent border border-border rounded-lg text-sm text-foreground shadow-sm transition-colors"
                        >
                            Clear Image
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}