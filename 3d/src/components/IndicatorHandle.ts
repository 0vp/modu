import * as THREE from 'three';

/**
 * IndicatorHandle class - A 2D indicator handle for top-down views
 * Provides a clickable handle that can be moved in X and Y directions using TransformControls
 */
export class IndicatorHandle {
    private handleGroup: THREE.Group;
    private handleMesh: THREE.Mesh;
    private outerRing: THREE.Mesh;
    private scene: THREE.Scene;
    private isSelected: boolean = false;

    /**
     * Create a new indicator handle
     * @param scene The THREE.js scene to add the handle to
     * @param radius Radius of the handle (default: 0.3)
     * @param color Color of the handle (default: bright cyan)
     */
    constructor(scene: THREE.Scene, radius: number = 0.3, color: number = 0x00ffff) {
        this.scene = scene;
        this.handleGroup = new THREE.Group();
        
        // Create the main handle (inner circle)
        this.handleMesh = this.createHandleMesh(radius, color);
        
        // Create the outer ring for better visibility
        this.outerRing = this.createOuterRing(radius * 1.5, color);
        
        // Add both to the group
        this.handleGroup.add(this.handleMesh);
        this.handleGroup.add(this.outerRing);
        
        // Add the group to the scene
        this.scene.add(this.handleGroup);
        
        // Position slightly above the ground plane to avoid z-fighting
        this.handleGroup.position.y = 0.1;
    }

    /**
     * Create the main handle mesh (solid circle)
     */
    private createHandleMesh(radius: number, color: number): THREE.Mesh {
        const geometry = new THREE.CylinderGeometry(radius, radius, 0.1, 16);
        const material = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.8
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        return mesh;
    }

    /**
     * Create the outer ring for better visual contrast
     */
    private createOuterRing(radius: number, color: number): THREE.Mesh {
        const outerGeometry = new THREE.RingGeometry(radius * 0.8, radius, 16);
        const outerMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.4,
            side: THREE.DoubleSide
        });
        
        const ring = new THREE.Mesh(outerGeometry, outerMaterial);
        ring.rotation.x = -Math.PI / 2; // Rotate to lay flat on the ground
        return ring;
    }

    /**
     * Set the position of the handle (X and Z coordinates for top-down view)
     * @param x X coordinate
     * @param z Z coordinate (Y is fixed for top-down view)
     */
    setPosition(x: number, z: number): void {
        this.handleGroup.position.x = x;
        this.handleGroup.position.z = z;
        // Keep Y position slightly above ground to avoid z-fighting
    }

    /**
     * Set the position using a Vector3 (only X and Z will be used)
     * @param position Vector3 position
     */
    setPositionVector(position: THREE.Vector3): void {
        this.setPosition(position.x, position.z);
    }

    /**
     * Get the current position as a Vector3
     */
    getPosition(): THREE.Vector3 {
        return this.handleGroup.position.clone();
    }

    /**
     * Get the handle group for TransformControls attachment
     */
    getObject3D(): THREE.Group {
        return this.handleGroup;
    }

    /**
     * Get the handle mesh for raycasting and selection
     */
    getHandleMesh(): THREE.Mesh {
        return this.handleMesh;
    }

    /**
     * Set the selected state of the handle
     * @param selected Whether the handle is selected
     */
    setSelected(selected: boolean): void {
        this.isSelected = selected;
        
        if (selected) {
            // Highlight the handle when selected
            (this.handleMesh.material as THREE.MeshBasicMaterial).opacity = 1.0;
            (this.handleMesh.material as THREE.MeshBasicMaterial).color.setHex(0xffff00); // Yellow when selected
            (this.outerRing.material as THREE.MeshBasicMaterial).opacity = 0.6;
        } else {
            // Reset to normal appearance
            (this.handleMesh.material as THREE.MeshBasicMaterial).opacity = 0.8;
            (this.handleMesh.material as THREE.MeshBasicMaterial).color.setHex(0x00ffff); // Cyan when not selected
            (this.outerRing.material as THREE.MeshBasicMaterial).opacity = 0.4;
        }
    }

    /**
     * Check if the handle is currently selected
     */
    isSelectedState(): boolean {
        return this.isSelected;
    }

    /**
     * Set the visibility of the handle
     * @param visible Whether the handle should be visible
     */
    setVisible(visible: boolean): void {
        this.handleGroup.visible = visible;
    }

    /**
     * Set the color of the handle
     * @param color Color as hex number (e.g., 0x00ffff)
     */
    setColor(color: number): void {
        (this.handleMesh.material as THREE.MeshBasicMaterial).color.setHex(color);
        (this.outerRing.material as THREE.MeshBasicMaterial).color.setHex(color);
    }

    /**
     * Set the scale of the handle
     * @param scale Uniform scale factor
     */
    setScale(scale: number): void {
        this.handleGroup.scale.setScalar(scale);
    }

    /**
     * Add a pulsing animation effect (optional visual enhancement)
     */
    animate(): void {
        if (!this.isSelected) return;
        
        // Create a subtle pulsing effect when selected
        const time = Date.now() * 0.005;
        const pulseFactor = 1.0 + Math.sin(time) * 0.1; // 10% size variation
        this.handleMesh.scale.setScalar(pulseFactor);
    }

    /**
     * Check if a given object is part of this handle (for raycasting)
     * @param object The object to check
     */
    containsObject(object: THREE.Object3D): boolean {
        return this.handleGroup === object || this.handleGroup.children.includes(object);
    }

    /**
     * Get all meshes that can be intersected by raycasting
     */
    getIntersectableMeshes(): THREE.Mesh[] {
        return [this.handleMesh, this.outerRing];
    }

    /**
     * Clean up resources and remove from scene
     */
    dispose(): void {
        // Dispose of handle mesh
        this.handleMesh.geometry.dispose();
        (this.handleMesh.material as THREE.Material).dispose();

        // Dispose of outer ring
        this.outerRing.geometry.dispose();
        (this.outerRing.material as THREE.Material).dispose();

        // Remove from scene
        this.scene.remove(this.handleGroup);
    }
}
