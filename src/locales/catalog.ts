import { en, type MessageKey } from './en.ts';
import { ru } from './ru.ts';
import { es } from './es.ts';
import { ko } from './ko.ts';
import { ja } from './ja.ts';
import { isLocale, LOCALES, type Locale } from './registry.ts';
import { warnOnce } from '../core/faults.ts';

export { LOCALES, LANGUAGE_NAMES, LOCALE_KEY, isLocale, resolveLocale } from './registry.ts';
export type { Locale, MessageKey };
export type Translator = (key: MessageKey, values?: Record<string, string | number>) => string;
export const CATALOGS = { en, ru, es, ko, ja };

export function placeholders(message: string) { return [...new Set(Array.from(message.matchAll(/\{(\w+)\}/g), (match) => match[1]))].sort(); }

export function validateCatalogs(): string[] {
  const problems: string[] = [];
  const reference = Object.keys(en) as MessageKey[];
  for (const locale of LOCALES) {
    const dictionary = CATALOGS[locale];
    for (const key of reference) {
      const value = dictionary[key];
      if (typeof value !== 'string' || !value.trim()) problems.push(`${locale}:${key}:missing`);
      else if (placeholders(value).join(',') !== placeholders(en[key]).join(',')) problems.push(`${locale}:${key}:placeholders`);
    }
    for (const key of Object.keys(dictionary)) if (!Object.prototype.hasOwnProperty.call(en, key)) problems.push(`${locale}:${key}:unknown`);
  }
  return problems;
}

export function formatNumber(locale: Locale, value: number): string {
  const number = Number.isFinite(value) ? value : 0;
  try { return new Intl.NumberFormat(locale).format(number); } catch { return String(number); }
}

export function formatDate(locale: Locale, value: number): string {
  if (!Number.isFinite(value) || value <= 0 || value > 8.64e15) return '';
  try { return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(value); }
  catch { return new Date(value).toISOString().slice(0, 10); }
}

export function translate(locale: Locale, key: MessageKey, values: Record<string, string | number> = {}) {
  const chosen = isLocale(locale) ? locale : 'en';
  const known = Object.prototype.hasOwnProperty.call(en, key);
  const candidate = known ? CATALOGS[chosen][key] : undefined;
  const source = typeof candidate === 'string' && candidate.trim() ? candidate : known ? en[key] : en['error.title'];
  return source.replace(/\{(\w+)\}/g, (_match, name: string) => {
    const value = values?.[name];
    if (typeof value === 'number') return formatNumber(chosen, value);
    if (typeof value === 'string') return value;
    warnOnce(`Missing translation parameter ${key}.${name}`, new Error('Translation parameter unavailable'));
    return '';
  });
}