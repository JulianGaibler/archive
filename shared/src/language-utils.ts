export interface LanguageInfo {
  bcp47: string;
  label: string;
}

const LANGUAGE_MAP: Record<string, LanguageInfo> = {
  ENGLISH: { bcp47: "en", label: "English" },
  GERMAN: { bcp47: "de", label: "German" },
  FRENCH: { bcp47: "fr", label: "French" },
  ITALIAN: { bcp47: "it", label: "Italian" },
  NORWEGIAN: { bcp47: "no", label: "Norwegian" },
  RUSSIAN: { bcp47: "ru", label: "Russian" },
  SPANISH: { bcp47: "es", label: "Spanish" },
  TURKISH: { bcp47: "tr", label: "Turkish" },
};

export function getLanguageInfo(language: string): LanguageInfo {
  return LANGUAGE_MAP[language] ?? { bcp47: "en", label: "English" };
}
