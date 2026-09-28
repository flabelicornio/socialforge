import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { LocaleProvider, useLocale } from "@socialforge/core";

// Tipo compatible con el Struct Post de Rust
interface Post {
  id: String;
  workspaceId: string;
  text: string;
  platforms: string;
  mediaIds: string;
  scheduledFor: number | null;
  status: string;
  failureReason: string | null;
  linkUrl: string | null;
  createdAt: number;
  updatedAt: number;
}

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
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Estado del formulario (Composer)
  const [showComposer, setShowComposer] = useState<boolean>(false);
  const [text, setText] = useState<string>("");
  const [linkUrl, setLinkUrl] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const workspaceId = "default";

  // Cargar publicaciones desde SQLite
  const fetchPosts = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await invoke<Post[]>("list_posts", { workspaceId });
      setPosts(res);
    } catch (err: any) {
      console.error("Error al cargar publicaciones:", err);
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  // Crear nueva publicación
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    try {
      setIsSubmitting(true);
      await invoke("create_post", {
        input: {
          workspaceId,
          text: text.trim(),
          platforms: ["facebook", "instagram"], // plataformas default
          mediaIds: [],
          scheduledFor: null,
          linkUrl: linkUrl.trim() || null,
        },
      });

      // Limpiar y actualizar
      setText("");
      setLinkUrl("");
      setShowComposer(false);
      await fetchPosts();
    } catch (err: any) {
      console.error("Error al crear publicación:", err);
      alert("Error al guardar la publicación: " + String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Eliminar publicación
  const handleDeletePost = async (id: String) => {
    if (!confirm("¿Seguro que deseas eliminar esta publicación?")) return;
    try {
      await invoke("delete_post", { id });
      await fetchPosts();
    } catch (err: any) {
      console.error("Error al eliminar publicación:", err);
      alert("Error al eliminar: " + String(err));
    }
  };

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
      {/* Selector de Idioma */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: "1rem" }}>
        <button onClick={() => setLocale("es")} style={{ fontWeight: locale === "es" ? 700 : 400, cursor: "pointer" }}>
          ES
        </button>
        <button onClick={() => setLocale("en")} style={{ fontWeight: locale === "en" ? 700 : 400, cursor: "pointer" }}>
          EN
        </button>
      </div>

      {/* Encabezado */}
      <header style={{ marginBottom: "2rem" }}>
        <h1 style={{ margin: "0 0 0.5rem 0" }}>SocialForge</h1>
        <p style={{ color: "#666", margin: 0 }}>{t("app.tagline")}</p>
      </header>

      {/* Acciones Principales */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h2 style={{ margin: 0 }}>{t("dashboard.upcoming")}</h2>
        <button
          onClick={() => setShowComposer(!showComposer)}
          style={{
            backgroundColor: "#0066cc",
            color: "#fff",
            border: "none",
            padding: "0.6rem 1.2rem",
            borderRadius: "6px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {showComposer ? "Cancelar" : "+ Nueva Publicación"}
        </button>
      </div>

      {/* Formulario Composer */}
      {showComposer && (
        <form
          onSubmit={handleCreatePost}
          style={{
            background: "#f5f5f7",
            padding: "1.2rem",
            borderRadius: "8px",
            marginBottom: "2rem",
            border: "1px solid #e0e0e0",
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: "1rem" }}>Crear borrador local</h3>
          
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: 500 }}>
              Contenido del post:
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="¿Qué quieres compartir hoy?"
              rows={4}
              style={{
                width: "100%",
                padding: "0.6rem",
                borderRadius: "6px",
                border: "1px solid #ccc",
                boxSizing: "border-box",
                fontFamily: "inherit",
              }}
              required
            />
          </div>

          <div style={{ marginBottom: "1.2rem" }}>
            <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: 500 }}>
              Enlace / URL (opcional):
            </label>
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://ejemplo.com"
              style={{
                width: "100%",
                padding: "0.6rem",
                borderRadius: "6px",
                border: "1px solid #ccc",
                boxSizing: "border-box",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              backgroundColor: "#28a745",
              color: "#fff",
              border: "none",
              padding: "0.6rem 1.2rem",
              borderRadius: "6px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {isSubmitting ? "Guardando..." : "Guardar en Local"}
          </button>
        </form>
      )}

      {/* Feedback de Estado */}
      {loading && <p>Cargando publicaciones...</p>}
      {error && <p style={{ color: "red" }}>Error al conectar con la base de datos: {error}</p>}

      {/* Lista de Publicaciones */}
      {!loading && !error && posts.length === 0 && (
        <p style={{ color: "#777", italic: "true" }}>{t("dashboard.empty")}</p>
      )}

      {!loading && posts.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {posts.map((p) => (
            <div
              key={String(p.id)}
              style={{
                padding: "1rem",
                border: "1px solid #ddd",
                borderRadius: "8px",
                background: "#fff",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <div>
                <p style={{ margin: "0 0 0.5rem 0", fontSize: "1.05rem" }}>{p.text}</p>
                {p.linkUrl && (
                  <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.85rem", color: "#0066cc" }}>
                    🔗 <a href={p.linkUrl} target="_blank" rel="noreferrer">{p.linkUrl}</a>
                  </p>
                )}
                <div style={{ display: "flex", gap: "0.5rem", fontSize: "0.75rem", color: "#888" }}>
                  <span>Estado: {p.status}</span>
                  <span>•</span>
                  <span>Creado: {new Date(p.createdAt).toLocaleString()}</span>
                </div>
              </div>

              <button
                onClick={() => handleDeletePost(p.id)}
                style={{
                  background: "transparent",
                  color: "#dc3545",
                  border: "1px solid #dc3545",
                  padding: "0.3rem 0.6rem",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                }}
              >
                Eliminar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}