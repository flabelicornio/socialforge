import { useEffect, useState } from "react";
import type { Post, SocialPlatform } from "@socialforge/core";
import { LocaleProvider, useLocale } from "@socialforge/core";

// DEMO DESECHABLE: todo vive en localStorage del navegador.
// Se pierde al limpiar caché — esto es intencional (ver banner abajo).
// No hay publicación real: el estado avanza solo, simulado.

const STORAGE_KEY = "socialforge_demo_posts";
const ALL_PLATFORMS: SocialPlatform[] = [
  "instagram",
  "facebook",
  "tiktok",
  "linkedin",
];

function load(): Post[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save(posts: Post[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
}

export default function App() {
  return (
    <LocaleProvider>
      <DemoContent />
    </LocaleProvider>
  );
}

function DemoContent() {
  const { locale, setLocale, t } = useLocale();
  const [posts, setPosts] = useState<Post[]>([]);
  const [text, setText] = useState("");
  const [platforms, setPlatforms] = useState<SocialPlatform[]>([]);

  useEffect(() => {
    setPosts(load());
  }, []);

  // Simula el avance de la cola: PENDING -> PROCESSING -> READY_FOR_USER
  useEffect(() => {
    const interval = setInterval(() => {
      setPosts((prev) => {
        const next = prev.map((p) => {
          if (p.status === "PENDING") return { ...p, status: "PROCESSING" as const };
          if (p.status === "PROCESSING")
            return { ...p, status: "READY_FOR_USER" as const };
          return p;
        });
        save(next);
        return next;
      });
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  function togglePlatform(p: SocialPlatform) {
    setPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  }

  function addPost() {
    if (!text.trim() || platforms.length === 0) return;
    const newPost: Post = {
      id: crypto.randomUUID(),
      text,
      mediaIds: [],
      platforms,
      scheduledFor: Date.now(),
      status: "PENDING",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const next = [newPost, ...posts];
    setPosts(next);
    save(next);
    setText("");
    setPlatforms([]);
  }

  return (
    <div style={{ fontFamily: "system-ui", maxWidth: 640, margin: "0 auto", padding: "2rem" }}>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 8 }}>
        <button
          onClick={() => setLocale("es")}
          style={{ fontWeight: locale === "es" ? 700 : 400 }}
        >
          ES
        </button>
        <button
          onClick={() => setLocale("en")}
          style={{ fontWeight: locale === "en" ? 700 : 400 }}
        >
          EN
        </button>
      </div>

      <div
        style={{
          background: "#fff3cd",
          border: "1px solid #ffe69c",
          padding: "0.75rem 1rem",
          borderRadius: 8,
          marginBottom: "1.5rem",
          fontSize: "0.9rem",
        }}
      >
        {t("demo.banner")}
      </div>

      <h1>SocialForge</h1>
      <p style={{ color: "#666" }}>{t("app.tagline")}</p>

      <h2>{t("composer.title")}</h2>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t("composer.placeholder")}
        rows={3}
        style={{ width: "100%", padding: 8, marginBottom: 8 }}
      />
      <div style={{ marginBottom: 8 }}>
        {ALL_PLATFORMS.map((p) => (
          <label key={p} style={{ marginRight: 12 }}>
            <input
              type="checkbox"
              checked={platforms.includes(p)}
              onChange={() => togglePlatform(p)}
            />{" "}
            {p}
          </label>
        ))}
      </div>
      <button onClick={addPost}>{t("composer.schedule")}</button>

      <h2 style={{ marginTop: "2rem" }}>{t("nav.queue")}</h2>
      {posts.length === 0 ? (
        <p>{t("dashboard.empty")}</p>
      ) : (
        <ul>
          {posts.map((p) => (
            <li key={p.id}>
              <strong>{p.status}</strong> — {p.text} ({p.platforms.join(", ")})
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
