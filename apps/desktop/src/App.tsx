import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { Post } from "@socialforge/core";
import { LocaleProvider, useLocale } from "@socialforge/core";

export default function App() {
  return (
    <LocaleProvider>
      <Dashboard />
    </LocaleProvider>
  );
}

function Dashboard() {
  const { locale, setLocale, t } = useLocale();
  const [posts, setPosts] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  const [workspaceId] = useState("default-workspace");

  async function loadPosts() {
    try {
      const result = await invoke<any[]>("list_posts", { workspaceId });
      const parsed = result.map((p: any) => ({
        ...p,
        platforms: typeof p.platforms === "string" ? JSON.parse(p.platforms) : p.platforms,
        mediaIds: typeof p.media_ids === "string" ? JSON.parse(p.media_ids) : p.media_ids,
        scheduledFor: p.scheduled_for ?? p.scheduledFor,
        linkUrl: p.link_url ?? p.linkUrl,
        text: p.text,
        id: p.id,
      }));
      setPosts(parsed);
    } catch (e) {
      console.error("list_posts failed", e);
      setPosts([]);
    }
  }

  useEffect(() => {
    loadPosts();
    const interval = setInterval(async () => {
      try {
        const dueJobs = await invoke<any[]>("get_due_jobs");
        if (dueJobs.length > 0) {
          console.log(`[SocialForge Scheduler] ${dueJobs.length} jobs pendientes`, dueJobs);
        }
      } catch (err) {
        console.warn("scheduler tick failed", err);
      }
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  async function handleCreate() {
    if (!text.trim()) return;
    const scheduled = scheduledFor ? new Date(scheduledFor).getTime() : null;
    try {
      await invoke("create_post", {
        input: {
          workspace_id: workspaceId,
          text,
          platforms: ["facebook"],
          media_ids: [],
          scheduled_for: scheduled,
          link_url: linkUrl || null,
        },
      });
      setText("");
      setLinkUrl("");
      setScheduledFor("");
      loadPosts();
    } catch (e) {
      console.error(e);
      alert("Error creando post: " + e);
    }
  }

  return (
    <div style={{ fontFamily: "system-ui", padding: "2rem", maxWidth: 800, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button onClick={() => setLocale("es")} style={{ fontWeight: locale === "es" ? 700 : 400 }}>ES</button>
        <button onClick={() => setLocale("en")} style={{ fontWeight: locale === "en" ? 700 : 400 }}>EN</button>
      </div>

      <h1>SocialForge</h1>
      <p>{t("app.tagline")}</p>

      <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16, marginBottom: 24 }}>
        <h3>Nuevo Post (varios por día soportados)</h3>
        <textarea value={text} onChange={e => setText(e.target.value)} placeholder="¿Qué vas a publicar hoy?" style={{ width: "100%", minHeight: 80 }} />
        <input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="Link opcional (FB nativo, IG al final del caption)" style={{ width: "100%", marginTop: 8 }} />
        <input type="datetime-local" value={scheduledFor} onChange={e => setScheduledFor(e.target.value)} style={{ width: "100%", marginTop: 8 }} />
        <button onClick={handleCreate} style={{ marginTop: 12, padding: "8px 16px" }}>Programar</button>
        <p style={{ fontSize: 12, color: "#666", marginTop: 8 }}>Puedes programar N posts el mismo día a distintas horas. Cada uno crea un job con run_at distinto - 100% local, sin Worker.</p>
      </div>

      <h2>{t("dashboard.upcoming")}</h2>
      {posts.length === 0 ? <p>{t("dashboard.empty")}</p> : (
        <ul>
          {posts.map((p) => (
            <li key={p.id} style={{ marginBottom: 8 }}>
              <strong>{p.scheduledFor ? new Date(p.scheduledFor).toLocaleString() : "Borrador"}</strong>: {p.text} {p.linkUrl && <a href={p.linkUrl} target="_blank">🔗</a>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
