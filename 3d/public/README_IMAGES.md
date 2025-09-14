# Point Cloud Image Requirements

To use the point cloud functionality, you need to add two images to the `public` folder:

## Required Images

1. **depth.png** - Grayscale depth map
   - Lighter pixels = closer to camera
   - Darker pixels = further from camera
   - Pure white pixels are filtered out to avoid distortion

2. **rgb.png** - Color image corresponding to the depth map
   - Should match the dimensions and perspective of the depth map
   - Provides color information for each point in the cloud

## Image Specifications

- Both images should have the same dimensions
- Recommended format: PNG
- For performance, images larger than 512x512 pixels will be automatically downsampled
- The point cloud renderer supports any reasonable image size

## Current State

The application will show a fallback red cube in View 1 until you add the required images.
Once you add `depth.png` and `rgb.png` to the `public` folder, the point cloud will automatically load.

## Controls

- **FOV Slider**: Adjusts the field of view correction to reduce perspective distortion
- The camera in View 1 is fixed (no orbit controls) as requested
- The point cloud slowly rotates for better depth perception
