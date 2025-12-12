import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import English translations
import enCommon from '../locales/en/common.json';
import enHomepage from '../locales/en/homepage.json';

// Import Chinese translations
import zhCommon from '../locales/zh/common.json';
import zhHomepage from '../locales/zh/homepage.json';

const resources = {
  en: {
    translation: {},
    common: enCommon,
    homepage: enHomepage,
  },
  zh: {
    translation: {},
    common: zhCommon,
    homepage: zhHomepage,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    debug: false,
    ns: ['translation', 'common', 'homepage'],
    defaultNS: 'translation',
    
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },

    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;

