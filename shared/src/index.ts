export {
  detectArchiveTT,
  parseArchiveTT,
  serializeToWebVTT,
  serializeToArchiveTT,
  parseWebVTT,
} from "./captions.js";

export type { Cue, CaptionTrack, Placement } from "./captions.js";

export { getLanguageInfo, type LanguageInfo } from "./language-utils.js";

export type { TemplateArea, TemplateConfig } from "./templates.js";
