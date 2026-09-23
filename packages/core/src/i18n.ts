// Traducciones compartidas entre apps/desktop y apps/demo-web.
// Español es el idioma por default (mercado LatAm); inglés queda disponible.

export type Locale = "es" | "en";

export const translations: Record<Locale, Record<string, string>> = {
  es: {
    "app.tagline": "Tus redes sociales. Tu máquina. Tus datos.",
    "nav.dashboard": "Dashboard",
    "nav.calendar": "Calendario",
    "nav.composer": "Composer",
    "nav.queue": "Cola",
    "nav.media": "Media",
    "nav.accounts": "Cuentas",
    "nav.settings": "Configuración",
    "dashboard.upcoming": "Próximas publicaciones",
    "dashboard.empty": "Todavía no hay publicaciones.",
    "composer.title": "Composer",
    "composer.placeholder": "Escribe tu publicación...",
    "composer.schedule": "Programar",
    "demo.banner":
      "Modo demo. Tus datos no se guardan de forma permanente — se pierden si limpias el caché del navegador. Instala SocialForge para trabajar en serio, con tus datos protegidos en tu propia máquina.",
  },
  en: {
    "app.tagline": "Your social media. Your machine. Your data.",
    "nav.dashboard": "Dashboard",
    "nav.calendar": "Calendar",
    "nav.composer": "Composer",
    "nav.queue": "Queue",
    "nav.media": "Media",
    "nav.accounts": "Accounts",
    "nav.settings": "Settings",
    "dashboard.upcoming": "Upcoming posts",
    "dashboard.empty": "No posts yet.",
    "composer.title": "Composer",
    "composer.placeholder": "Write your post...",
    "composer.schedule": "Schedule",
    "demo.banner":
      "Demo mode. Your data isn't saved permanently — it's lost if you clear your browser cache. Install SocialForge to work for real, with your data protected on your own machine.",
  },
};

export function t(key: string, locale: Locale): string {
  return translations[locale][key] ?? key;
}
