// Letterbox/Pillarbox Detection Utility
// Uses variance analysis to detect uniform bars at edges of images/videos

export interface CropBounds {
  top: number
  bottom: number
  left: number
  right: number
}

export interface DetectionOptions {
  varianceThreshold?: number
  edgeThreshold?: number
  minBarThicknessPercent?: number
  samplePositions?: number[]
  consecutiveContentLines?: number
  maxScanPercent?: number
}

// Default detection constants
const DEFAULT_VARIANCE_THRESHOLD = 25 // Lower = more sensitive to content (reduced from 50)
const DEFAULT_EDGE_THRESHOLD = 10 // Gradient threshold for edge detection (reduced from 15)
const DEFAULT_SAMPLE_POSITIONS = [0.05, 0.25, 0.5, 0.75, 0.95] // Video sample points
const DEFAULT_MIN_BAR_THICKNESS_PERCENT = 0.03 // 3% of dimension (increased from 2%)
const DEFAULT_MAX_SCAN_PERCENT = 0.40 // Don't scan more than 40% from edge (reduced from 45%)
const DEFAULT_CONSECUTIVE_CONTENT_LINES = 5 // Require 5 consecutive content lines (increased from 3)
const MIN_CROP_SIZE = 50 // Minimum crop size in pixels

/**
 * Extract pixel data for a row (horizontal scan)
 */
function getRowPixels(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  row: number,
  fromBottom: boolean
): number[] {
  const actualRow = fromBottom ? height - 1 - row : row
  const start = actualRow * width * 4
  const end = start + width * 4
  return Array.from(data.slice(start, end))
}

/**
 * Extract pixel data for a column (vertical scan)
 */
function getColumnPixels(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  col: number,
  fromRight: boolean
): number[] {
  const actualCol = fromRight ? width - 1 - col : col
  const pixels: number[] = []

  for (let y = 0; y < height; y++) {
    const idx = (y * width + actualCol) * 4
    pixels.push(data[idx], data[idx + 1], data[idx + 2], data[idx + 3])
  }

  return pixels
}

/**
 * Calculate luminance using Rec. 709 luma coefficients
 */
function calculateLuminance(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/**
 * Calculate variance of pixel luminance values
 * Letterbox bars have low variance (uniform color)
 * Content has high variance (details, edges, textures)
 */
function calculateVariance(pixels: number[]): number {
  // Calculate luminance for each pixel using Rec. 709 coefficients
  const luminances: number[] = []
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i]
    const g = pixels[i + 1]
    const b = pixels[i + 2]
    luminances.push(calculateLuminance(r, g, b))
  }

  if (luminances.length === 0) return 0

  // Calculate mean
  const mean = luminances.reduce((a, b) => a + b, 0) / luminances.length

  // Calculate variance
  const variance =
    luminances.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) /
    luminances.length

  return variance
}

/**
 * Calculate edge strength between two adjacent lines
 * Detects transitions from uniform bars to content
 */
function calculateEdgeStrength(
  currentLine: number[],
  previousLine: number[]
): number {
  if (currentLine.length !== previousLine.length) return 0

  let totalDiff = 0
  let count = 0

  for (let i = 0; i < currentLine.length; i += 4) {
    const currLuma = calculateLuminance(
      currentLine[i],
      currentLine[i + 1],
      currentLine[i + 2]
    )
    const prevLuma = calculateLuminance(
      previousLine[i],
      previousLine[i + 1],
      previousLine[i + 2]
    )
    totalDiff += Math.abs(currLuma - prevLuma)
    count++
  }

  return count > 0 ? totalDiff / count : 0
}

/**
 * Scan from an edge inward to detect letterbox bar
 * Returns the position where content begins (bar thickness)
 */
function scanEdge(
  imageData: ImageData,
  edge: 'top' | 'bottom' | 'left' | 'right',
  options: Required<DetectionOptions>
): number {
  const { width, height, data } = imageData
  const isHorizontal = edge === 'top' || edge === 'bottom'
  const maxDimension = isHorizontal ? height : width
  const maxScan = Math.floor(maxDimension * options.maxScanPercent)

  let consecutiveContent = 0
  let prevLinePixels: number[] | null = null

  for (let i = 0; i < maxScan; i++) {
    const linePixels = isHorizontal
      ? getRowPixels(data, width, height, i, edge === 'bottom')
      : getColumnPixels(data, width, height, i, edge === 'right')

    const variance = calculateVariance(linePixels)
    const edgeStrength =
      prevLinePixels ? calculateEdgeStrength(linePixels, prevLinePixels) : 0

    // Content has high variance or high edge strength
    if (
      variance > options.varianceThreshold ||
      edgeStrength > options.edgeThreshold
    ) {
      consecutiveContent++
      if (consecutiveContent >= options.consecutiveContentLines) {
        // Found content boundary - return position minus the consecutive content lines
        return Math.max(0, i - options.consecutiveContentLines + 1)
      }
    } else {
      consecutiveContent = 0
    }

    prevLinePixels = linePixels
  }

  return 0 // No letterbox detected
}

/**
 * Detect letterbox bars in a single frame
 */
function detectLetterbox(
  imageData: ImageData,
  options: Required<DetectionOptions>
): CropBounds {
  const { width, height } = imageData

  // Scan each edge independently (handles asymmetric letterboxing)
  const top = scanEdge(imageData, 'top', options)
  const bottom = height - scanEdge(imageData, 'bottom', options)
  const left = scanEdge(imageData, 'left', options)
  const right = width - scanEdge(imageData, 'right', options)

  return { top, bottom, left, right }
}

/**
 * Validate detected bounds and filter out false positives
 */
function validateAndAdjust(
  bounds: CropBounds,
  width: number,
  height: number,
  options: Required<DetectionOptions>
): CropBounds | null {
  // Calculate bar thicknesses
  const topBar = bounds.top
  const bottomBar = height - bounds.bottom
  const leftBar = bounds.left
  const rightBar = width - bounds.right

  // Remove bars that are too small (likely false positives)
  const minThickness = Math.max(
    height * options.minBarThicknessPercent,
    width * options.minBarThicknessPercent
  )

  if (topBar < minThickness) bounds.top = 0
  if (bottomBar < minThickness) bounds.bottom = height
  if (leftBar < minThickness) bounds.left = 0
  if (rightBar < minThickness) bounds.right = width

  // Check if any letterboxing was detected
  const hasLetterbox =
    bounds.top > 0 ||
    bounds.bottom < height ||
    bounds.left > 0 ||
    bounds.right < width

  if (!hasLetterbox) return null

  // Ensure resulting crop meets minimum size
  const cropWidth = bounds.right - bounds.left
  const cropHeight = bounds.bottom - bounds.top

  if (cropWidth < MIN_CROP_SIZE || cropHeight < MIN_CROP_SIZE) {
    return null // Invalid crop - too small
  }

  // Ensure bounds are within image
  bounds.top = Math.max(0, Math.floor(bounds.top))
  bounds.bottom = Math.min(height, Math.floor(bounds.bottom))
  bounds.left = Math.max(0, Math.floor(bounds.left))
  bounds.right = Math.min(width, Math.floor(bounds.right))

  return bounds
}

/**
 * Sample multiple frames from a video at different time positions
 */
async function sampleVideoFrames(
  video: HTMLVideoElement,
  positions: number[]
): Promise<ImageData[]> {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Failed to get 2D context for video sampling')
  }

  canvas.width = video.videoWidth
  canvas.height = video.videoHeight

  const frames: ImageData[] = []
  const originalTime = video.currentTime

  for (const pos of positions) {
    const targetTime = pos * video.duration

    // Seek to position
    video.currentTime = targetTime

    // Wait for seek to complete
    await new Promise<void>((resolve) => {
      const handleSeeked = () => {
        video.removeEventListener('seeked', handleSeeked)
        resolve()
      }
      video.addEventListener('seeked', handleSeeked)

      // Fallback timeout in case seeked never fires
      setTimeout(() => {
        video.removeEventListener('seeked', handleSeeked)
        resolve()
      }, 1000)
    })

    // Draw current frame to canvas
    ctx.drawImage(video, 0, 0)
    frames.push(ctx.getImageData(0, 0, canvas.width, canvas.height))
  }

  // Restore original time
  video.currentTime = originalTime

  return frames
}

/**
 * Detect letterbox in video by sampling multiple frames
 * Returns the intersection (most conservative crop) across all frames
 */
function detectVideoLetterbox(
  frames: ImageData[],
  options: Required<DetectionOptions>
): CropBounds | null {
  if (frames.length === 0) return null

  // Detect in each frame
  const detections = frames.map((frame) => detectLetterbox(frame, options))

  // Take intersection (most conservative crop) to ensure content is never cropped
  const bounds: CropBounds = {
    top: Math.max(...detections.map((d) => d.top)),
    bottom: Math.min(...detections.map((d) => d.bottom)),
    left: Math.max(...detections.map((d) => d.left)),
    right: Math.min(...detections.map((d) => d.right)),
  }

  // Validate the intersection
  const firstFrame = frames[0]
  return validateAndAdjust(
    bounds,
    firstFrame.width,
    firstFrame.height,
    options
  )
}

/**
 * Merge user options with defaults
 */
function mergeOptions(
  options?: DetectionOptions
): Required<DetectionOptions> {
  return {
    varianceThreshold: options?.varianceThreshold ?? DEFAULT_VARIANCE_THRESHOLD,
    edgeThreshold: options?.edgeThreshold ?? DEFAULT_EDGE_THRESHOLD,
    minBarThicknessPercent:
      options?.minBarThicknessPercent ?? DEFAULT_MIN_BAR_THICKNESS_PERCENT,
    samplePositions: options?.samplePositions ?? DEFAULT_SAMPLE_POSITIONS,
    consecutiveContentLines:
      options?.consecutiveContentLines ?? DEFAULT_CONSECUTIVE_CONTENT_LINES,
    maxScanPercent: options?.maxScanPercent ?? DEFAULT_MAX_SCAN_PERCENT,
  }
}

/**
 * Detect and remove letterboxing from an image
 * Returns crop bounds in source coordinates (naturalWidth/naturalHeight)
 */
export async function detectLetterboxInImage(
  img: HTMLImageElement,
  options?: DetectionOptions
): Promise<CropBounds | null> {
  const opts = mergeOptions(options)

  // Create canvas and extract image data
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Failed to get 2D context for image analysis')
  }

  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  ctx.drawImage(img, 0, 0)

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

  // Detect letterbox
  const bounds = detectLetterbox(imageData, opts)

  // Validate and return
  return validateAndAdjust(bounds, canvas.width, canvas.height, opts)
}

/**
 * Detect and remove letterboxing from a video
 * Samples multiple frames and returns conservative crop bounds
 * Returns crop bounds in source coordinates (videoWidth/videoHeight)
 */
export async function detectLetterboxInVideo(
  video: HTMLVideoElement,
  options?: DetectionOptions
): Promise<CropBounds | null> {
  const opts = mergeOptions(options)

  // Sample frames at different positions
  const frames = await sampleVideoFrames(video, opts.samplePositions)

  // Detect letterbox across all frames
  return detectVideoLetterbox(frames, opts)
}
