// Shared constants for FileTransformModal system

export const CROP_CONSTANTS = {
  // Validation margins (in pixels for crop offsets)
  MARGIN: 5,

  // Video display and interaction
  VIDEO_MARGIN: 16, // Margin around video for handles/interaction

  // Handle sizing
  HANDLE_SIZE: 12,
  HANDLE_TOLERANCE: 6,

  // Crop size constraints
  MIN_SIZE: 50, // Minimum crop size in pixels
  MIN_SIZE_FOR_LABEL: 100, // Minimum crop size to show centered dimension label

  // Pixel preview
  PREVIEW_SIZE: 128, // Display size of preview box
  PREVIEW_SOURCE_SIZE: 10, // Source pixels to sample (10×10)
  PREVIEW_PADDING: 16, // Padding from video edges (inside VIDEO_MARGIN)
  PREVIEW_CURSOR_THRESHOLD: 150, // Distance to trigger position swap
} as const

export const TRIM_CONSTANTS = {
  // Validation margins (in seconds)
  MARGIN: 0.75,

  // Handle and UI sizing
  HANDLE_WIDTH: 16,
  BORDER_RADIUS: 8, // Border radius for handles and container
} as const
