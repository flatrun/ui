import { computed, watch } from "vue";
import { useI18n } from "vue-i18n";
import { languages, getLanguageByCode, getDefaultLanguage, type LanguageConfig } from "@/config/languages";

const STORAGE_KEY = "locale";

export function useLanguage() {
  const { locale } = useI18n();

  const currentLanguage = computed<LanguageConfig>(() => getLanguageByCode(locale.value) || getDefaultLanguage());

  const setLanguage = (code: string) => {
    const lang = getLanguageByCode(code);
    if (lang) {
      locale.value = code;
      localStorage.setItem(STORAGE_KEY, code);
    }
  };

  const initializeLanguage = () => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && getLanguageByCode(stored)) {
      locale.value = stored;
    } else {
      locale.value = getDefaultLanguage().code;
    }
  };

  watch(locale, (newLocale) => {
    localStorage.setItem(STORAGE_KEY, newLocale);
  });

  return {
    languages,
    currentLanguage,
    setLanguage,
    initializeLanguage,
  };
}
