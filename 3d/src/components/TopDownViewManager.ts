import * as THREE from 'three';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';
import { IndicatorHandle } from './IndicatorHandle.js';

/**
 * TopDownViewManager class - Manages the top-down orthographic view (View2)
 * Includes PLY model loading, indicator handle, and TransformControls for X/Y movement
 */
export class TopDownViewManager {
    private scene: THREE.Scene;
    private camera: THREE.OrthographicCamera;
    private indicatorHandle: IndicatorHandle;
    private transformControls: TransformControls | null = null;
    private isInitialized: boolean = false;
    private selectedObject: THREE.Object3D | null = null;
    private raycaster: THREE.Raycaster;
    private pointer: THREE.Vector2;
    private renderer: THREE.WebGLRenderer | null = null;
    private viewportInfo: { left: number, bottom: number, width: number, height: number } | null = null;
    private canvasRect: DOMRect | null = null;

    // Event callbacks
    private onHandlePositionChange: ((x: number, z: number) => void) | null = null;
    private onHandleSelected: ((selected: boolean) => void) | null = null;

    // Coordinate transformation settings
    private coordinateScaleX: number = 20;
    private coordinateScaleZ: number = 20;
    private invertCoordinateX: boolean = true;
    private invertCoordinateZ: boolean = true;

    constructor() {
        this.scene = this.createScene();
        this.camera = this.createCamera();
        this.indicatorHandle = new IndicatorHandle(this.scene);
        this.raycaster = new THREE.Raycaster();
        this.pointer = new THREE.Vector2();
        
        // Position the handle at the center initially
        this.indicatorHandle.setPosition(0, 0);
    }

    /**
     * Create the top-down orthographic scene
     */
    private createScene(): THREE.Scene {
        const scene = new THREE.Scene();

        // Add lighting optimized for top-down model display
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
        scene.add(ambientLight);

        // Top-down directional light to simulate natural lighting
        const topLight = new THREE.DirectionalLight(0xffffff, 1.5);
        topLight.position.set(0, 10, 0);
        topLight.target.position.set(0, 0, 0);
        scene.add(topLight);
        scene.add(topLight.target);

        // Add some side lighting for depth perception
        const sideLight1 = new THREE.DirectionalLight(0xffffff, 0.3);
        sideLight1.position.set(5, 5, 5);
        scene.add(sideLight1);

        const sideLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
        sideLight2.position.set(-5, 5, -5);
        scene.add(sideLight2);

        // Add neutral background
        scene.background = new THREE.Color(0x222222);

        // Add a grid below the PLY model for better spatial reference
        this.createGrid(scene);

        return scene;
    }

    /**
     * Create the orthographic camera for top-down view
     */
    private createCamera(): THREE.OrthographicCamera {
        const camera = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 1000);
        camera.position.set(0, 10, 0); // Position camera above the model
        camera.lookAt(0, 0, 0); // Look down at the origin
        return camera;
    }

    /**
     * Initialize the TransformControls with the given renderer
     * @param renderer The THREE.js WebGL renderer
     */
    initializeControls(renderer: THREE.WebGLRenderer): void {
        this.renderer = renderer;
        
        // Create TransformControls for the handle
        this.transformControls = new TransformControls(this.camera, renderer.domElement);
        this.transformControls.setMode('translate');
        this.transformControls.setSpace('local');
        this.transformControls.showX = true;  // Allow X movement
        this.transformControls.showY = false; // Disable Y movement (vertical)
        this.transformControls.showZ = true;  // Allow Z movement
        
        // Add event listeners for transform controls
        this.transformControls.addEventListener('dragging-changed', (event) => {
            // Disable orbit controls during dragging (if they exist)
            if (event.value) {
                // Dragging started
                renderer.domElement.style.cursor = 'move';
            } else {
                // Dragging stopped
                renderer.domElement.style.cursor = 'default';
                
                // Notify about position change
                if (this.selectedObject === this.indicatorHandle.getObject3D() && this.onHandlePositionChange) {
                    const position = this.indicatorHandle.getPosition();
                    this.onHandlePositionChange(position.x, position.z);
                }
            }
        });

        this.transformControls.addEventListener('change', () => {
            // Update handle position during dragging
            if (this.selectedObject === this.indicatorHandle.getObject3D()) {
                const position = this.transformControls!.object.position;
                // Ensure Y position stays at a fixed level for top-down view
                position.y = 0.1;
            }
        });

        // Add mouse move event listener for continuous raycasting when handle is selected
        renderer.domElement.addEventListener('pointermove', this.onPointerMove.bind(this), false);

        this.scene.add(this.transformControls as unknown as THREE.Object3D);
        this.isInitialized = true;
    }

    /**
     * Load the PLY model for the top-down view
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
                    
                    // Scale factor to fit model in the orthographic view (target size ~4 units for good visibility)
                    const maxDimension = Math.max(size.x, size.z); // Use X and Z for top-down view
                    const scaleFactor = 9 / maxDimension;

                    // Check if the PLY has vertex colors
                    const hasVertexColors = geometry.hasAttribute('color');
                    
                    // Create material - use vertex colors if available, otherwise fallback color
                    const material = new THREE.MeshStandardMaterial({
                        roughness: 0.3,
                        metalness: 0.1,
                        vertexColors: hasVertexColors,
                        color: hasVertexColors ? 0xffffff : 0x8844aa // White for vertex colors, purple fallback
                    });

                    // Create mesh (geometry is already centered)
                    const mesh = new THREE.Mesh(geometry, material);
                    mesh.scale.multiplyScalar(scaleFactor);
                    
                    this.scene.add(mesh);
                    this.scene.userData.mesh = mesh; // Store for potential animation
                    
                    console.log('PLY model loaded successfully for top-down view');
                    resolve();
                },
                (progress) => {
                    console.log('PLY top-down loading progress:', progress);
                },
                (error) => {
                    console.error('Error loading PLY model for top-down view:', error);
                    this.createFallbackModel();
                    reject(error);
                }
            );
        });
    }

    /**
     * Create a fallback model when PLY loading fails
     */
    private createFallbackModel(): void {
        const fallbackGeometry = new THREE.BoxGeometry(2, 0.5, 2);
        const fallbackMaterial = new THREE.MeshStandardMaterial({
            color: 0xaa44aa,
            roughness: 0.3,
            metalness: 0.1
        });
        const fallbackMesh = new    THREE.Mesh(fallbackGeometry, fallbackMaterial);
        this.scene.add(fallbackMesh);
        this.scene.userData.mesh = fallbackMesh;
    }

    /**
     * Create a grid below the PLY model for spatial reference
     */
    private createGrid(scene: THREE.Scene): void {
        // Create a grid helper
        const gridHelper = new THREE.GridHelper(10, 20, 0x404040, 0x404040);
        gridHelper.position.y = -0.05; // Position slightly below ground level
        scene.add(gridHelper);

        // Also create an invisible ground plane for raycasting
        const groundGeometry = new THREE.PlaneGeometry(20, 20);
        const groundMaterial = new THREE.MeshBasicMaterial({
            visible: false, // Make it invisible but still raycastable
            side: THREE.DoubleSide
        });
        const groundPlane = new THREE.Mesh(groundGeometry, groundMaterial);
        groundPlane.rotation.x = -Math.PI / 2; // Rotate to lay flat
        groundPlane.position.y = 0; // At ground level
        scene.add(groundPlane);
        
        // Store reference for raycasting
        scene.userData.groundPlane = groundPlane;
    }

    /**
     * Handle pointer down events for object selection and movement
     * @param event Pointer event from the renderer's canvas
     * @param canvasRect The canvas bounding rectangle
     * @param viewportInfo Viewport information for this view
     */
    handlePointerDown(event: PointerEvent, canvasRect: DOMRect, viewportInfo: { left: number, bottom: number, width: number, height: number }): void {
        if (!this.transformControls) return;

        // Store viewport info and canvas rect for mouse move events
        this.viewportInfo = viewportInfo;
        this.canvasRect = canvasRect;

        // Convert screen coordinates to normalized device coordinates for this viewport
        const x = ((event.clientX - canvasRect.left - viewportInfo.left) / viewportInfo.width) * 2 - 1;
        const y = -((event.clientY - canvasRect.top - (canvasRect.height - viewportInfo.bottom - viewportInfo.height)) / viewportInfo.height) * 2 + 1;

        this.pointer.set(x, y);
        this.raycaster.setFromCamera(this.pointer, this.camera);

        // Check for intersections with the indicator handle
        const intersectableMeshes = this.indicatorHandle.getIntersectableMeshes();
        const handleIntersects = this.raycaster.intersectObjects(intersectableMeshes, false);

        if (handleIntersects.length > 0) {
            // Handle was clicked
            if (this.indicatorHandle.isSelectedState()) {
                // Handle is already selected - exit edit mode
                this.deselectHandle();
            } else {
                // Handle not selected - select it to enter edit mode
                this.selectHandle();
            }
        } else {
            // Clicked elsewhere
            if (this.indicatorHandle.isSelectedState()) {
                // Handle is selected - exit edit mode
                this.deselectHandle();
            }
            // If handle is not selected, do nothing (don't move it)
        }
    }

    /**
     * Handle pointer move events for continuous raycasting when handle is selected
     * @param event Pointer event from the renderer's canvas
     */
    private onPointerMove(event: PointerEvent): void {
        if (!this.indicatorHandle.isSelectedState() || !this.viewportInfo || !this.canvasRect) {
            return; // Only raycast when handle is selected and we have viewport info
        }

        // Convert screen coordinates to normalized device coordinates for this viewport
        const x = ((event.clientX - this.canvasRect.left - this.viewportInfo.left) / this.viewportInfo.width) * 2 - 1;
        const y = -((event.clientY - this.canvasRect.top - (this.canvasRect.height - this.viewportInfo.bottom - this.viewportInfo.height)) / this.viewportInfo.height) * 2 + 1;

        // Check if mouse is within the viewport bounds
        if (x < -1 || x > 1 || y < -1 || y > 1) {
            return; // Mouse is outside the viewport
        }

        this.pointer.set(x, y);
        this.raycaster.setFromCamera(this.pointer, this.camera);

        // Perform raycasting to move handle
        this.moveHandleToMousePosition();
    }

    /**
     * Move the handle to the current mouse position by raycasting against the PLY model or ground plane
     */
    private moveHandleToMousePosition(): void {
        // Try to intersect with both the PLY model and the ground plane
        const plyMesh = this.scene.userData.mesh;
        const groundPlane = this.scene.userData.groundPlane;
        const intersectionObjects: THREE.Object3D[] = [];
        
        // Add PLY model if it exists
        if (plyMesh) {
            intersectionObjects.push(plyMesh);
        }
        
        // Add the permanent ground plane for raycasting
        if (groundPlane) {
            intersectionObjects.push(groundPlane);
        }

        const intersects = this.raycaster.intersectObjects(intersectionObjects, false);
        
        if (intersects.length > 0) {
            const intersectionPoint = intersects[0].point;
            // Move handle to the intersection point (keep Y at fixed level for top-down view)
            this.setHandlePosition(intersectionPoint.x, intersectionPoint.z);
            
            // Notify about position change
            if (this.onHandlePositionChange) {
                this.onHandlePositionChange(intersectionPoint.x, intersectionPoint.z);
            }
        }
    }

    /**
     * Select the indicator handle and attach TransformControls
     */
    private selectHandle(): void {
        if (!this.transformControls) return;

        this.selectedObject = this.indicatorHandle.getObject3D();
        this.transformControls.attach(this.selectedObject);
        this.indicatorHandle.setSelected(true);

        if (this.onHandleSelected) {
            this.onHandleSelected(true);
        }
    }

    /**
     * Deselect the indicator handle and detach TransformControls
     */
    private deselectHandle(): void {
        if (!this.transformControls) return;

        this.selectedObject = null;
        this.transformControls.detach();
        this.indicatorHandle.setSelected(false);

        if (this.onHandleSelected) {
            this.onHandleSelected(false);
        }
    }

    /**
     * Set the position of the indicator handle
     * @param x X coordinate
     * @param z Z coordinate
     */
    setHandlePosition(x: number, z: number): void {
        this.indicatorHandle.setPosition(x, z);
        
        // Update TransformControls if handle is selected
        if (this.selectedObject === this.indicatorHandle.getObject3D() && this.transformControls) {
            this.transformControls.object.position.set(x, 0.1, z);
        }
    }

    /**
     * Get the current handle position
     */
    getHandlePosition(): { x: number, z: number } {
        const position = this.indicatorHandle.getPosition();
        return { x: position.x, z: position.z };
    }

    /**
     * Set callback for handle position changes
     * @param callback Function called when handle position changes
     */
    onHandlePositionChanged(callback: (x: number, z: number) => void): void {
        this.onHandlePositionChange = callback;
    }

    /**
     * Set callback for handle selection changes
     * @param callback Function called when handle selection state changes
     */
    onHandleSelectionChanged(callback: (selected: boolean) => void): void {
        this.onHandleSelected = callback;
    }

    /**
     * Set the coordinate transformation scale factors for mapping to point cloud view
     * @param scaleX Scale factor for X axis
     * @param scaleZ Scale factor for Z axis
     */
    setCoordinateScale(scaleX: number, scaleZ: number): void {
        this.coordinateScaleX = scaleX;
        this.coordinateScaleZ = scaleZ;
    }

    /**
     * Get the coordinate transformation scale factors
     * @returns Object with scaleX and scaleZ properties
     */
    getCoordinateScale(): { scaleX: number, scaleZ: number } {
        return { scaleX: this.coordinateScaleX, scaleZ: this.coordinateScaleZ };
    }

    /**
     * Set coordinate inversion flags for fine-tuning the transformation
     * @param invertX Whether to invert the X coordinate (true = negate X)
     * @param invertZ Whether to invert the Z coordinate (true = negate Z)
     */
    setCoordinateInversion(invertX: boolean, invertZ: boolean): void {
        this.invertCoordinateX = invertX;
        this.invertCoordinateZ = invertZ;
    }

    /**
     * Get the current coordinate inversion settings
     */
    getCoordinateInversion(): { invertX: boolean, invertZ: boolean } {
        return {
            invertX: this.invertCoordinateX,
            invertZ: this.invertCoordinateZ
        };
    }

    /**
     * Update camera aspect ratio
     */
    updateCameraAspect(aspect: number): void {
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
        // Animate the indicator handle
        this.indicatorHandle.animate();
        
        // Keep the model static for top-down view
        // (no rotation animation for orthographic view)
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
     * Get the indicator handle for direct access
     */
    getIndicatorHandle(): IndicatorHandle {
        return this.indicatorHandle;
    }

    /**
     * Check if controls are initialized
     */
    isControlsInitialized(): boolean {
        return this.isInitialized;
    }

    /**
     * Clean up resources
     */
    dispose(): void {
        // Clean up indicator handle
        this.indicatorHandle.dispose();

        // Clean up transform controls
        if (this.transformControls) {
            this.transformControls.dispose();
            this.scene.remove(this.transformControls as unknown as THREE.Object3D);
            this.transformControls = null;
        }

        // Clean up model mesh if it exists
        const mesh = this.scene.userData.mesh;
        if (mesh) {
            mesh.geometry.dispose();
            if (Array.isArray(mesh.material)) {
                mesh.material.forEach((mat: THREE.Material) => mat.dispose());
            } else {
                mesh.material.dispose();
            }
            this.scene.remove(mesh);
            delete this.scene.userData.mesh;
        }

        this.isInitialized = false;
    }
}
