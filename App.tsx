import { useEffect, useState } from "react";
import type { Post } from "@socialforge/core";
import { LocaleProvider, useLocale } from "@socialforge/core";

// NOTA: por ahora esto es un placeholder de UI. El siguiente paso técnico
// es conectar estos componentes al DataAdapter que llama comandos de Tauri
// (invoke("list_posts"), invoke("create_post"), etc.) definidos en
// src-tauri/src/main.rs.

export default function App() {
  return (
    <LocaleProvider>
      <Dashboard />
    </LocaleProvider>
  );
}

function Dashboard() {
  const { locale, setLocale, t } = useLocale();
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    // TODO: reemplazar por invoke("list_posts", { workspaceId })
    setPosts([]);
  }, []);

  return (
    <div style={{ fontFamily: "system-ui", padding: "2rem" }}>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button onClick={() => setLocale("es")} style={{ fontWeight: locale === "es" ? 700 : 400 }}>
          ES
        </button>
        <button onClick={() => setLocale("en")} style={{ fontWeight: locale === "en" ? 700 : 400 }}>
          EN
        </button>
      </div>

      <h1>SocialForge</h1>
      <p>{t("app.tagline")}</p>

      <h2>{t("dashboard.upcoming")}</h2>
      {posts.length === 0 ? (
        <p>{t("dashboard.empty")}</p>
      ) : (
        <ul>
          {posts.map((p) => (
            <li key={p.id}>{p.text}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
