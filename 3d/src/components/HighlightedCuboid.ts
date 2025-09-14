import * as THREE from 'three';

/**
 * HighlightedCuboid class - A tall standing cuboid with bright green color,
 * blue wireframe, and aggressive pulsing animation effect
 */
export class HighlightedCuboid {
    private cuboidMesh: THREE.Mesh;
    private wireframeGroup: THREE.Group;
    private material: THREE.MeshStandardMaterial;
    private scene: THREE.Scene;
    private isAnimating: boolean = true;

    /**
     * Create a new highlighted cuboid
     * @param scene The THREE.js scene to add the cuboid to
     * @param width Width of the cuboid (default: 20)
     * @param height Height of the cuboid (default: 60)
     * @param depth Depth of the cuboid (default: 20)
     */
    constructor(scene: THREE.Scene, width: number = 20, height: number = 60, depth: number = 20) {
        this.scene = scene;
        
        // Create the cuboid geometry and material
        const geometry = new THREE.BoxGeometry(width, height, depth);
        this.material = new THREE.MeshStandardMaterial({
            color: 0x00ff00, // Bright green
            roughness: 0.3,
            metalness: 0.1,
            transparent: true,
            opacity: 0.8
        });
        
        // Create the cuboid mesh
        this.cuboidMesh = new THREE.Mesh(geometry, this.material);
        
        // Create wireframe
        this.wireframeGroup = this.createWireframe(width, height, depth);
        
        // Add both to the scene
        this.scene.add(this.cuboidMesh);
        this.scene.add(this.wireframeGroup);
    }

    /**
     * Create a visible wireframe using tube geometry for the cuboid edges
     */
    private createWireframe(width: number, height: number, depth: number): THREE.Group {
        const wireframeGroup = new THREE.Group();
        const wireframeMaterial = new THREE.MeshBasicMaterial({
            color: 0x0088ff, // Bright blue
            transparent: true,
            opacity: 0.9
        });

        // Define the 12 edges of a cube
        const w = width / 2, h = height / 2, d = depth / 2; // Half dimensions
        const edges = [
            // Bottom face edges
            [[-w, -h, -d], [w, -h, -d]], // bottom front
            [[w, -h, -d], [w, -h, d]],   // bottom right
            [[w, -h, d], [-w, -h, d]],   // bottom back
            [[-w, -h, d], [-w, -h, -d]], // bottom left
            
            // Top face edges
            [[-w, h, -d], [w, h, -d]],   // top front
            [[w, h, -d], [w, h, d]],     // top right
            [[w, h, d], [-w, h, d]],     // top back
            [[-w, h, d], [-w, h, -d]],   // top left
            
            // Vertical edges
            [[-w, -h, -d], [-w, h, -d]], // front left
            [[w, -h, -d], [w, h, -d]],   // front right
            [[w, -h, d], [w, h, d]],     // back right
            [[-w, -h, d], [-w, h, d]]    // back left
        ];

        // Create tube geometry for each edge
        edges.forEach((edge) => {
            const points = [
                new THREE.Vector3(edge[0][0], edge[0][1], edge[0][2]),
                new THREE.Vector3(edge[1][0], edge[1][1], edge[1][2])
            ];
            
            const curve = new THREE.CatmullRomCurve3(points);
            const tubeGeometry = new THREE.TubeGeometry(curve, 1, 0.05, 4, false); // Reduced radius from 0.3 to 0.05
            const tubeMesh = new THREE.Mesh(tubeGeometry, wireframeMaterial);
            
            wireframeGroup.add(tubeMesh);
        });

        return wireframeGroup;
    }

    /**
     * Set the position of the cuboid
     * @param x X coordinate
     * @param y Y coordinate
     * @param z Z coordinate
     */
    setPosition(x: number, y: number, z: number): void {
        this.cuboidMesh.position.set(x, y, z);
        this.wireframeGroup.position.set(x, y, z);
    }

    /**
     * Set the position using a Vector3
     * @param position Vector3 position
     */
    setPositionVector(position: THREE.Vector3): void {
        this.cuboidMesh.position.copy(position);
        this.wireframeGroup.position.copy(position);
    }

    /**
     * Get the current position as a Vector3
     */
    getPosition(): THREE.Vector3 {
        return this.cuboidMesh.position.clone();
    }

    /**
     * Set the rotation of the cuboid
     * @param x X rotation in radians
     * @param y Y rotation in radians
     * @param z Z rotation in radians
     */
    setRotation(x: number, y: number, z: number): void {
        this.cuboidMesh.rotation.set(x, y, z);
        this.wireframeGroup.rotation.set(x, y, z);
    }

    /**
     * Set the scale of the cuboid
     * @param scale Uniform scale factor
     */
    setScale(scale: number): void {
        this.cuboidMesh.scale.setScalar(scale);
        this.wireframeGroup.scale.setScalar(scale);
    }

    /**
     * Set the scale with different values for each axis
     * @param x X scale
     * @param y Y scale
     * @param z Z scale
     */
    setScaleVector(x: number, y: number, z: number): void {
        this.cuboidMesh.scale.set(x, y, z);
        this.wireframeGroup.scale.set(x, y, z);
    }

    /**
     * Set the visibility of the cuboid
     * @param visible Whether the cuboid should be visible
     */
    setVisible(visible: boolean): void {
        this.cuboidMesh.visible = visible;
        this.wireframeGroup.visible = visible;
    }

    /**
     * Set the color of the cuboid
     * @param color Color as hex number (e.g., 0x00ff00)
     */
    setColor(color: number): void {
        this.material.color.setHex(color);
    }

    /**
     * Set the wireframe color
     * @param color Color as hex number (e.g., 0x0088ff)
     */
    setWireframeColor(color: number): void {
        this.wireframeGroup.children.forEach((child) => {
            if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial) {
                child.material.color.setHex(color);
            }
        });
    }

    /**
     * Enable or disable the pulsing animation
     * @param animate Whether to animate the pulsing effect
     */
    setAnimating(animate: boolean): void {
        this.isAnimating = animate;
        if (!animate) {
            // Reset to default appearance when animation is disabled
            this.material.emissiveIntensity = 0.1;
            this.material.opacity = 0.8;
            this.material.color.setHex(0x00ff00);
        }
    }

    /**
     * Update the pulsing animation (should be called in the render loop)
     */
    animate(): void {
        if (!this.isAnimating) return;

        // Create aggressive pulsing effect: bright quickly, fade slowly
        const time = Date.now() * 0.008; // Faster animation speed
        
        // Use a custom easing function for quick bright, slow fade
        const pulsePhase = (time % (Math.PI * 2));
        let intensity;
        
        if (pulsePhase < Math.PI * 0.2) {
            // Very quick bright phase (20% of cycle)
            intensity = pulsePhase / (Math.PI * 0.2);
        } else {
            // Slower fade phase (80% of cycle)
            const fadePhase = (pulsePhase - Math.PI * 0.2) / (Math.PI * 1.8);
            intensity = 1.0 - fadePhase;
        }
        
        // Apply aggressive pulsing to the material's emissive property
        const baseIntensity = 0.05; // Lower base for more contrast
        const pulseIntensity = baseIntensity + (intensity * 0.8); // Higher peak intensity
        this.material.emissive.setHex(0x006600); // Brighter green base
        this.material.emissiveIntensity = pulseIntensity;
        
        // More dramatic opacity pulsing
        this.material.opacity = 0.4 + (intensity * 0.6); // Wider opacity range
        
        // Also pulse the base color intensity for extra drama
        const colorIntensity = 0.7 + (intensity * 0.3);
        this.material.color.setHex(0x00ff00).multiplyScalar(colorIntensity);
    }

    /**
     * Get the cuboid mesh for direct manipulation if needed
     */
    getMesh(): THREE.Mesh {
        return this.cuboidMesh;
    }

    /**
     * Get the wireframe group for direct manipulation if needed
     */
    getWireframe(): THREE.Group {
        return this.wireframeGroup;
    }

    /**
     * Clean up resources and remove from scene
     */
    dispose(): void {
        // Dispose of cuboid
        this.cuboidMesh.geometry.dispose();
        this.material.dispose();
        this.scene.remove(this.cuboidMesh);

        // Dispose of wireframe
        this.wireframeGroup.children.forEach((child) => {
            if (child instanceof THREE.Mesh) {
                child.geometry.dispose();
                if (Array.isArray(child.material)) {
                    child.material.forEach(mat => mat.dispose());
                } else {
                    child.material.dispose();
                }
            }
        });
        this.scene.remove(this.wireframeGroup);
    }
}
