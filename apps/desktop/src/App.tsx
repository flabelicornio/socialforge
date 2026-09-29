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

interface MediaItem {
  url: string;
  type: 'image' | 'video';
  name: string;
}

export function App() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);

  const [text, setText] = useState<string>('');
  const [linkUrl, setLinkUrl] = useState<string>('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['facebook', 'instagram']);
  
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [saving, setSaving] = useState<boolean>(false);
  
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [currentMediaIndex, setCurrentMediaIndex] = useState<number>(0);

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

  const parseJsonArray = (jsonString: string): any[] => {
    try {
      return JSON.parse(jsonString) || [];
    } catch {
      return [];
    }
  };

  const openCreateModal = () => {
    setEditingPostId(null);
    setText('');
    setLinkUrl('');
    setSelectedPlatforms(['facebook', 'instagram']);
    setMediaItems([]);
    setCurrentMediaIndex(0);
    setActiveTab('editor');
    setShowModal(true);
  };

  const openEditModal = (post: Post) => {
    setEditingPostId(post.id);
    setText(post.text);
    setLinkUrl(post.linkUrl || '');
    setSelectedPlatforms(parseJsonArray(post.platforms));
    setMediaItems([]);
    setCurrentMediaIndex(0);
    setActiveTab('editor');
    setShowModal(true);
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      const newItems: MediaItem[] = [];

      for (const file of filesArray) {
        const base64Url = await convertFileToBase64(file);
        newItems.push({
          url: base64Url,
          type: file.type.startsWith('video/') ? 'video' : 'image',
          name: file.name,
        });
      }

      setMediaItems((prev) => [...prev, ...newItems]);
    }
  };

  const removeMediaItem = (index: number) => {
    setMediaItems((prev) => prev.filter((_, i) => i !== index));
    if (currentMediaIndex >= mediaItems.length - 1) {
      setCurrentMediaIndex(Math.max(0, mediaItems.length - 2));
    }
  };

  const handleSavePost = async (e?: React.FormEvent): Promise<void> => {
    if (e) e.preventDefault();
    if (!text.trim()) return;

    try {
      setSaving(true);

      const payload = {
        workspaceId: 'default',
        text: text,
        platforms: JSON.stringify(selectedPlatforms),
        mediaIds: JSON.stringify([]),
        scheduledFor: null,
        linkUrl: linkUrl.trim() ? linkUrl.trim() : null,
      };

      if (editingPostId) {
        await invoke('update_post', {
          input: {
            id: editingPostId,
            ...payload,
          },
        });
      } else {
        await invoke('create_post', {
          input: payload,
        });
      }

      setShowModal(false);
      await loadPosts();
    } catch (err) {
      alert(`Error al guardar la publicación: ${err}`);
    } finally {
      setSaving(false);
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
    <div style={{ maxWidth: '820px', margin: '0 auto', padding: '2rem', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
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
            onClick={openCreateModal}
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
            {posts.map((post) => {
              const platformList = parseJsonArray(post.platforms);

              return (
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

                      <div style={{ display: 'flex', gap: '0.4rem', margin: '0.5rem 0' }}>
                        {platformList.map((plat) => (
                          <span
                            key={plat}
                            style={{
                              fontSize: '0.7rem',
                              backgroundColor: '#edf2f7',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '4px',
                              textTransform: 'uppercase',
                              fontWeight: 'bold',
                              color: '#4a5568',
                            }}
                          >
                            {plat}
                          </span>
                        ))}
                      </div>

                      <span style={{ fontSize: '0.75rem', color: '#888' }}>
                        Estado: <strong>{post.status}</strong> • Creado: {new Date(post.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => openEditModal(post)}
                        style={{
                          backgroundColor: '#f1f5f9',
                          color: '#334155',
                          border: '1px solid #cbd5e1',
                          padding: '0.3rem 0.8rem',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          fontWeight: 'bold',
                        }}
                      >
                        Editar
                      </button>
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
                </div>
              );
            })}
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
              maxWidth: '580px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              display: 'flex',
              flexDirection: 'column',
              justify: 'space-between',
            }}
          >
            <div>
              {/* Aviso para el usuario */}
              <div style={{ backgroundColor: '#fffbe3', border: '1px solid #ffe58f', borderRadius: '6px', padding: '0.6rem 0.8rem', marginBottom: '1rem', fontSize: '0.8rem', color: '#856404' }}>
                🔒 <strong>Seguridad y Privacidad:</strong> La vista previa multimedia solo está disponible de forma activa durante la preparación del borrador. Asegúrate de verificar las imágenes/videos antes de guardar la publicación.
              </div>

              {activeTab === 'editor' ? (
                <form id="post-form" onSubmit={handleSavePost}>
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

                    {mediaItems.length > 0 && (
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                        {mediaItems.map((item, idx) => (
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
                            <span>📎 {item.name}</span>
                            <button
                              type="button"
                              onClick={() => removeMediaItem(idx)}
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
                </form>
              ) : (
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.25rem', backgroundColor: '#fafafa' }}>
                  <p style={{ fontSize: '0.95rem', margin: '0 0 1rem 0', whiteSpace: 'pre-wrap' }}>{text || 'Sin texto introducido...'}</p>

                  {mediaItems.length > 0 ? (
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ position: 'relative', width: '100%', height: '280px', backgroundColor: '#000', borderRadius: '8px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {mediaItems[currentMediaIndex]?.type === 'image' ? (
                          <img src={mediaItems[currentMediaIndex].url} alt="Preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                        ) : (
                          <video src={mediaItems[currentMediaIndex].url} controls style={{ maxWidth: '100%', maxHeight: '100%' }} />
                        )}

                        {mediaItems.length > 1 && (
                          <>
                            <button
                              type="button"
                              onClick={() => setCurrentMediaIndex((prev) => (prev > 0 ? prev - 1 : mediaItems.length - 1))}
                              style={{
                                position: 'absolute',
                                left: '10px',
                                backgroundColor: 'rgba(0,0,0,0.6)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '50%',
                                width: '32px',
                                height: '32px',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                              }}
                            >
                              ◀
                            </button>
                            <button
                              type="button"
                              onClick={() => setCurrentMediaIndex((prev) => (prev < mediaItems.length - 1 ? prev + 1 : 0))}
                              style={{
                                position: 'absolute',
                                right: '10px',
                                backgroundColor: 'rgba(0,0,0,0.6)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '50%',
                                width: '32px',
                                height: '32px',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                              }}
                            >
                              ▶
                            </button>
                          </>
                        )}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '0.6rem' }}>
                        {mediaItems.map((_, idx) => (
                          <span
                            key={idx}
                            onClick={() => setCurrentMediaIndex(idx)}
                            style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              backgroundColor: currentMediaIndex === idx ? '#0066cc' : '#ccc',
                              cursor: 'pointer',
                              display: 'inline-block',
                            }}
                          />
                        ))}
                        <span style={{ fontSize: '0.75rem', color: '#666', marginLeft: '0.5rem' }}>
                          {currentMediaIndex + 1} de {mediaItems.length}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ border: '1px dashed #cbd5e1', padding: '1.5rem', textAlign: 'center', borderRadius: '6px', color: '#64748b', fontSize: '0.85rem', marginBottom: '1rem' }}>
                      📷 No se han adjuntado fotos ni videos
                    </div>
                  )}

                  {linkUrl && (
                    <div style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.6rem', backgroundColor: '#fff', fontSize: '0.85rem', color: '#0066cc', marginBottom: '1rem' }}>
                      🔗 <a href={linkUrl} target="_blank" rel="noreferrer" style={{ color: '#0066cc' }}>{linkUrl}</a>
                    </div>
                  )}

                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Redes seleccionadas:
                    </label>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      {selectedPlatforms.map((p) => (
                        <span key={p} style={{ fontSize: '0.7rem', backgroundColor: '#e2e8f0', padding: '0.2rem 0.5rem', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 'bold', color: '#475569' }}>
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1rem', marginTop: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>
                  {editingPostId ? 'Editar Publicación' : 'Nueva Publicación'}
                </h3>
                
                <div style={{ display: 'flex', gap: '0.3rem', backgroundColor: '#f1f5f9', padding: '0.2rem', borderRadius: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setActiveTab('editor')}
                    style={{
                      padding: '0.35rem 0.8rem',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: 'bold',
                      backgroundColor: activeTab === 'editor' ? '#fff' : 'transparent',
                      boxShadow: activeTab === 'editor' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                    }}
                  >
                    ✏️ Editor
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('preview')}
                    style={{
                      padding: '0.35rem 0.8rem',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: 'bold',
                      backgroundColor: activeTab === 'preview' ? '#fff' : 'transparent',
                      boxShadow: activeTab === 'preview' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                    }}
                  >
                    👁️ Vista Previa
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ padding: '0.5rem 1.2rem', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: '#fff', cursor: 'pointer', fontWeight: '500' }}
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={() => handleSavePost()}
                  disabled={saving}
                  style={{
                    padding: '0.5rem 1.2rem',
                    borderRadius: '4px',
                    border: 'none',
                    backgroundColor: '#0066cc',
                    color: 'white',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                  }}
                >
                  {saving ? 'Guardando...' : editingPostId ? 'Actualizar' : 'Guardar en Local'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;