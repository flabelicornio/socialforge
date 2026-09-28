import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface Post {
  id: string;
  workspaceId: string;
  text: string;
  platforms: string;
  mediaIds: string;
  scheduledFor?: number | null;
  status: string;
  failureReason?: string | null;
  linkUrl?: string | null;
  createdAt: number;
  updatedAt: number;
}

export default function App() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [text, setText] = useState<string>('');
  const [linkUrl, setLinkUrl] = useState<string>('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['facebook', 'instagram']);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [creating, setCreating] = useState<boolean>(false);

  const loadPosts = async (): Promise<void> => {
    try {
      setLoading(true);
      const res = await invoke<Post[]>('list_posts', { workspaceId: 'default' });
      setPosts(res);
    } catch (err) {
      console.error('Error al listar posts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...filesArray]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreatePost = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!text.trim()) return;

    try {
      setCreating(true);

      // Por ahora pasamos un arreglo vacío de mediaIds hasta conectar la copia física en Rust
      await invoke('create_post', {
        input: {
          workspaceId: 'default',
          text: text,
          platforms: selectedPlatforms,
          mediaIds: [],
          scheduledFor: null,
          linkUrl: linkUrl.trim() ? linkUrl.trim() : null,
        },
      });

      setText('');
      setLinkUrl('');
      setSelectedFiles([]);
      setShowModal(false);
      await loadPosts();
    } catch (err) {
      alert(`Error al guardar la publicación: ${err}`);
    } finally {
      setCreating(false);
    }
  };

  const handleDeletePost = async (id: string): Promise<void> => {
    if (!confirm('¿Seguro que deseas eliminar esta publicación?')) return;
    try {
      await invoke('delete_post', { id });
      await loadPosts();
    } catch (err) {
      alert(`Error al eliminar: ${err}`);
    }
  };

  const togglePlatform = (platform: string): void => {
    if (selectedPlatforms.includes(platform)) {
      setSelectedPlatforms(selectedPlatforms.filter((p) => p !== platform));
    } else {
      setSelectedPlatforms([...selectedPlatforms, platform]);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 'bold' }}>SocialForge</h1>
          <p style={{ margin: '0.25rem 0 0', color: '#666', fontSize: '0.9rem' }}>
            Your social media. Your machine. Your data.
          </p>
        </div>
      </header>

      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Upcoming posts</h2>
          <button
            onClick={() => setShowModal(true)}
            style={{
              backgroundColor: '#0066cc',
              color: 'white',
              border: 'none',
              padding: '0.6rem 1.2rem',
              borderRadius: '6px',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            + Nueva Publicación
          </button>
        </div>

        {loading ? (
          <p style={{ color: '#888' }}>Cargando publicaciones...</p>
        ) : posts.length === 0 ? (
          <div style={{ border: '1px dashed #ccc', padding: '2rem', textAlign: 'center', borderRadius: '8px', color: '#666' }}>
            No hay publicaciones programadas. ¡Crea la primera!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {posts.map((post) => (
              <div
                key={post.id}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '1.25rem',
                  backgroundColor: '#fff',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', whiteSpace: 'pre-wrap' }}>{post.text}</p>
                    {post.linkUrl && (
                      <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: '#0066cc' }}>
                        🔗 <a href={post.linkUrl} target="_blank" rel="noreferrer" style={{ color: '#0066cc' }}>{post.linkUrl}</a>
                      </p>
                    )}
                    <span style={{ fontSize: '0.75rem', color: '#888' }}>
                      Estado: <strong>{post.status}</strong> • Creado: {new Date(post.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeletePost(post.id)}
                    style={{
                      backgroundColor: '#fff',
                      color: '#e53e3e',
                      border: '1px solid #e53e3e',
                      padding: '0.3rem 0.8rem',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                    }}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {showModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '1.5rem',
              width: '100%',
              maxWidth: '520px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}
          >
            <h3 style={{ marginTop: 0 }}>Nueva Publicación</h3>
            <form onSubmit={handleCreatePost}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.3rem' }}>
                  Texto de la publicación
                </label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="¿Qué quieres compartir?"
                  rows={4}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                  required
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.3rem' }}>
                  Archivos Multimedia (Imágenes / Videos)
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={handleFileChange}
                  style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem' }}
                />
                {selectedFiles.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                    {selectedFiles.map((file, idx) => (
                      <div
                        key={idx}
                        style={{
                          fontSize: '0.75rem',
                          backgroundColor: '#f1f5f9',
                          padding: '0.3rem 0.6rem',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                        }}
                      >
                        <span>📎 {file.name}</span>
                        <button
                          type="button"
                          onClick={() => removeFile(idx)}
                          style={{ border: 'none', background: 'none', color: '#e53e3e', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.3rem' }}>
                  Enlace opcional (URL)
                </label>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://ejemplo.com"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.3rem' }}>
                  Plataformas objetivo
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {['facebook', 'instagram', 'x', 'linkedin'].map((platform) => (
                    <button
                      type="button"
                      key={platform}
                      onClick={() => togglePlatform(platform)}
                      style={{
                        padding: '0.4rem 0.8rem',
                        borderRadius: '4px',
                        border: '1px solid #ccc',
                        backgroundColor: selectedPlatforms.includes(platform) ? '#0066cc' : '#f0f0f0',
                        color: selectedPlatforms.includes(platform) ? 'white' : '#333',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        textTransform: 'capitalize',
                      }}
                    >
                      {platform}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ padding: '0.5rem 1rem', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: '#fff', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '4px',
                    border: 'none',
                    backgroundColor: '#0066cc',
                    color: 'white',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                  }}
                >
                  {creating ? 'Guardando...' : 'Guardar en Local'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}