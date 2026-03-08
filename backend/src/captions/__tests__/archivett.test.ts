import { describe, it, expect } from 'vitest'
import {
  detectArchiveTT,
  parseArchiveTT,
  serializeToWebVTT,
  serializeToArchiveTT,
  parseWebVTT,
} from '../archivett.js'

describe('detectArchiveTT', () => {
  it('detects valid ArchiveTT text', () => {
    expect(detectArchiveTT('@0:05 Hello world')).toBe(true)
    expect(detectArchiveTT('@1:30 Some text')).toBe(true)
    expect(detectArchiveTT('@1:30:00 Some text')).toBe(true)
    expect(detectArchiveTT('@0:05.500 Some text')).toBe(true)
    expect(detectArchiveTT('Some intro\n@0:05 Hello')).toBe(true)
  })

  it('rejects non-ArchiveTT text', () => {
    expect(detectArchiveTT('Just plain text')).toBe(false)
    expect(detectArchiveTT('@ not a timestamp')).toBe(false)
    expect(detectArchiveTT('email@test.com')).toBe(false)
    expect(detectArchiveTT('')).toBe(false)
  })
})

describe('parseArchiveTT', () => {
  it('parses simple timestamps', () => {
    const result = parseArchiveTT('@0:05 Hello\n@0:10 World')
    expect(result).not.toBeNull()
    expect(result!.cues).toHaveLength(2)
    expect(result!.cues[0].startMs).toBe(5000)
    expect(result!.cues[0].text).toBe('Hello')
    expect(result!.cues[1].startMs).toBe(10000)
    expect(result!.cues[1].text).toBe('World')
  })

  it('parses minute:second timestamps', () => {
    const result = parseArchiveTT('@1:30 Text')
    expect(result!.cues[0].startMs).toBe(90000)
  })

  it('parses hour:minute:second timestamps', () => {
    const result = parseArchiveTT('@1:30:00 Text')
    expect(result!.cues[0].startMs).toBe(5400000)
  })

  it('parses millisecond precision', () => {
    const result = parseArchiveTT('@0:05.500 Text')
    expect(result!.cues[0].startMs).toBe(5500)
  })

  it('parses absolute end times', () => {
    const result = parseArchiveTT('@0:05-0:08 Text')
    expect(result!.cues[0].startMs).toBe(5000)
    expect(result!.cues[0].endMs).toBe(8000)
  })

  it('parses relative end times', () => {
    const result = parseArchiveTT('@0:05+3 Text')
    expect(result!.cues[0].startMs).toBe(5000)
    expect(result!.cues[0].endMs).toBe(8000)
  })

  it('parses relative end times with ms precision', () => {
    const result = parseArchiveTT('@0:05+3.5 Text')
    expect(result!.cues[0].startMs).toBe(5000)
    expect(result!.cues[0].endMs).toBe(8500)
  })

  it('parses voice tags', () => {
    const result = parseArchiveTT('@0:05 <Alice> Hello there')
    expect(result!.cues[0].voice).toBe('Alice')
    expect(result!.cues[0].text).toBe('Hello there')
  })

  it('parses placement', () => {
    const result = parseArchiveTT('@0:05 [top] Hello')
    expect(result!.cues[0].placement).toBe('top')
    expect(result!.cues[0].text).toBe('Hello')
  })

  it('parses placement and voice together', () => {
    const result = parseArchiveTT('@0:05 [left] <Bob> Hello')
    expect(result!.cues[0].placement).toBe('left')
    expect(result!.cues[0].voice).toBe('Bob')
    expect(result!.cues[0].text).toBe('Hello')
  })

  it('parses multi-line cues', () => {
    const result = parseArchiveTT('@0:05 Line one\nLine two\n@0:10 Next')
    expect(result!.cues[0].text).toBe('Line one\nLine two')
    expect(result!.cues[1].text).toBe('Next')
  })

  it('returns null for non-ArchiveTT text', () => {
    expect(parseArchiveTT('Just plain text')).toBeNull()
  })

  it('returns null for empty text', () => {
    expect(parseArchiveTT('')).toBeNull()
  })
})

describe('serializeToWebVTT', () => {
  it('serializes cues in captions mode', () => {
    const track = {
      cues: [
        { startMs: 5000, endMs: 8000, text: 'Hello' },
        { startMs: 10000, endMs: 13000, text: '[laughing] Ha ha' },
      ],
    }
    const vtt = serializeToWebVTT(track, 'captions')
    expect(vtt).toContain('WEBVTT')
    expect(vtt).toContain('00:00:05.000 --> 00:00:08.000')
    expect(vtt).toContain('Hello')
    expect(vtt).toContain('[laughing] Ha ha')
  })

  it('strips brackets in subtitles mode', () => {
    const track = {
      cues: [{ startMs: 5000, endMs: 8000, text: '[laughing] Ha ha' }],
    }
    const vtt = serializeToWebVTT(track, 'subtitles')
    expect(vtt).toContain('Ha ha')
    expect(vtt).not.toContain('[laughing]')
  })

  it('skips caption-only cues in subtitles mode', () => {
    const track = {
      cues: [
        { startMs: 5000, endMs: 8000, text: '[music playing]' },
        { startMs: 10000, endMs: 13000, text: 'Hello' },
      ],
    }
    const vtt = serializeToWebVTT(track, 'subtitles')
    expect(vtt).not.toContain('music playing')
    expect(vtt).toContain('Hello')
  })

  it('uses next cue start for null end times', () => {
    const track = {
      cues: [
        { startMs: 5000, endMs: null, text: 'First' },
        { startMs: 10000, endMs: 13000, text: 'Second' },
      ],
    }
    const vtt = serializeToWebVTT(track, 'captions')
    expect(vtt).toContain('00:00:05.000 --> 00:00:10.000')
  })

  it('uses 4s fallback for last cue with null end', () => {
    const track = {
      cues: [{ startMs: 5000, endMs: null, text: 'Last' }],
    }
    const vtt = serializeToWebVTT(track, 'captions')
    expect(vtt).toContain('00:00:05.000 --> 00:00:09.000')
  })

  it('adds placement settings', () => {
    const track = {
      cues: [
        {
          startMs: 5000,
          endMs: 8000,
          text: 'Top text',
          placement: 'top' as const,
        },
        {
          startMs: 10000,
          endMs: 13000,
          text: 'Left text',
          placement: 'left' as const,
        },
        {
          startMs: 15000,
          endMs: 18000,
          text: 'Right text',
          placement: 'right' as const,
        },
      ],
    }
    const vtt = serializeToWebVTT(track, 'captions')
    expect(vtt).toContain('line:10%')
    expect(vtt).toContain('position:5% align:start size:40%')
    expect(vtt).toContain('position:55% align:start size:40%')
  })

  it('adds voice tags', () => {
    const track = {
      cues: [{ startMs: 5000, endMs: 8000, text: 'Hello', voice: 'Alice' }],
    }
    const vtt = serializeToWebVTT(track, 'captions')
    expect(vtt).toContain('<v Alice>Hello</v>')
  })
})

describe('serializeToArchiveTT', () => {
  it('round-trips through parse and serialize', () => {
    const input = '@0:05 Hello world\n@0:10-0:13 Goodbye'
    const track = parseArchiveTT(input)!
    const output = serializeToArchiveTT(track)
    const reparsed = parseArchiveTT(output)
    expect(reparsed!.cues).toHaveLength(2)
    expect(reparsed!.cues[0].startMs).toBe(5000)
    expect(reparsed!.cues[0].text).toBe('Hello world')
    expect(reparsed!.cues[1].startMs).toBe(10000)
    expect(reparsed!.cues[1].endMs).toBe(13000)
  })
})

describe('parseWebVTT', () => {
  it('parses basic WebVTT', () => {
    const vtt = `WEBVTT

00:00:05.000 --> 00:00:08.000
Hello world

00:00:10.000 --> 00:00:13.000
Goodbye`
    const track = parseWebVTT(vtt)
    expect(track.cues).toHaveLength(2)
    expect(track.cues[0].startMs).toBe(5000)
    expect(track.cues[0].endMs).toBe(8000)
    expect(track.cues[0].text).toBe('Hello world')
  })

  it('parses voice tags', () => {
    const vtt = `WEBVTT

00:00:05.000 --> 00:00:08.000
<v Alice>Hello</v>`
    const track = parseWebVTT(vtt)
    expect(track.cues[0].voice).toBe('Alice')
    expect(track.cues[0].text).toBe('Hello')
  })

  it('parses placement settings', () => {
    const vtt = `WEBVTT

00:00:05.000 --> 00:00:08.000 line:10%
Top text`
    const track = parseWebVTT(vtt)
    expect(track.cues[0].placement).toBe('top')
  })
})
