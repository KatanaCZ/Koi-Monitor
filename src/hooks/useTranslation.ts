import { useAppStore } from '../store';
import { TRANSLATIONS, TranslationKey } from '../utils/translations';

export const useTranslation = () => {
  const language = useAppStore((s) => s.settings.language) || 'en';

  const t = (key: TranslationKey, params?: Record<string, string | number>): string => {
    let text = (TRANSLATIONS[language]?.[key] ?? TRANSLATIONS['en']?.[key] ?? key) as string;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, String(v));
      });
    }
    return text;
  };

  return { t, language };
};
