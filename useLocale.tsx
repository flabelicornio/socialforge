import { createContext, useContext, useState, ReactNode } from "react";
import { Locale, t } from "./i18n";

const LocaleContext = createContext<{
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
}>({
  locale: "es",
  setLocale: () => {},
  t: (key: string) => key,
});

const STORAGE_KEY = "socialforge_locale";

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    // apps/demo-web: usa localStorage.
    // apps/desktop: reemplazar esta lectura por el valor de la tabla
    // `settings` (key='language') leído vía comando de Tauri.
    const saved = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    return saved === "en" ? "en" : "es";
  });

  function setLocale(l: Locale) {
    setLocaleState(l);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, l);
    // TODO en desktop: también guardar en la tabla `settings` vía Tauri,
    // para que la preferencia sobreviva reinstalaciones del navegador (N/A)
    // y quede junto con el resto de la configuración local.
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t: (key: string) => t(key, locale) }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}
