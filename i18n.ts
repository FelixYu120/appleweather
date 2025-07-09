import * as Localization from 'expo-localization';
import { I18n } from 'i18n-js';

// Import your translation files
import en from '../translations/en.json';
import es from '../translations/es.json';

const i18n = new I18n({
    en,
    es,
});

// Set the locale once at the beginning of your app.
// Use getLocales()[0] for modern expo-localization versions
i18n.locale = Localization.getLocales()[0].languageTag;

// When a value is missing from a language it'll fallback to another language with the key present.
i18n.enableFallback = true;

export default i18n;
