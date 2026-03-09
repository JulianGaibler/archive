import type { Cue } from 'archive-shared/src/captions'

/**
 * Resolve the effective end time of a cue. If endMs is set, returns it.
 * Otherwise returns the next cue's startMs, or durationMs for the last cue.
 */
export function resolveEndMs(
  cues: Cue[],
  index: number,
  durationMs: number,
): number {
  if (index < 0 || index >= cues.length) return durationMs
  const cue = cues[index]
  if (cue.endMs != null) return cue.endMs
  if (index < cues.length - 1) return cues[index + 1].startMs
  return durationMs
}

/**
 * Add a new empty cue at the given time, inserted in sorted order. Returns a
 * new array and the index of the new cue.
 */
export function addCue(
  cues: Cue[],
  timeMs: number,
): { cues: Cue[]; newIndex: number } {
  const newCue: Cue = {
    startMs: timeMs,
    endMs: null,
    text: '',
  }

  const newCues = [...cues]
  let insertAt = newCues.length
  for (let i = 0; i < newCues.length; i++) {
    if (newCues[i].startMs > timeMs) {
      insertAt = i
      break
    }
  }

  newCues.splice(insertAt, 0, newCue)
  return { cues: newCues, newIndex: insertAt }
}

/**
 * Delete the cue at the given index. Returns a new array and a suggested new
 * selected index.
 */
export function deleteCue(
  cues: Cue[],
  index: number,
): { cues: Cue[]; newSelectedIndex: number } {
  if (index < 0 || index >= cues.length) {
    return { cues: [...cues], newSelectedIndex: -1 }
  }

  const newCues = cues.filter((_, i) => i !== index)
  let newSelectedIndex = -1
  if (newCues.length > 0) {
    newSelectedIndex = Math.min(index, newCues.length - 1)
  }

  return { cues: newCues, newSelectedIndex }
}

/**
 * Split the cue at the given index at `atMs`. First half keeps original text,
 * second half gets empty text. Returns a new array and the index of the second
 * (new) cue.
 */
export function splitCue(
  cues: Cue[],
  index: number,
  atMs: number,
): { cues: Cue[]; newIndex: number } {
  if (index < 0 || index >= cues.length) {
    return { cues: [...cues], newIndex: -1 }
  }

  const original = cues[index]
  if (atMs <= original.startMs) {
    return { cues: [...cues], newIndex: index }
  }

  const firstHalf: Cue = {
    ...original,
    endMs: original.endMs != null ? atMs : null,
  }

  const secondHalf: Cue = {
    startMs: atMs,
    endMs: original.endMs,
    text: '',
    ...(original.voice ? { voice: original.voice } : {}),
    ...(original.placement ? { placement: original.placement } : {}),
  }

  const newCues = [...cues]
  newCues.splice(index, 1, firstHalf, secondHalf)
  return { cues: newCues, newIndex: index + 1 }
}

/**
 * Update the start time of a cue, clamping to avoid overlapping the previous
 * cue.
 */
export function updateCueStart(
  cues: Cue[],
  index: number,
  newStartMs: number,
): Cue[] {
  if (index < 0 || index >= cues.length) return [...cues]

  const minStart = index > 0 ? cues[index - 1].startMs + 1 : 0
  const clamped = Math.max(newStartMs, minStart)

  const newCues = [...cues]
  newCues[index] = { ...newCues[index], startMs: clamped }
  return newCues
}

/** Update the end time of a cue, clamping to avoid overlapping the next cue. */
export function updateCueEnd(
  cues: Cue[],
  index: number,
  newEndMs: number,
): Cue[] {
  if (index < 0 || index >= cues.length) return [...cues]

  const cue = cues[index]
  const minEnd = cue.startMs + 1
  const maxEnd = index < cues.length - 1 ? cues[index + 1].startMs : Infinity
  const clamped = Math.min(Math.max(newEndMs, minEnd), maxEnd)

  const newCues = [...cues]
  newCues[index] = { ...newCues[index], endMs: clamped }
  return newCues
}

/**
 * Toggle lock on a cue's end time. If unlocked (endMs === null), sets endMs to
 * the resolved value. If locked, sets endMs to null.
 */
export function toggleCueLock(
  cues: Cue[],
  index: number,
  durationMs: number,
): Cue[] {
  if (index < 0 || index >= cues.length) return [...cues]

  const cue = cues[index]
  const newCues = [...cues]

  if (cue.endMs != null) {
    newCues[index] = { ...cue, endMs: null }
  } else {
    const resolved = resolveEndMs(cues, index, durationMs)
    newCues[index] = { ...cue, endMs: resolved }
  }

  return newCues
}
