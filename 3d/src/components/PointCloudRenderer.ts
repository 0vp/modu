import * as THREE from 'three';

/**
 * Point Cloud Renderer class that handles depth map to 3D point cloud conversion
 * Uses perspective projection to create realistic 3D point clouds from depth and color images
 */
export class PointCloudRenderer {
    private scene: THREE.Scene;
    private pointCloud: THREE.Points | null = null;
    private depthTexture: THREE.Texture | null = null;
    private colorTexture: THREE.Texture | null = null;
    private fovCorrection: number = 75;
    private isLoaded: boolean = false;

    constructor(scene: THREE.Scene) {
        this.scene = scene;
    }

    /**
     * Load depth and color textures from image files
     * @param depthPath Path to the depth map image (grayscale)
     * @param colorPath Path to the RGB color image
     */
    async loadTextures(depthPath: string, colorPath: string): Promise<void> {
        const textureLoader = new THREE.TextureLoader();
        
        try {
            // Load textures in parallel
            const [depthTexture, colorTexture] = await Promise.all([
                this.loadTexture(textureLoader, depthPath),
                this.loadTexture(textureLoader, colorPath)
            ]);

            this.depthTexture = depthTexture;
            this.colorTexture = colorTexture;
            this.isLoaded = true;

            // Generate initial point cloud
            this.generatePointCloud();
        } catch (error) {
            console.error('Error loading point cloud textures:', error);
            throw error;
        }
    }

    /**
     * Helper method to load a single texture with Promise support
     */
    private loadTexture(loader: THREE.TextureLoader, path: string): Promise<THREE.Texture> {
        return new Promise((resolve, reject) => {
            loader.load(
                path,
                (texture) => resolve(texture),
                undefined,
                (error) => reject(error)
            );
        });
    }

    /**
     * Update the FOV correction value and regenerate the point cloud
     * @param fov Field of view in degrees
     */
    updateFOV(fov: number): void {
        this.fovCorrection = fov;
        if (this.isLoaded) {
            this.generatePointCloud();
        }
    }

    /**
     * Generate the 3D point cloud from depth and color data
     * Uses perspective correction to avoid distortion artifacts
     */
    private generatePointCloud(): void {
        if (!this.depthTexture || !this.colorTexture) {
            console.warn('Textures not loaded yet');
            return;
        }

        const depthImg = this.depthTexture.image;
        const colorImg = this.colorTexture.image;

        let { width, height } = depthImg;
        const maxResolution = 512 * 512; // Performance cap

        // Downsample for performance if needed
        if (width * height > maxResolution) {
            const ratio = Math.sqrt(maxResolution / (width * height));
            width = Math.floor(width * ratio);
            height = Math.floor(height * ratio);
            console.log(`Point cloud downsampled to ${width}x${height}`);
        }

        // Extract image data
        const { depthData, colorData } = this.extractImageData(depthImg, colorImg, width, height);

        // Generate 3D points with perspective correction
        const { positions, colors } = this.generatePoints(depthData, colorData, width, height);

        // Update or create point cloud geometry
        this.updatePointCloudGeometry(positions, colors);
    }

    /**
     * Extract pixel data from depth and color images
     */
    private extractImageData(depthImg: HTMLImageElement, colorImg: HTMLImageElement, width: number, height: number) {
        // Create canvas for depth data
        const depthCanvas = document.createElement('canvas');
        depthCanvas.width = width;
        depthCanvas.height = height;
        const depthCtx = depthCanvas.getContext('2d', { willReadFrequently: true })!;
        depthCtx.drawImage(depthImg, 0, 0, width, height);
        const depthData = depthCtx.getImageData(0, 0, width, height).data;

        // Create canvas for color data
        const colorCanvas = document.createElement('canvas');
        colorCanvas.width = width;
        colorCanvas.height = height;
        const colorCtx = colorCanvas.getContext('2d', { willReadFrequently: true })!;
        colorCtx.drawImage(colorImg, 0, 0, width, height);
        const colorData = colorCtx.getImageData(0, 0, width, height).data;

        return { depthData, colorData };
    }

    /**
     * Generate 3D points from depth and color data with perspective correction
     */
    private generatePoints(depthData: Uint8ClampedArray, colorData: Uint8ClampedArray, width: number, height: number) {
        const fov = THREE.MathUtils.degToRad(this.fovCorrection);
        const focalLength = height / (2 * Math.tan(fov / 2));
        const depthScale = 0.5; // Controls depth of the cloud
        const pointCount = width * height;

        // Temporary arrays for filtering out invalid points
        const tempPositions: number[] = [];
        const tempColors: number[] = [];
        const depthThreshold = 0.99; // Filter out points that are too close (too white)

        const centerX = width / 2;
        const centerY = height / 2;

        for (let i = 0; i < pointCount; i++) {
            // Get grayscale depth value (0-1)
            const grayscale = depthData[i * 4] / 255;
            
            // Skip points that are too close to avoid distortion
            if (grayscale > depthThreshold) {
                continue;
            }

            // Convert depth: lighter = closer, darker = further
            const z = (1.0 - grayscale) * 255 * depthScale;
            
            // Get 2D pixel coordinates
            const u = i % width;
            const v = Math.floor(i / width);

            // Unproject 2D pixel into 3D space using perspective correction
            const x = (u - centerX) * (z / focalLength);
            const y = (v - centerY) * (z / focalLength);
            
            // Add 3D position (note: -y and -z for proper orientation)
            tempPositions.push(x, -y, -z);
            
            // Add RGB color
            const colorIdx = i * 4;
            tempColors.push(
                colorData[colorIdx] / 255,      // R
                colorData[colorIdx + 1] / 255,  // G
                colorData[colorIdx + 2] / 255   // B
            );
        }
        
        return {
            positions: new Float32Array(tempPositions),
            colors: new Float32Array(tempColors)
        };
    }

    /**
     * Update or create the Three.js point cloud geometry
     */
    private updatePointCloudGeometry(positions: Float32Array, colors: Float32Array): void {
        if (!this.pointCloud) {
            // Create new point cloud
            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
            
            const material = new THREE.PointsMaterial({
                size: 1.0,
                vertexColors: true,
                sizeAttenuation: true // Points get smaller with distance
            });
            
            this.pointCloud = new THREE.Points(geometry, material);
            this.scene.add(this.pointCloud);
        } else {
            // Update existing point cloud (dispose old geometry first)
            this.pointCloud.geometry.dispose();
            const newGeometry = new THREE.BufferGeometry();
            newGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            newGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
            this.pointCloud.geometry = newGeometry;
        }
    }

    /**
     * Get the current point cloud object for external manipulation
     */
    getPointCloud(): THREE.Points | null {
        return this.pointCloud;
    }

    /**
     * Check if textures are loaded and point cloud is ready
     */
    isReady(): boolean {
        return this.isLoaded;
    }

    /**
     * Clean up resources
     */
    dispose(): void {
        if (this.pointCloud) {
            this.pointCloud.geometry.dispose();
            (this.pointCloud.material as THREE.PointsMaterial).dispose();
            this.scene.remove(this.pointCloud);
            this.pointCloud = null;
        }
        
        if (this.depthTexture) {
            this.depthTexture.dispose();
            this.depthTexture = null;
        }
        
        if (this.colorTexture) {
            this.colorTexture.dispose();
            this.colorTexture = null;
        }
        
        this.isLoaded = false;
    }
}
