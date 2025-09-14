import * as THREE from "three";
import { PLYLoader } from "three/examples/jsm/loaders/PLYLoader.js";
import { PointCloudScene } from "./components/PointCloudScene.js";
import { TopDownViewManager } from "./components/TopDownViewManager.js";

// Types ----------------------------------------------------------------------
interface ViewDef {
  left: number; // fraction of window width
  bottom: number; // fraction of window height
  width: number; // fraction of window width
  height: number; // fraction of window height
  camera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
  scene: THREE.Scene & { userData: { mesh?: THREE.Mesh } };
  name: string;
  pointCloudScene?: PointCloudScene; // Optional point cloud scene for View 1
  topDownViewManager?: TopDownViewManager; // Optional top-down view manager for View 2
}

let renderer: THREE.WebGLRenderer;
const views: ViewDef[] = [];
const BORDER_PX = 2; // width of the border in pixels
const BORDER_COLOR = 0x444444; // border color

// Point cloud oscillation animation variables
let pointCloudRotationDirection = 1; // 1 for right, -1 for left
let pointCloudCurrentRotation = 0; // Current rotation in radians
const pointCloudMaxRotation = Math.PI / 4; // 45 degrees in radians

// Function to create a scene with an image texture
function createImageScene(imagePath: string) {
  const scene = new THREE.Scene();

  // Add lighting suitable for image display
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
  scene.add(ambientLight);

  // Add black background
  scene.background = new THREE.Color(0x000000);

  // Load texture
  const loader = new THREE.TextureLoader();
  loader.load(
    imagePath,
    (texture) => {
      // Get image dimensions
      const imageWidth = texture.image.width;
      const imageHeight = texture.image.height;
      const imageAspect = imageWidth / imageHeight;
      
      // Calculate size to fit within viewport while maintaining aspect ratio
      // Updated viewport aspect ratio for the shorter view (0.4 width / 0.35 height)
      const viewportAspect = 0.4 / 0.35; // ~1.14
      
      let planeWidth, planeHeight;
      if (imageAspect > viewportAspect) {
        // Image is wider than viewport - fit to width
        planeWidth = 8.5; // Increased from 3.5 to make image larger
        planeHeight = planeWidth / imageAspect;
      } else {
        // Image is taller than viewport - fit to height
        planeHeight = 8.5; // Increased from 3.5 to make image larger
        planeWidth = planeHeight * imageAspect;
      }
      
      const planeGeometry = new THREE.PlaneGeometry(planeWidth, planeHeight);
      
      // Create material with the loaded texture
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true
      });

      // Create mesh
      const mesh = new THREE.Mesh(planeGeometry, material);
      scene.add(mesh);
      scene.userData.mesh = mesh; // Store for potential animation
    },
    (progress) => {
      console.log('Image loading progress:', progress);
    },
    (error) => {
      console.error('Error loading image:', error);
      // Fallback to a simple colored plane if loading fails
      const fallbackGeometry = new THREE.PlaneGeometry(3, 3);
      const fallbackMaterial = new THREE.MeshBasicMaterial({
        color: 0x666666,
        transparent: true,
        opacity: 0.8
      });
      const fallbackMesh = new THREE.Mesh(fallbackGeometry, fallbackMaterial);
      scene.add(fallbackMesh);
      scene.userData.mesh = fallbackMesh;
    }
  );

  return scene;
}

// Function to create a scene for PLY models with auto-fitting
function createPLYScene(modelPath: string) {
  const scene = new THREE.Scene();

  // Add lighting optimized for model display - brighter setup
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.2); // Increased ambient light for brightness
  scene.add(ambientLight);

  // Multiple directional lights for better model visibility
  const frontLight = new THREE.DirectionalLight(0xffffff, 1.8); // Increased intensity for brightness
  frontLight.position.set(0, 0, 1);
  scene.add(frontLight);

  const backLight = new THREE.DirectionalLight(0xffffff, 1.0); // Increased back light
  backLight.position.set(0, 0, -1);
  scene.add(backLight);

  // Add side lights for better 3D definition
  const leftLight = new THREE.DirectionalLight(0xffffff, 0.8); // Increased side lights
  leftLight.position.set(-1, 0.5, 0);
  scene.add(leftLight);

  const rightLight = new THREE.DirectionalLight(0xffffff, 0.8); // Increased side lights
  rightLight.position.set(1, 0.5, 0);
  scene.add(rightLight);

  // Add black background
  scene.background = new THREE.Color(0x000000);

  // Load PLY model
  const loader = new PLYLoader();
  loader.load(
    modelPath,
    (geometry) => {
      // Compute bounding box and center the geometry
      geometry.computeBoundingBox();
      const boundingBox = geometry.boundingBox!;
      const center = boundingBox.getCenter(new THREE.Vector3());
      const size = boundingBox.getSize(new THREE.Vector3());
      
      // Center the geometry by translating vertices
      geometry.translate(-center.x, -center.y, -center.z);
      
      // Scale factor to fit model prominently in the viewport (target size ~5 units for maximum visibility)
      const maxDimension = Math.max(size.x, size.y, size.z);
      const scaleFactor = 8 / maxDimension;

      // Check if the PLY has vertex colors
      const hasVertexColors = geometry.hasAttribute('color');
      
      // Create material - use vertex colors if available, otherwise fallback color
      const material = new THREE.MeshStandardMaterial({
        roughness: 0.3,
        metalness: 0.1,
        vertexColors: hasVertexColors, // Enable vertex colors if available
        color: hasVertexColors ? 0xffffff : 0xffa500 // White for vertex colors, orange fallback
      });

      // Create mesh (geometry is already centered)
      const mesh = new THREE.Mesh(geometry, material);
      mesh.scale.multiplyScalar(scaleFactor);
      
      scene.add(mesh);
      scene.userData.mesh = mesh; // Store for animation
    },
    (progress) => {
      console.log('PLY loading progress:', progress);
    },
    (error) => {
      console.error('Error loading PLY model:', error);
      // Fallback to a simple geometry if loading fails
      const fallbackGeometry = new THREE.SphereGeometry(1, 16, 16);
      const fallbackMaterial = new THREE.MeshStandardMaterial({
        color: 0xff6666,
        roughness: 0.3,
        metalness: 0.1
      });
      const fallbackMesh = new THREE.Mesh(fallbackGeometry, fallbackMaterial);
      scene.add(fallbackMesh);
      scene.userData.mesh = fallbackMesh;
    }
  );

  return scene;
}

// Function to create a point cloud scene using depth and RGB images
function createPointCloudScene() {
  const scene = new THREE.Scene();

  // Set dark background for better point cloud visibility
  scene.background = new THREE.Color(0x111111);

  // Add ambient lighting for overall illumination
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  // Add directional light for depth perception
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4);
  directionalLight.position.set(5, 5, 5);
  scene.add(directionalLight);

  // Create point cloud from depth and RGB images
  const loader = new THREE.TextureLoader();
  
  // Load both depth and RGB textures
  Promise.all([
    new Promise<THREE.Texture>((resolve, reject) => {
      loader.load('depth.png', resolve, undefined, reject);
    }),
    new Promise<THREE.Texture>((resolve, reject) => {
      loader.load('rgb.png', resolve, undefined, reject);
    })
  ]).then(([depthTexture, rgbTexture]) => {
    createPointCloudFromTextures(scene, depthTexture, rgbTexture);
  }).catch((error) => {
    console.error('Error loading point cloud textures:', error);
    // Create fallback visualization
    const fallbackGeometry = new THREE.BoxGeometry(2, 2, 2);
    const fallbackMaterial = new THREE.MeshStandardMaterial({
      color: 0xff6b6b,
      roughness: 0.3,
      metalness: 0.1
    });
    const fallbackMesh = new THREE.Mesh(fallbackGeometry, fallbackMaterial);
    scene.add(fallbackMesh);
    scene.userData.mesh = fallbackMesh;
  });

  return scene;
}

// Function to create point cloud geometry from depth and RGB textures
function createPointCloudFromTextures(scene: THREE.Scene, depthTexture: THREE.Texture, rgbTexture: THREE.Texture) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  
  // Get image data from textures
  const depthImage = depthTexture.image;
  const rgbImage = rgbTexture.image;
  
  canvas.width = depthImage.width;
  canvas.height = depthImage.height;
  
  // Draw depth image to canvas to get pixel data
  ctx.drawImage(depthImage, 0, 0);
  const depthData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  
  // Draw RGB image to canvas to get pixel data
  ctx.drawImage(rgbImage, 0, 0);
  const rgbData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  
  // Create point cloud geometry
  const positions = [];
  const colors = [];
  
  const width = canvas.width;
  const height = canvas.height;
  
  for (let y = 0; y < height; y += 2) { // Skip every other pixel for performance
    for (let x = 0; x < width; x += 2) {
      const index = (y * width + x) * 4;
      
      // Get depth value (using red channel, assuming grayscale depth map)
      const depth = depthData.data[index] / 255.0;
      
      if (depth > 0.1) { // Only create points for valid depth values
        // Convert pixel coordinates to 3D world coordinates
        const worldX = (x / width - 0.5) * 4; // Reduced scale from 10 to 4
        const worldY = -(y / height - 0.5) * 4; // Reduced scale from 10 to 4
        const worldZ = depth * 2; // Reduced scale from 5 to 2
        
        positions.push(worldX, worldY, worldZ);
        
        // Get RGB color
        const r = rgbData.data[index] / 255.0;
        const g = rgbData.data[index + 1] / 255.0;
        const b = rgbData.data[index + 2] / 255.0;
        
        colors.push(r, g, b);
      }
    }
  }
  
  // Create point cloud
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  
  const material = new THREE.PointsMaterial({
    size: 0.02, // Reduced from 0.05 to 0.02
    vertexColors: true,
    sizeAttenuation: true
  });
  
  const pointCloud = new THREE.Points(geometry, material);
  scene.add(pointCloud);
  scene.userData.pointCloud = pointCloud;
}

function init() {
  // -- View Definitions --
  // Based on the layout from the image.
  // Values are fractions of the window's width and height.

  // View 1: Large left view with PLY Model Front View
  const pointCloudScene = new PointCloudScene();
  views.push({
    left: 0,
    bottom: 0,
    width: 0.6,
    height: 1.0,
    camera: pointCloudScene.getCamera(),
    scene: pointCloudScene.getScene() as THREE.Scene & { userData: { mesh?: THREE.Mesh } },
    name: 'PLY Front View',
    pointCloudScene: pointCloudScene
  });

  // Initialize PLY model scene (will show fallback if model doesn't exist)
  pointCloudScene.initialize('model.ply').catch(console.error);

  // View 2: Top right view - PLY Model with Orthographic Top-Down Camera and Indicator Handle
  const topDownViewManager = new TopDownViewManager();
  views.push({
    left: 0.6,
    bottom: 0.35,
    width: 0.4,
    height: 0.65,
    camera: topDownViewManager.getCamera(),
    scene: topDownViewManager.getScene() as THREE.Scene & { userData: { mesh?: THREE.Mesh } },
    name: 'PLY Top-Down View with Indicator',
    topDownViewManager: topDownViewManager
  });

  // Initialize the top-down view manager (will load PLY model and show fallback if needed)
  topDownViewManager.loadPLYModel('model.ply').catch(console.error);
  
  // Configure coordinate transformation scale for 1:1 correlation between views:
  // - Both views show the same PLY model at the same scale, so coordinates should match exactly
  // - Set scale to 1.0 for direct 1:1 mapping between View 2 handle position and View 1 cuboid position
  topDownViewManager.setCoordinateScale(1.0, 1.0); // 1:1 correspondence between views
  
  // Configure coordinate inversion (adjust if directions are wrong):
  topDownViewManager.setCoordinateInversion(false, false); // No inversion for direct mapping
  
  // Sync initial positions: Set HighlightedCuboid position based on IndicatorHandle's initial position
  const initialHandlePos = topDownViewManager.getHandlePosition();
  const { scaleX, scaleZ } = topDownViewManager.getCoordinateScale();
  const { invertX, invertZ } = topDownViewManager.getCoordinateInversion();
  const initialCuboidX = initialHandlePos.x * scaleX * (invertX ? -1 : 1);
  const initialCuboidZ = initialHandlePos.z * scaleZ * (invertZ ? -1 : 1);
  const highlightedCuboid = pointCloudScene.getHighlightedCuboid();
  if (highlightedCuboid) {
    // Position the cuboid slightly above ground level so it's visible on the PLY model surface
    highlightedCuboid.setPosition(initialCuboidX, 0.3, initialCuboidZ); // Y=0.3 to lift it slightly above ground
    console.log(`Initial HighlightedCuboid position synced to: x=${initialCuboidX.toFixed(2)}, y=0.3, z=${initialCuboidZ.toFixed(2)}`);
  }
  
  // Set up callbacks for handle interaction
  topDownViewManager.onHandlePositionChanged((x, z) => {
    console.log(`Indicator handle moved to position: x=${x.toFixed(2)}, z=${z.toFixed(2)}`);
    
    // Direct 1:1 coordinate mapping between View 2 (top-down) and View 1 (front view)
    // Since both views show the same PLY model, the coordinates should correspond exactly
    // The handle position in the top-down view should map directly to the cuboid position in the front view
    
    // Get scale factors from the TopDownViewManager (should be 1.0, 1.0 for direct mapping)
    const { scaleX, scaleZ } = topDownViewManager.getCoordinateScale();
    const { invertX, invertZ } = topDownViewManager.getCoordinateInversion();
    
    // Direct coordinate mapping: top-down (x,z) -> front view (x,y,z)
    // Y is kept slightly above 0 so the cuboid is visible on the model surface
    const frontViewX = x * scaleX * (invertX ? -1 : 1);
    const frontViewY = 0.3; // Lift slightly above ground so it's visible on the PLY model
    const frontViewZ = z * scaleZ * (invertZ ? -1 : 1);
    
    // Update the HighlightedCuboid position in the front view scene
    const highlightedCuboid = pointCloudScene.getHighlightedCuboid();
    if (highlightedCuboid) {
      highlightedCuboid.setPosition(frontViewX, frontViewY, frontViewZ);
      console.log(`HighlightedCuboid moved to: x=${frontViewX.toFixed(2)}, y=${frontViewY.toFixed(2)}, z=${frontViewZ.toFixed(2)}`);
    }
  });
  
  topDownViewManager.onHandleSelectionChanged((selected) => {
    console.log(`Indicator handle ${selected ? 'selected' : 'deselected'}`);
  });

  // View 3: Bottom right view - Display depth.png image
  views.push({
    left: 0.6,
    bottom: 0,
    width: 0.4,
    height: 0.35,
    camera: new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 1000),
    scene: createImageScene('depth.png'), // Load depth.png image
    name: 'Depth Image View'
  });

  // View 4: Medium overlay box, bottom-right inside View 1 (left panel) - PLY Model Display
  views.push({
    left: 0.37, // positioned so left + width (0.37 + 0.18 = 0.55) leaves 0.05 margin before View 1's right edge at 0.60
    bottom: 0.05,
    width: 0.18,
    height: 0.28,
    camera: new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1000),
    scene: createPLYScene('model.ply'), // Load PLY model
    name: 'PLY Model Display'
  });

  // View 5: Point Cloud view - bottom left of entire screen
  views.push({
    left: 0.05, // Small margin from left edge
    bottom: 0.05, // Small margin from bottom edge
    width: 0.18, // Same width as View 4
    height: 0.28, // Same height as View 4
    camera: new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1000),
    scene: createPointCloudScene(), // Create point cloud scene
    name: 'Point Cloud View'
  });

  // Position cameras for views 2, 3, 4, and 5 (View 1 camera is managed by PointCloudScene)
  // Skip View 2 since it has an orthographic camera already positioned
  for (let i = 1; i < views.length; i++) {
    if (views[i].camera instanceof THREE.PerspectiveCamera) {
      views[i].camera.position.z = 5;
    }
  }

  // -- Renderer Setup --
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  
  // Get actual viewport dimensions
  const width = document.documentElement.clientWidth;
  const height = document.documentElement.clientHeight;
  
  renderer.setSize(width, height, false); // false prevents setting inline styles
  // We need to enable the scissor test to clip the rendering to a specific rectangle.
  renderer.setScissorTest(true);
  // Modern color management & tone mapping
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  
  // Set canvas styles to prevent any sizing issues
  const canvas = renderer.domElement;
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  
  document.body.appendChild(canvas);

  // Initialize TransformControls for views that need them
  views.forEach(view => {
    if (view.topDownViewManager) {
      view.topDownViewManager.initializeControls(renderer);
    }
  });

  // Add click event listener for view interactions
  canvas.addEventListener('pointerdown', onPointerDown, false);

  window.addEventListener('resize', onWindowResize, false);
}

function onWindowResize() {
  // The main camera isn't used for rendering, but we update it for good practice.
  // The view cameras are updated in the animation loop.
  const width = document.documentElement.clientWidth;
  const height = document.documentElement.clientHeight;
  renderer.setSize(width, height, false);
}

/**
 * Handle pointer down events for view interactions
 */
function onPointerDown(event: PointerEvent) {
  const canvas = renderer.domElement;
  const canvasRect = canvas.getBoundingClientRect();
  const windowWidth = document.documentElement.clientWidth;
  const windowHeight = document.documentElement.clientHeight;

  // Check which view was clicked
  views.forEach((view) => {
    if (view.topDownViewManager) {
      // Calculate viewport bounds for this view
      const left = Math.floor(windowWidth * view.left);
      const bottom = Math.floor(windowHeight * view.bottom);
      const width = Math.floor(windowWidth * view.width);
      const height = Math.floor(windowHeight * view.height);

      // Check if click is within this view's bounds
      const clickX = event.clientX - canvasRect.left;
      const clickY = event.clientY - canvasRect.top;
      const viewClickY = canvasRect.height - clickY; // Convert to bottom-up coordinate system

      if (clickX >= left && clickX <= left + width && 
          viewClickY >= bottom && viewClickY <= bottom + height) {
        // Click is within this view - handle it
        const viewportInfo = {
          left: left + 2, // Account for border
          bottom: bottom + 2, // Account for border
          width: Math.max(1, width - 4), // Account for border
          height: Math.max(1, height - 4) // Account for border
        };
        
        view.topDownViewManager.handlePointerDown(event, canvasRect, viewportInfo);
      }
    }
  });
}

function animate() {
  // Animate objects in each scene
  views.forEach((view, index) => {
    if (index === 0 && view.pointCloudScene) {
      // Handle point cloud scene animation (View 1)
      view.pointCloudScene.animate();
    } else if (index === 1 && view.topDownViewManager) {
      // Handle top-down view manager animation (View 2)
      view.topDownViewManager.animate();
    } else {
      // Handle regular mesh animation for other views
      const mesh = view.scene.userData.mesh;
      const pointCloud = view.scene.userData.pointCloud;
      
      if (mesh) {
        if (index === 2) { // View 3 (depth image) - no rotation
          // Keep image static
        } else if (index === 3) { // View 4 (PLY model) - only rotate around Y-axis
          mesh.rotation.y += 0.01;
        } else { // Other views - keep original rotation
          mesh.rotation.x += 0.005;
          mesh.rotation.y += 0.01;
        }
      }
      
      if (pointCloud && index === 4) { // View 5 (point cloud) - oscillating rotation
        const rotationSpeed = 0.01;
        
        // Update current rotation
        pointCloudCurrentRotation += rotationSpeed * pointCloudRotationDirection;
        
        // Check if we've reached the maximum rotation in either direction
        if (pointCloudCurrentRotation >= pointCloudMaxRotation) {
          pointCloudCurrentRotation = pointCloudMaxRotation;
          pointCloudRotationDirection = -1; // Switch to rotating left
        } else if (pointCloudCurrentRotation <= -pointCloudMaxRotation) {
          pointCloudCurrentRotation = -pointCloudMaxRotation;
          pointCloudRotationDirection = 1; // Switch to rotating right
        }
        
        // Apply the rotation
        pointCloud.rotation.y = pointCloudCurrentRotation;
      }
    }
  });

  render();
  requestAnimationFrame(animate);
}

function render() {
  // The key to this technique is to render each scene into its own viewport "slice"
  // of the main canvas. We do this by iterating through our view definitions.

  const windowWidth = document.documentElement.clientWidth;
  const windowHeight = document.documentElement.clientHeight;

  for (let i = 0; i < views.length; ++i) {
    const view = views[i];
    const camera = view.camera;

    // Calculate outer (with border) dimensions in pixels
    const left = Math.floor(windowWidth * view.left);
    const bottom = Math.floor(windowHeight * view.bottom);
    const width = Math.floor(windowWidth * view.width);
    const height = Math.floor(windowHeight * view.height);

    // 1. Draw border by clearing the full scissored rect with border color
    renderer.setViewport(left, bottom, width, height);
    renderer.setScissor(left, bottom, width, height);
    renderer.setClearColor(BORDER_COLOR, 1);
    renderer.clear(true, false, false); // clear color only

    // 2. Inset inner viewport for actual scene (avoid negative sizes)
    const innerLeft = left + BORDER_PX;
    const innerBottom = bottom + BORDER_PX;
    const innerWidth = Math.max(1, width - BORDER_PX * 2);
    const innerHeight = Math.max(1, height - BORDER_PX * 2);

    renderer.setViewport(innerLeft, innerBottom, innerWidth, innerHeight);
    renderer.setScissor(innerLeft, innerBottom, innerWidth, innerHeight);

    // Update camera aspect ratio for the inner viewport
    const aspect = innerWidth / innerHeight;
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
    } else if (camera instanceof THREE.OrthographicCamera) {
      // For orthographic cameras, adjust the viewing volume to maintain aspect ratio
      const frustumHeight = 5; // Half height of the viewing volume
      const frustumWidth = frustumHeight * aspect;
      camera.left = -frustumWidth;
      camera.right = frustumWidth;
      camera.top = frustumHeight;
      camera.bottom = -frustumHeight;
      camera.updateProjectionMatrix();
    }

    // Update point cloud scene camera aspect if this is View 1
    if (i === 0 && view.pointCloudScene) {
      view.pointCloudScene.updateCameraAspect(aspect);
    }

    // Update top-down view manager camera aspect if this is View 2
    if (i === 1 && view.topDownViewManager) {
      view.topDownViewManager.updateCameraAspect(aspect);
    }

    // Render the scene inside the border
    renderer.render(view.scene, camera);
  }
}

// Start the application
init();
animate();

/*
 * HIGHLIGHTED CUBOID CONTROL EXAMPLES
 * 
 * The highlighted cuboid in View 1 can now be controlled programmatically.
 * View 1 now displays the PLY model from a front-facing perspective.
 * Here are some examples of how to use the new OOP interface:
 * 
 * // Get reference to the PLY front view scene (View 1)
 * const frontViewScene = views[0].pointCloudScene;
 * 
 * // Control position
 * frontViewScene.setCuboidPosition(1.5, 0, -1.0);
 * 
 * // Control visibility
 * frontViewScene.setCuboidVisible(false); // Hide cuboid
 * frontViewScene.setCuboidVisible(true);  // Show cuboid
 * 
 * // Control animation
 * frontViewScene.setCuboidAnimating(false); // Stop pulsing
 * frontViewScene.setCuboidAnimating(true);  // Resume pulsing
 * 
 * // Get direct access to the cuboid for advanced control
 * const cuboid = frontViewScene.getHighlightedCuboid();
 * if (cuboid) {
 *     cuboid.setPosition(0, 0, 0);           // Set position
 *     cuboid.setRotation(0, Math.PI/4, 0);   // Rotate 45 degrees on Y axis
 *     cuboid.setScale(1.5);                  // Make 1.5x larger
 *     cuboid.setColor(0xff0000);             // Change to red
 *     cuboid.setWireframeColor(0xffff00);    // Change wireframe to yellow
 * }
 */

/*
 * INDICATOR HANDLE CONTROL EXAMPLES (NEW)
 * 
 * The indicator handle in View 2 (top-down view) can be controlled programmatically.
 * Here are examples of how to use the new OOP interface:
 * 
 * // Get reference to the top-down view manager (View 2)
 * const topDownView = views[1].topDownViewManager;
 * 
 * // Control position programmatically
 * topDownView.setHandlePosition(2.5, -1.0); // Set X and Z coordinates
 * 
 * // Get current position
 * const currentPos = topDownView.getHandlePosition();
 * console.log(`Handle is at x: ${currentPos.x}, z: ${currentPos.z}`);
 * 
 * // Get direct access to the indicator handle for advanced control
 * const handle = topDownView.getIndicatorHandle();
 * if (handle) {
 *     handle.setColor(0xff0000);        // Change to red
 *     handle.setScale(1.5);             // Make 1.5x larger
 *     handle.setVisible(false);         // Hide handle
 *     handle.setVisible(true);          // Show handle
 * }
 * 
 * // Set up callbacks for handle events
 * topDownView.onHandlePositionChanged((x, z) => {
 *     console.log(`Handle moved to: ${x}, ${z}`);
 *     // You can sync this with other views or update UI here
 * });
 * 
 * topDownView.onHandleSelectionChanged((selected) => {
 *     console.log(`Handle ${selected ? 'selected' : 'deselected'}`);
 *     // You can update UI state or other visual indicators here
 * });
 * 
 * INTERACTION INSTRUCTIONS:
 * 1. Click on the cyan circular handle in View 2 (top-right) to select it
 * 2. When selected, the handle turns yellow and shows transform gizmos
 * 3. Drag the X (red) and Z (blue) arrows to move the handle around
 * 4. The handle is constrained to X and Z movement only (no Y/height change)
 * 5. Click elsewhere in the view to deselect the handle
 * 6. Position changes are logged to the console and trigger movement of the highlighted cuboid in View 1
 * 7. View 1 now shows the same PLY model as View 2, but from a front-facing perspective
 * 8. The highlighted cuboid in View 1 moves proportionally with the handle in View 2, allowing you to see the 3D position from both views
 */
