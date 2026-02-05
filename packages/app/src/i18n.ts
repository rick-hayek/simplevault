import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import zh from './locales/zh.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';

const getSystemLanguage = () => {
    const language = navigator.language.toLowerCase();
    if (language.startsWith('zh')) return 'zh';
    if (language.startsWith('ja')) return 'ja';
    if (language.startsWith('ko')) return 'ko';
    return 'en';
};

i18n
    .use(initReactI18next)
    .init({
        resources: {
            en: { translation: en },
            zh: { translation: zh },
            ja: { translation: ja },
            ko: { translation: ko }
        },
        lng: getSystemLanguage(),
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false
        }
    });

export default i18n;
