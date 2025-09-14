/**
 * UI Controller for Point Cloud controls
 * Manages the FOV slider and its interaction with the point cloud renderer
 */
export class PointCloudUI {
    private container: HTMLElement;
    private fovSlider!: HTMLInputElement;
    private fovValue!: HTMLSpanElement;
    private onFOVChange: (fov: number) => void;

    constructor(onFOVChange: (fov: number) => void) {
        this.onFOVChange = onFOVChange;
        this.container = this.createUI();
        this.setupEventListeners();
        document.body.appendChild(this.container);
    }

    /**
     * Create the UI panel HTML structure
     */
    private createUI(): HTMLElement {
        const panel = document.createElement('div');
        panel.id = 'point-cloud-controls';
        panel.innerHTML = `
            <h3>Point Cloud Controls</h3>
            <div class="control-group">
                <label for="fov-slider">FOV Correction: <span id="fov-value">75</span>°</label>
                <input type="range" id="fov-slider" min="10" max="150" value="75" step="1">
                <small>Adjust to flatten perspective distortion.</small>
            </div>
        `;

        // Apply styles
        this.applyStyles(panel);

        // Get references to interactive elements
        this.fovSlider = panel.querySelector('#fov-slider') as HTMLInputElement;
        this.fovValue = panel.querySelector('#fov-value') as HTMLSpanElement;

        return panel;
    }

    /**
     * Apply CSS styles to the UI panel
     */
    private applyStyles(panel: HTMLElement): void {
        panel.style.cssText = `
            position: fixed;
            top: 10px;
            left: 10px;
            padding: 15px 20px;
            background-color: rgba(0, 0, 0, 0.8);
            border-radius: 10px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            width: 280px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.4);
            color: white;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            font-size: 14px;
            z-index: 1000;
            backdrop-filter: blur(10px);
        `;

        // Style the heading
        const heading = panel.querySelector('h3') as HTMLElement;
        if (heading) {
            heading.style.cssText = `
                margin: 0 0 15px 0;
                font-size: 1.1em;
                border-bottom: 1px solid #444;
                padding-bottom: 8px;
                color: #fff;
            `;
        }

        // Style control groups
        const controlGroups = panel.querySelectorAll('.control-group');
        controlGroups.forEach(group => {
            (group as HTMLElement).style.cssText = `
                margin: 15px 0;
            `;
        });

        // Style labels
        const labels = panel.querySelectorAll('label');
        labels.forEach(label => {
            (label as HTMLElement).style.cssText = `
                display: block;
                margin-bottom: 8px;
                font-size: 0.9em;
                color: #fff;
            `;
        });

        // Style range input
        const rangeInput = panel.querySelector('input[type="range"]') as HTMLInputElement;
        if (rangeInput) {
            rangeInput.style.cssText = `
                width: 100%;
                cursor: pointer;
                height: 6px;
                background: #333;
                border-radius: 3px;
                outline: none;
                opacity: 0.7;
                transition: opacity 0.2s;
            `;

            // Add hover effect
            rangeInput.addEventListener('mouseenter', () => {
                rangeInput.style.opacity = '1';
            });
            rangeInput.addEventListener('mouseleave', () => {
                rangeInput.style.opacity = '0.7';
            });
        }

        // Style small text
        const smallTexts = panel.querySelectorAll('small');
        smallTexts.forEach(small => {
            (small as HTMLElement).style.cssText = `
                color: #aaa;
                font-size: 0.8em;
                display: block;
                margin-top: 4px;
            `;
        });
    }

    /**
     * Set up event listeners for UI interactions
     */
    private setupEventListeners(): void {
        this.fovSlider.addEventListener('input', (e) => {
            const fov = parseInt((e.target as HTMLInputElement).value);
            this.fovValue.textContent = fov.toString();
            this.onFOVChange(fov);
        });
    }

    /**
     * Update the FOV value programmatically
     */
    setFOV(fov: number): void {
        this.fovSlider.value = fov.toString();
        this.fovValue.textContent = fov.toString();
    }

    /**
     * Get the current FOV value
     */
    getFOV(): number {
        return parseInt(this.fovSlider.value);
    }

    /**
     * Show the UI panel
     */
    show(): void {
        this.container.style.display = 'block';
    }

    /**
     * Hide the UI panel
     */
    hide(): void {
        this.container.style.display = 'none';
    }

    /**
     * Toggle UI panel visibility
     */
    toggle(): void {
        this.container.style.display = this.container.style.display === 'none' ? 'block' : 'none';
    }

    /**
     * Clean up and remove the UI
     */
    dispose(): void {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}
