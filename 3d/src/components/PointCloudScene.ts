import * as THREE from 'three';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';
import { PointCloudRenderer } from './PointCloudRenderer.js';
import { PointCloudUI } from './PointCloudUI.js';
import { HighlightedCuboid } from './HighlightedCuboid.js';

/**
 * Point Cloud Scene Manager for View 1
 * Manages the 3D scene with PLY model rendering from front view with orthographic camera
 */
export class PointCloudScene {
    private scene: THREE.Scene;
    private camera: THREE.OrthographicCamera;
    private pointCloudRenderer: PointCloudRenderer;
    private ui: PointCloudUI;
    private isInitialized: boolean = false;
    private highlightedCuboid: HighlightedCuboid | null = null;
    private plyMesh: THREE.Mesh | null = null;

    constructor() {
        this.scene = this.createScene();
        this.camera = this.createCamera();
        this.createHighlightedCuboid(); // Add the highlighted cuboid to the scene
        this.pointCloudRenderer = new PointCloudRenderer(this.scene);
        this.ui = new PointCloudUI((fov) => this.handleFOVChange(fov));
    }

    /**
     * Create the 3D scene with appropriate lighting for PLY model display
     */
    private createScene(): THREE.Scene {
        const scene = new THREE.Scene();
        
        // Set dark background for better model visibility
        scene.background = new THREE.Color(0x222222);

        // Add brighter ambient lighting for model illumination
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        scene.add(ambientLight);

        // Add multiple directional lights for better model visibility and depth perception
        const frontLight = new THREE.DirectionalLight(0xffffff, 1.2);
        frontLight.position.set(0, 2, 5);
        scene.add(frontLight);

        const backLight = new THREE.DirectionalLight(0xffffff, 0.6);
        backLight.position.set(0, 2, -5);
        scene.add(backLight);

        // Add side lights for better 3D definition
        const leftLight = new THREE.DirectionalLight(0xffffff, 0.4);
        leftLight.position.set(-5, 2, 0);
        scene.add(leftLight);

        const rightLight = new THREE.DirectionalLight(0xffffff, 0.4);
        rightLight.position.set(5, 2, 0);
        scene.add(rightLight);

        return scene;
    }

    /**
     * Create an orthographic camera for front view of PLY model (matches View 2's orthographic approach)
     */
    private createCamera(): THREE.OrthographicCamera {
        const camera = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 1000);
        
        // Position camera for front view of PLY model
        camera.position.set(0, 0, 10);
        camera.lookAt(0, 0, 0);
        
        return camera;
    }

    /**
     * Create a highlighted cuboid for indicating position in the PLY model scene
     */
    private createHighlightedCuboid(): void {
        // Create new highlighted cuboid instance with appropriate size for visibility
        // Using larger dimensions to be clearly visible in the PLY model scene
        this.highlightedCuboid = new HighlightedCuboid(this.scene, 1.0, 2.5, 1.0); // Larger: 1.0x2.5x1.0
        
        // Position the cuboid at origin initially (will be synced with handle position)
        this.highlightedCuboid.setPosition(0, 0, 0);
    }

    /**
     * Initialize the scene by loading the PLY model for front view
     * @param modelPath Path to PLY model file
     */
    async initialize(modelPath: string = 'model.ply'): Promise<void> {
        try {
            await this.loadPLYModel(modelPath);
            this.isInitialized = true;
            console.log('PLY model scene initialized successfully');
        } catch (error) {
            console.error('Failed to initialize PLY model scene:', error);
            // Create fallback visualization
            this.createFallbackVisualization();
        }
    }

    /**
     * Load the PLY model for front view display
     * @param modelPath Path to the PLY model file
     */
    async loadPLYModel(modelPath: string): Promise<void> {
        const loader = new PLYLoader();
        
        return new Promise((resolve, reject) => {
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
                    
                    // Use EXACTLY the same scale factor as TopDownViewManager for 1:1 correspondence
                    // Scale factor to fit model (target size ~9 units, using X and Z dimensions like top-down view)
                    const maxDimension = Math.max(size.x, size.z); // Same calculation as TopDownViewManager
                    const scaleFactor = 9 / maxDimension; // Same scale factor as TopDownViewManager

                    // Check if the PLY has vertex colors
                    const hasVertexColors = geometry.hasAttribute('color');
                    
                    // Create material - use vertex colors if available, otherwise fallback color
                    const material = new THREE.MeshStandardMaterial({
                        roughness: 0.3,
                        metalness: 0.1,
                        vertexColors: hasVertexColors,
                        color: hasVertexColors ? 0xffffff : 0x4488cc // White for vertex colors, blue fallback
                    });

                    // Create mesh (geometry is already centered)
                    this.plyMesh = new THREE.Mesh(geometry, material);
                    this.plyMesh.scale.multiplyScalar(scaleFactor);
                    
                    this.scene.add(this.plyMesh);
                    this.scene.userData.mesh = this.plyMesh; // Store for potential animation
                    
                    console.log('PLY model loaded successfully for front view');
                    resolve();
                },
                (progress) => {
                    console.log('PLY front view loading progress:', progress);
                },
                (error) => {
                    console.error('Error loading PLY model for front view:', error);
                    this.createFallbackVisualization();
                    reject(error);
                }
            );
        });
    }

    /**
     * Create a fallback visualization when PLY model fails to load
     */
    private createFallbackVisualization(): void {
        // Create a simple colored box as fallback
        const geometry = new THREE.BoxGeometry(2, 2, 2);
        const material = new THREE.MeshStandardMaterial({
            color: 0xff6b6b,
            roughness: 0.3,
            metalness: 0.1
        });
        const fallbackMesh = new THREE.Mesh(geometry, material);
        fallbackMesh.position.set(0, 0, 0);
        this.scene.add(fallbackMesh);

        // Store reference for potential animation
        this.scene.userData.fallbackMesh = fallbackMesh;
        this.plyMesh = fallbackMesh;
        
        console.log('Fallback visualization created for PLY model');
    }

    /**
     * Handle FOV changes from the UI (orthographic cameras don't use FOV, so this adjusts viewing volume)
     */
    private handleFOVChange(fov: number): void {
        // For orthographic camera, simulate FOV change by adjusting the viewing volume
        // Higher FOV values = wider view = larger viewing volume
        const scale = fov / 75; // Normalize to default FOV of 75
        const baseSize = 5; // Base viewing volume size
        const newSize = baseSize * scale;
        
        this.camera.left = -newSize;
        this.camera.right = newSize;
        this.camera.top = newSize;
        this.camera.bottom = -newSize;
        this.camera.updateProjectionMatrix();
        
        console.log(`Orthographic viewing volume updated for FOV-like effect: ${fov} degrees (size: ${newSize.toFixed(2)})`);
    }

    /**
     * Update camera aspect ratio for orthographic camera
     */
    updateCameraAspect(aspect: number): void {
        // For orthographic cameras, adjust the viewing volume to maintain aspect ratio
        const frustumHeight = 5; // Half height of the viewing volume
        const frustumWidth = frustumHeight * aspect;
        this.camera.left = -frustumWidth;
        this.camera.right = frustumWidth;
        this.camera.top = frustumHeight;
        this.camera.bottom = -frustumHeight;
        this.camera.updateProjectionMatrix();
    }

    /**
     * Animate the scene (called in render loop)
     */
    animate(): void {
        // Keep PLY model static (no rotation) for better furniture viewing
        // The model should remain in its natural orientation for the front view
        
        // Animate the highlighted cuboid with pulsing effect and distance-based scaling
        if (this.highlightedCuboid) {
            this.highlightedCuboid.animate();
            this.updateCuboidScaling();
        }
    }

    /**
     * Update cuboid scaling based on distance from camera for better depth perception in orthographic view
     */
    private updateCuboidScaling(): void {
        if (!this.highlightedCuboid) return;

        const cuboidMesh = this.highlightedCuboid.getMesh();
        const cuboidPosition = cuboidMesh.position;
        const cameraPosition = this.camera.position;
        
        // Calculate actual 3D distance from camera to cuboid
        const distance = cameraPosition.distanceTo(cuboidPosition);
        
        // Calculate scale factor based on distance from camera
        // Objects further away should appear smaller
        const baseDistance = 10; // Reference distance where scale = 1.0 (camera is at Z=10)
        const minScale = 0.3; // Minimum scale for far objects
        const maxScale = 2.0; // Maximum scale for near objects
        
        // Inverse scaling: closer objects are larger, further objects are smaller
        let scaleFactor = baseDistance / distance;
        scaleFactor = Math.max(minScale, Math.min(maxScale, scaleFactor));
        
        // Apply the scale to both cuboid and wireframe
        cuboidMesh.scale.setScalar(scaleFactor);
        const wireframe = this.highlightedCuboid.getWireframe();
        wireframe.scale.setScalar(scaleFactor);
    }

    /**
     * Get the scene for rendering
     */
    getScene(): THREE.Scene {
        return this.scene;
    }

    /**
     * Get the camera for rendering
     */
    getCamera(): THREE.OrthographicCamera {
        return this.camera;
    }

    /**
     * Show the UI controls
     */
    showUI(): void {
        this.ui.show();
    }

    /**
     * Hide the UI controls
     */
    hideUI(): void {
        this.ui.hide();
    }

    /**
     * Check if the scene is ready for rendering
     */
    isReady(): boolean {
        return this.isInitialized || !!this.scene.userData.fallbackMesh;
    }

    /**
     * Get the highlighted cuboid for direct control
     */
    getHighlightedCuboid(): HighlightedCuboid | null {
        return this.highlightedCuboid;
    }

    /**
     * Set the position of the highlighted cuboid
     * @param x X coordinate
     * @param y Y coordinate  
     * @param z Z coordinate
     */
    setCuboidPosition(x: number, y: number, z: number): void {
        if (this.highlightedCuboid) {
            this.highlightedCuboid.setPosition(x, y, z);
        }
    }

    /**
     * Set the visibility of the highlighted cuboid
     * @param visible Whether the cuboid should be visible
     */
    setCuboidVisible(visible: boolean): void {
        if (this.highlightedCuboid) {
            this.highlightedCuboid.setVisible(visible);
        }
    }

    /**
     * Enable or disable the cuboid pulsing animation
     * @param animate Whether to animate the pulsing effect
     */
    setCuboidAnimating(animate: boolean): void {
        if (this.highlightedCuboid) {
            this.highlightedCuboid.setAnimating(animate);
        }
    }

    /**
     * Clean up resources
     */
    dispose(): void {
        this.pointCloudRenderer.dispose();
        this.ui.dispose();
        
        // Clean up fallback mesh if it exists
        const fallbackMesh = this.scene.userData.fallbackMesh;
        if (fallbackMesh) {
            fallbackMesh.geometry.dispose();
            (fallbackMesh.material as THREE.Material).dispose();
            this.scene.remove(fallbackMesh);
            delete this.scene.userData.fallbackMesh;
        }
        
        // Clean up highlighted cuboid
        if (this.highlightedCuboid) {
            this.highlightedCuboid.dispose();
            this.highlightedCuboid = null;
        }
        
        this.isInitialized = false;
    }
}
