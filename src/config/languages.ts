export interface LanguageConfig {
  code: string;
  label: string;
  flagPath: string;
}

export const languages: LanguageConfig[] = [
  { code: "en", label: "English", flagPath: "/flags/gb.svg" },
  { code: "fr", label: "Français", flagPath: "/flags/fr.svg" },
  { code: "de", label: "Deutsch", flagPath: "/flags/de.svg" },
  { code: "es", label: "Español", flagPath: "/flags/es.svg" },
  { code: "pt", label: "Português", flagPath: "/flags/pt.svg" },
  { code: "it", label: "Italiano", flagPath: "/flags/it.svg" },
];

export type LanguageCode = (typeof languages)[number]["code"];

export const getLanguageByCode = (code: string): LanguageConfig | undefined => {
  return languages.find((lang) => lang.code === code);
};

export const getDefaultLanguage = (): LanguageConfig => languages[0];
