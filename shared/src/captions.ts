export type Placement = "top" | "left" | "right";

export interface Cue {
  startMs: number;
  endMs: number | null;
  text: string;
  voice?: string;
  placement?: Placement;
}

export interface CaptionTrack {
  cues: Cue[];
}

const ARCHIVETT_PATTERN = /^@\d+:\d+(\.\d+)?/m;

export function detectArchiveTT(text: string): boolean {
  return ARCHIVETT_PATTERN.test(text);
}

function parseTimestamp(raw: string): number {
  const parts = raw.split(":");
  let ms = 0;

  if (parts.length === 3) {
    // h:m:s or h:m:s.ms
    ms += parseInt(parts[0], 10) * 3600000;
    ms += parseInt(parts[1], 10) * 60000;
    const secParts = parts[2].split(".");
    ms += parseInt(secParts[0], 10) * 1000;
    if (secParts[1]) {
      ms += parseInt(secParts[1].padEnd(3, "0").slice(0, 3), 10);
    }
  } else if (parts.length === 2) {
    // m:s or m:s.ms
    ms += parseInt(parts[0], 10) * 60000;
    const secParts = parts[1].split(".");
    ms += parseInt(secParts[0], 10) * 1000;
    if (secParts[1]) {
      ms += parseInt(secParts[1].padEnd(3, "0").slice(0, 3), 10);
    }
  }

  return ms;
}

function parseRelativeEnd(raw: string): number {
  const parts = raw.split(".");
  let ms = parseInt(parts[0], 10) * 1000;
  if (parts[1]) {
    ms += parseInt(parts[1].padEnd(3, "0").slice(0, 3), 10);
  }
  return ms;
}

export function parseArchiveTT(text: string): CaptionTrack | null {
  if (!detectArchiveTT(text)) return null;

  const lines = text.split("\n");
  const cues: Cue[] = [];
  let currentCue: Partial<Cue> | null = null;
  let textLines: string[] = [];

  function finishCue() {
    if (currentCue && currentCue.startMs != null) {
      cues.push({
        startMs: currentCue.startMs,
        endMs: currentCue.endMs ?? null,
        text: textLines.join("\n").trim(),
        ...(currentCue.voice ? { voice: currentCue.voice } : {}),
        ...(currentCue.placement ? { placement: currentCue.placement } : {}),
      });
    }
    currentCue = null;
    textLines = [];
  }

  for (const line of lines) {
    const trimmed = line.trim();

    // Match @timestamp lines
    const match = trimmed.match(
      /^@(\d+:\d+(?::\d+)?(?:\.\d+)?)(?:-(\d+:\d+(?::\d+)?(?:\.\d+)?)|\+(\d+(?:\.\d+)?))?(?:\^([^^]*?)(?:\^(top|left|right))?)?(?:\s+(.*))?$/,
    );

    if (match) {
      finishCue();

      const startMs = parseTimestamp(match[1]);
      let endMs: number | null = null;

      if (match[2]) {
        endMs = parseTimestamp(match[2]);
      } else if (match[3]) {
        endMs = startMs + parseRelativeEnd(match[3]);
      }

      currentCue = { startMs, endMs };

      if (match[4]) {
        currentCue.voice = match[4];
      }
      if (match[5]) {
        currentCue.placement = match[5] as Placement;
      }

      const rest = match[6] || "";
      if (rest) {
        textLines.push(rest);
      }
    } else if (currentCue) {
      // Continuation line
      textLines.push(trimmed);
    }
  }

  finishCue();

  if (cues.length === 0) return null;
  return { cues };
}

function formatVttTimestamp(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const milliseconds = ms % 1000;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(milliseconds).padStart(3, "0")}`;
}

function stripBrackets(text: string): string {
  return text.replace(/\[([^\]]*)\]/g, "").trim();
}

function getPlacementSettings(placement: Placement): string {
  switch (placement) {
    case "top":
      return " line:10%";
    case "left":
      return " position:5% align:start size:40%";
    case "right":
      return " position:55% align:start size:40%";
  }
}

export function serializeToWebVTT(
  track: CaptionTrack,
  mode: "captions" | "subtitles",
): string {
  const lines: string[] = ["WEBVTT", ""];

  for (let i = 0; i < track.cues.length; i++) {
    const cue = track.cues[i];

    let text = cue.text;
    if (mode === "subtitles") {
      text = stripBrackets(text);
      if (!text) continue;
    }

    let endMs: number;
    if (cue.endMs != null) {
      endMs = cue.endMs;
    } else if (i < track.cues.length - 1) {
      endMs = track.cues[i + 1].startMs;
    } else {
      endMs = cue.startMs + 4000;
    }

    const positionStr = cue.placement
      ? getPlacementSettings(cue.placement)
      : " line:85%";

    lines.push(
      `${formatVttTimestamp(cue.startMs)} --> ${formatVttTimestamp(endMs)}${positionStr}`,
    );

    if (cue.voice) {
      lines.push(`<v ${cue.voice}>${text}</v>`);
    } else {
      lines.push(text);
    }

    lines.push("");
  }

  return lines.join("\n");
}

export function serializeToArchiveTT(track: CaptionTrack): string {
  const lines: string[] = [];

  for (const cue of track.cues) {
    let timestamp = `@${formatArchiveTTTimestamp(cue.startMs)}`;
    if (cue.endMs != null) {
      timestamp += `-${formatArchiveTTTimestamp(cue.endMs)}`;
    }

    let meta = "";
    if (cue.voice || cue.placement) {
      meta += `^${cue.voice || ""}`;
      if (cue.placement) {
        meta += `^${cue.placement}`;
      }
    }

    lines.push(`${timestamp}${meta} ${cue.text}`);
  }

  return lines.join("\n");
}

function formatArchiveTTTimestamp(ms: number): string {
  ms = Math.round(ms)
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const milliseconds = ms % 1000;

  let result: string;
  if (hours > 0) {
    result = `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  } else {
    result = `${minutes}:${String(seconds).padStart(2, "0")}`;
  }

  if (milliseconds > 0) {
    result += `.${String(milliseconds).padStart(3, "0").replace(/0+$/, "")}`;
  }

  return result;
}

export function toPlainText(text: string): string {
  const track = parseArchiveTT(text)
  if (!track) return text
  return track.cues
    .map((cue) => (cue.voice ? `${cue.voice}: ${cue.text}` : cue.text))
    .join('\n')
}

export function parseWebVTT(text: string): CaptionTrack {
  const cues: Cue[] = [];
  const lines = text.split("\n");

  let i = 0;
  // Skip WEBVTT header
  while (i < lines.length && !lines[i].includes("-->")) {
    i++;
  }

  while (i < lines.length) {
    const line = lines[i].trim();

    if (line.includes("-->")) {
      const arrowIndex = line.indexOf("-->");
      const startStr = line.slice(0, arrowIndex).trim();
      const afterArrow = line.slice(arrowIndex + 3).trim();
      const endAndSettings = afterArrow.split(/\s+/);
      const endStr = endAndSettings[0];
      const settings = endAndSettings.slice(1).join(" ");

      const startMs = parseVttTimestamp(startStr);
      const endMs = parseVttTimestamp(endStr);

      // Parse placement from settings
      let placement: Placement | undefined;
      if (settings.includes("line:10%")) {
        placement = "top";
      } else if (
        settings.includes("position:5%") &&
        settings.includes("size:40%")
      ) {
        placement = "left";
      } else if (
        settings.includes("position:55%") &&
        settings.includes("size:40%")
      ) {
        placement = "right";
      }

      // Collect text lines
      i++;
      const textLines: string[] = [];
      while (i < lines.length && lines[i].trim() !== "") {
        textLines.push(lines[i].trim());
        i++;
      }

      let fullText = textLines.join("\n");
      let voice: string | undefined;

      // Parse voice tag
      const voiceMatch = fullText.match(/^<v\s+([^>]+)>([\s\S]*)<\/v>$/);
      if (voiceMatch) {
        voice = voiceMatch[1];
        fullText = voiceMatch[2];
      }

      cues.push({
        startMs,
        endMs,
        text: fullText,
        ...(voice ? { voice } : {}),
        ...(placement ? { placement } : {}),
      });
    } else {
      i++;
    }
  }

  return { cues };
}

function parseVttTimestamp(raw: string): number {
  const parts = raw.split(":");
  let ms = 0;

  if (parts.length === 3) {
    ms += parseInt(parts[0], 10) * 3600000;
    ms += parseInt(parts[1], 10) * 60000;
    const secParts = parts[2].split(".");
    ms += parseInt(secParts[0], 10) * 1000;
    if (secParts[1]) {
      ms += parseInt(secParts[1].padEnd(3, "0").slice(0, 3), 10);
    }
  } else if (parts.length === 2) {
    ms += parseInt(parts[0], 10) * 60000;
    const secParts = parts[1].split(".");
    ms += parseInt(secParts[0], 10) * 1000;
    if (secParts[1]) {
      ms += parseInt(secParts[1].padEnd(3, "0").slice(0, 3), 10);
    }
  }

  return ms;
}
