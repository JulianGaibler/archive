# Audio Normalization

Audio normalization uses EBU R128 loudness standards via FFmpeg's `loudnorm` filter with two-pass processing.

## Implementation

**File:** `src/files/ffmpeg-wrapper.ts` (`normalizeAudio` method)

### Two-Pass Processing

1. **Pass 1 (Analysis):** Runs `loudnorm` with `print_format=json` to measure input loudness (integrated loudness, LRA, true peak, threshold).
2. **Pass 2 (Apply):** Applies `loudnorm` in linear mode using the measured values from pass 1 for precise normalization.

### Audio Filter Chain

```
loudnorm → aresample=async=1:first_pts=0 → asetpts=PTS-STARTPTS → apad
```

- **loudnorm**: EBU R128 normalization with measured parameters from pass 1
- **aresample**: Resamples and cleans up timestamp discontinuities introduced by loudnorm's internal 192kHz upsampling
- **asetpts**: Resets presentation timestamps to start from zero
- **apad**: Pads silence to cover any A/V length mismatch (only when video stream is present; requires `-shortest` output flag)

### A/V Sync Flags

Defined in `src/files/config.ts` (`avSyncOptions`):

- **Input:** `-fflags +genpts` (regenerate presentation timestamps)
- **Output:** `-shortest` (stop encoding when the shortest stream ends, needed to terminate `apad`)

### Audio-Only Processing

When no video stream is present, `apad` and `-shortest` are omitted. The `-shortest` flag doesn't work correctly without a video stream and would cause FFmpeg to hang.

## Filter Chain Order (Important)

The `aresample` filter **must** run after `loudnorm`, not before. The `loudnorm` filter internally upsamples audio to 192kHz for processing and then downsamples back. This can introduce timestamp discontinuities in the output stream. Placing `aresample` (with `async=1`) after `loudnorm` allows it to detect and correct these discontinuities by inserting or dropping samples as needed.

### What happens if aresample runs before loudnorm

When `aresample` runs first, it cleans up input timestamps but has no visibility into the discontinuities that `loudnorm` introduces afterward. The resulting timestamp gaps are:

- **Tolerated by Chrome** (its media pipeline compensates automatically)
- **Not tolerated by Firefox** (causes a single audio gap/skip on first playback, does not reproduce on subsequent plays)

This was diagnosed and fixed in March 2026. See git history for the commit.
