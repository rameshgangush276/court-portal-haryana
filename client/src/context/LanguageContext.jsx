import { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../locales/translations';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
    const [lang, setLang] = useState(localStorage.getItem('preferredLanguage') || 'en');

    useEffect(() => {
        localStorage.setItem('preferredLanguage', lang);
        document.documentElement.lang = lang;
    }, [lang]);

    const toggleLanguage = () => {
        setLang(prev => prev === 'en' ? 'hi' : 'en');
    };

    const t = (key) => {
        return translations[lang][key] || key;
    };

    /**
     * Translates a table name by its slug.
     * Falls back to the provided default name (English).
     */
    const tTable = (slug, defaultName) => {
        return translations[lang][slug] || defaultName;
    };

    /**
     * Translates a column heading by its slug.
     * Falls back to the provided default name (English).
     */
    const tColumn = (slug, defaultName) => {
        return translations[lang][slug] || defaultName;
    };

    return (
        <LanguageContext.Provider value={{ lang, toggleLanguage, t, tTable, tColumn }}>
            {children}
        </LanguageContext.Provider>
    );
}

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
