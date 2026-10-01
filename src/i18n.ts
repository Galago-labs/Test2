// © 2026 Oriby Games. All rights reserved. Unauthorized copying or redistribution is prohibited.
// Third-party components: see public/third-party-notices.txt.
import { useCallback, useEffect, useRef, useState } from 'react';
import { readPreference, writePreference } from './core/storage.ts';
import { isLocale, LOCALE_KEY, resolveLocale, translate, type Locale, type Translator } from './locales/catalog.ts';

export { translate, formatDate, formatNumber, CATALOGS, validateCatalogs, LOCALES, LANGUAGE_NAMES, isLocale } from './locales/catalog.ts';
export type { Locale, Translator, MessageKey } from './locales/catalog.ts';

export function initialLocale(): Locale {
  const saved = readPreference(LOCALE_KEY);
  if (isLocale(saved)) return saved;
  return resolveLocale(typeof navigator === 'undefined' ? undefined : navigator.language);
}

export function useLocale(platformLanguage?: string, platformReady = true) {
  const [initial] = useState(() => ({ locale: initialLocale(), manual: isLocale(readPreference(LOCALE_KEY)) }));
  const [locale, setLocale] = useState<Locale>(initial.locale);
  const [localeReady, setLocaleReady] = useState(false);
  const manual = useRef(initial.manual);
  const appliedPlatformLanguage = useRef<string | undefined>(undefined);
  const t = useCallback<Translator>((key, values) => translate(locale, key, values), [locale]);

  useEffect(() => {
    if (!platformReady) return;
    if (!manual.current && platformLanguage !== undefined && appliedPlatformLanguage.current !== platformLanguage) {
      setLocale(resolveLocale(platformLanguage));
      appliedPlatformLanguage.current = platformLanguage;
    }
    setLocaleReady(true);
  }, [platformReady, platformLanguage]);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dataset.gameLocale = locale;
    document.title = t('page.title');
    document.querySelector('meta[name="description"]')?.setAttribute('content', t('page.description'));
  }, [locale, t]);

  const selectLocale = useCallback((value: Locale) => {
    if (!isLocale(value)) return;
    manual.current = true;
    setLocale(value);
    writePreference(LOCALE_KEY, value);
  }, []);

  return { locale, t, localeReady, selectLocale };
}