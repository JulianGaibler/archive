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

// Default detection constants (Balanced settings: detect letterbox while avoiding false positives)
// Philosophy: Better to miss letterbox detection than to crop into actual content
const DEFAULT_VARIANCE_THRESHOLD = 18 // More sensitive to texture - dark scenes with detail register as content
const DEFAULT_EDGE_THRESHOLD = 5 // Detect subtle transitions from bars to content
const DEFAULT_SAMPLE_POSITIONS = [0.05, 0.25, 0.5, 0.75, 0.95] // Video sample points
const DEFAULT_MIN_BAR_THICKNESS_PERCENT = 0.05 // 5% minimum - reasonable letterbox size (1080p = 54px)
const DEFAULT_MAX_SCAN_PERCENT = 0.3 // Scan up to 30% from edge - balanced depth
const DEFAULT_CONSECUTIVE_CONTENT_LINES = 8 // Require strong evidence of content before stopping scan
const MIN_CROP_SIZE = 50 // Minimum crop size in pixels

/**
 * Extract pixel data for a segment of a row (horizontal scan) Used for
 * multi-segment sampling to avoid false positives from dark content areas
 *
 * @param segmentStart - Start position as fraction (0.0 to 1.0)
 * @param segmentEnd - End position as fraction (0.0 to 1.0)
 */
function getRowSegmentPixels(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  row: number,
  fromBottom: boolean,
  segmentStart: number,
  segmentEnd: number,
): number[] {
  const actualRow = fromBottom ? height - 1 - row : row
  const startCol = Math.floor(width * segmentStart)
  const endCol = Math.floor(width * segmentEnd)
  const rowStart = actualRow * width * 4

  const pixels: number[] = []
  for (let col = startCol; col < endCol; col++) {
    const idx = rowStart + col * 4
    pixels.push(data[idx], data[idx + 1], data[idx + 2], data[idx + 3])
  }

  return pixels
}

/**
 * Extract pixel data for a segment of a column (vertical scan) Used for
 * multi-segment sampling to avoid false positives from dark content areas
 *
 * @param segmentStart - Start position as fraction (0.0 to 1.0)
 * @param segmentEnd - End position as fraction (0.0 to 1.0)
 */
function getColumnSegmentPixels(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  col: number,
  fromRight: boolean,
  segmentStart: number,
  segmentEnd: number,
): number[] {
  const actualCol = fromRight ? width - 1 - col : col
  const startRow = Math.floor(height * segmentStart)
  const endRow = Math.floor(height * segmentEnd)

  const pixels: number[] = []
  for (let row = startRow; row < endRow; row++) {
    const idx = (row * width + actualCol) * 4
    pixels.push(data[idx], data[idx + 1], data[idx + 2], data[idx + 3])
  }

  return pixels
}

/** Calculate luminance using Rec. 709 luma coefficients */
function calculateLuminance(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/**
 * Calculate variance of pixel luminance values Letterbox bars have low variance
 * (uniform color) Content has high variance (details, edges, textures)
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
 * Calculate edge strength between two adjacent lines Detects transitions from
 * uniform bars to content
 */
function calculateEdgeStrength(
  currentLine: number[],
  previousLine: number[],
): number {
  if (currentLine.length !== previousLine.length) return 0

  let totalDiff = 0
  let count = 0

  for (let i = 0; i < currentLine.length; i += 4) {
    const currLuma = calculateLuminance(
      currentLine[i],
      currentLine[i + 1],
      currentLine[i + 2],
    )
    const prevLuma = calculateLuminance(
      previousLine[i],
      previousLine[i + 1],
      previousLine[i + 2],
    )
    totalDiff += Math.abs(currLuma - prevLuma)
    count++
  }

  return count > 0 ? totalDiff / count : 0
}

/**
 * Scan from an edge inward to detect letterbox bar. Uses multi-segment sampling
 * to avoid false positives from dark content areas.
 *
 * For each scanline, samples 3 segments (left/center/right or
 * top/middle/bottom) and requires ALL segments to have low variance before
 * considering it a letterbox bar. If ANY segment shows texture/detail, it's
 * treated as content.
 *
 * Based on research: "Automatic Letter/Pillarbox Detection for Optimized
 * Display of Digital TV" (Carreira & Queluz, 2014) with enhanced multi-segment
 * approach.
 *
 * Returns the position where content begins (bar thickness).
 */
function scanEdge(
  imageData: ImageData,
  edge: 'top' | 'bottom' | 'left' | 'right',
  options: Required<DetectionOptions>,
): number {
  const { width, height, data } = imageData
  const isHorizontal = edge === 'top' || edge === 'bottom'
  const maxDimension = isHorizontal ? height : width
  const maxScan = Math.floor(maxDimension * options.maxScanPercent)

  // Define sampling segments (left/top 20%, center 20%, right/bottom 20%)
  // Avoids edges where logos might be, focuses on content areas
  const SAMPLE_SEGMENTS = [
    { start: 0.1, end: 0.3 }, // Left/Top 20%
    { start: 0.4, end: 0.6 }, // Center 20%
    { start: 0.7, end: 0.9 }, // Right/Bottom 20%
  ]

  let consecutiveContent = 0
  let prevSegments: number[][] | null = null

  for (let i = 0; i < maxScan; i++) {
    // Sample multiple segments across the scanline
    const currentSegments = SAMPLE_SEGMENTS.map((seg) =>
      isHorizontal
        ? getRowSegmentPixels(
            data,
            width,
            height,
            i,
            edge === 'bottom',
            seg.start,
            seg.end,
          )
        : getColumnSegmentPixels(
            data,
            width,
            height,
            i,
            edge === 'right',
            seg.start,
            seg.end,
          ),
    )

    // Calculate variance for each segment
    const variances = currentSegments.map((segment) =>
      calculateVariance(segment),
    )

    // Calculate edge strength for each segment (if we have previous segments)
    const edgeStrengths = prevSegments
      ? currentSegments.map((segment, idx) =>
          calculateEdgeStrength(segment, prevSegments![idx]),
        )
      : currentSegments.map(() => 0)

    // Check if ANY segment shows content characteristics
    const hasContentVariance = variances.some(
      (v) => v > options.varianceThreshold,
    )
    const hasContentEdge = edgeStrengths.some((e) => e > options.edgeThreshold)

    // Content detected if ANY segment shows high variance or edge strength
    if (hasContentVariance || hasContentEdge) {
      consecutiveContent++
      if (consecutiveContent >= options.consecutiveContentLines) {
        // Found content boundary - return position minus the consecutive content lines
        const boundary = Math.max(0, i - options.consecutiveContentLines + 1)
        return boundary
      }
    } else {
      consecutiveContent = 0
    }

    prevSegments = currentSegments
  }

  return 0 // No letterbox detected
}

/** Detect letterbox bars in a single frame */
function detectLetterbox(
  imageData: ImageData,
  options: Required<DetectionOptions>,
): CropBounds {
  const { width, height } = imageData

  // Scan each edge independently (handles asymmetric letterboxing)
  const top = scanEdge(imageData, 'top', options)
  const bottom = height - scanEdge(imageData, 'bottom', options)
  const left = scanEdge(imageData, 'left', options)
  const right = width - scanEdge(imageData, 'right', options)

  return { top, bottom, left, right }
}

/** Validate detected bounds and filter out false positives */
function validateAndAdjust(
  bounds: CropBounds,
  width: number,
  height: number,
  options: Required<DetectionOptions>,
): CropBounds | null {
  // Calculate bar thicknesses
  const topBar = bounds.top
  const bottomBar = height - bounds.bottom
  const leftBar = bounds.left
  const rightBar = width - bounds.right

  // Remove bars that are too small (likely false positives)
  const minThickness = Math.max(
    height * options.minBarThicknessPercent,
    width * options.minBarThicknessPercent,
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

  // Validate crop ratio - reject if cropping too much content (safety check)
  const cropRatioHorizontal = (bounds.left + (width - bounds.right)) / width
  const cropRatioVertical = (bounds.top + (height - bounds.bottom)) / height
  const MAX_CROP_RATIO = 0.4 // Max 40% crop on any axis

  if (
    cropRatioHorizontal > MAX_CROP_RATIO ||
    cropRatioVertical > MAX_CROP_RATIO
  ) {
    return null
  }

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

/** Sample multiple frames from a video at different time positions */
async function sampleVideoFrames(
  video: HTMLVideoElement,
  positions: number[],
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
 * Calculate median value from array, filtering out outliers. More robust than
 * min/max for multi-frame detection.
 */
function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid]
}

/**
 * Detect letterbox in video by sampling multiple frames. Uses median to filter
 * out outlier frames (credits, fades, etc.)
 */
function detectVideoLetterbox(
  frames: ImageData[],
  options: Required<DetectionOptions>,
): CropBounds | null {
  if (frames.length === 0) return null

  // Detect in each frame
  const detections = frames.map((frame) => detectLetterbox(frame, options))

  // Use median to filter out outliers (credits, fades, etc.)
  const bounds: CropBounds = {
    top: median(detections.map((d) => d.top)),
    bottom: median(detections.map((d) => d.bottom)),
    left: median(detections.map((d) => d.left)),
    right: median(detections.map((d) => d.right)),
  }

  // Validate the median result
  const firstFrame = frames[0]
  return validateAndAdjust(bounds, firstFrame.width, firstFrame.height, options)
}

/** Merge user options with defaults */
function mergeOptions(options?: DetectionOptions): Required<DetectionOptions> {
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
 * Detect and remove letterboxing from an image Returns crop bounds in source
 * coordinates (naturalWidth/naturalHeight)
 */
export async function detectLetterboxInImage(
  img: HTMLImageElement,
  options?: DetectionOptions,
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
 * Detect and remove letterboxing from a video Samples multiple frames and
 * returns conservative crop bounds Returns crop bounds in source coordinates
 * (videoWidth/videoHeight)
 */
export async function detectLetterboxInVideo(
  video: HTMLVideoElement,
  options?: DetectionOptions,
): Promise<CropBounds | null> {
  const opts = mergeOptions(options)

  // Sample frames at different positions
  const frames = await sampleVideoFrames(video, opts.samplePositions)

  // Detect letterbox across all frames
  return detectVideoLetterbox(frames, opts)
}
