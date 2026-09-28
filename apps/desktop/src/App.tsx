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
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  
  const [text, setText] = useState<string>('');
  const [linkUrl, setLinkUrl] = useState<string>('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['facebook', 'instagram']);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [existingMediaIds, setExistingMediaIds] = useState<string[]>([]);
  const [saving, setSaving] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [previewPlatform, setPreviewPlatform] = useState<string>('facebook');

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

  const parseJsonArray = (jsonString: string): string[] => {
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
    setSelectedFiles([]);
    setExistingMediaIds([]);
    setActiveTab('editor');
    setShowModal(true);
  };

  const openEditModal = (post: Post) => {
    setEditingPostId(post.id);
    setText(post.text);
    setLinkUrl(post.linkUrl || '');
    setSelectedPlatforms(parseJsonArray(post.platforms));
    setExistingMediaIds(parseJsonArray(post.mediaIds));
    setSelectedFiles([]);
    setActiveTab('editor');
    setShowModal(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...filesArray]);
    }
  };

  const removeNewFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExistingMedia = (index: number) => {
    setExistingMediaIds((prev) => prev.filter((_, i) => i !== index));
  };

  const fileToByteArray = async (file: File): Promise<number[]> => {
    const arrayBuffer = await file.arrayBuffer();
    return Array.from(new Uint8Array(arrayBuffer));
  };

  const handleSavePost = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!text.trim()) return;

    try {
      setSaving(true);

      const newMediaIds: string[] = [];
      for (const file of selectedFiles) {
        const bytes = await fileToByteArray(file);
        const mediaId = await invoke<String>('save_media_file', {
          fileName: file.name,
          fileBytes: bytes,
        });
        newMediaIds.push(mediaId.toString());
      }

      const totalMediaIds = [...existingMediaIds, ...newMediaIds];

      if (editingPostId) {
        await invoke('update_post', {
          input: {
            id: editingPostId,
            text: text,
            platforms: selectedPlatforms,
            mediaIds: totalMediaIds,
            scheduledFor: null,
            linkUrl: linkUrl.trim() ? linkUrl.trim() : null,
          },
        });
      } else {
        await invoke('create_post', {
          input: {
            workspaceId: 'default',
            text: text,
            platforms: selectedPlatforms,
            mediaIds: totalMediaIds,
            scheduledFor: null,
            linkUrl: linkUrl.trim() ? linkUrl.trim() : null,
          },
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
              const mediaList = parseJsonArray(post.mediaIds);
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

                      {mediaList.length > 0 && (
                        <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: '#4a5568' }}>
                          📁 <strong>Archivos adjuntos:</strong> {mediaList.length} archivo(s)
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
              maxWidth: '560px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>{editingPostId ? 'Editar Publicación' : 'Nueva Publicación'}</h3>
              <div style={{ display: 'flex', gap: '0.3rem', backgroundColor: '#f1f5f9', padding: '0.2rem', borderRadius: '6px' }}>
                <button
                  type="button"
                  onClick={() => setActiveTab('editor')}
                  style={{
                    padding: '0.3rem 0.8rem',
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
                    padding: '0.3rem 0.8rem',
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

            {activeTab === 'editor' ? (
              <form onSubmit={handleSavePost}>
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

                  {existingMediaIds.length > 0 && (
                    <div style={{ marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', color: '#666' }}>Archivos guardados previamente:</span>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.2rem' }}>
                        {existingMediaIds.map((mId, idx) => (
                          <div
                            key={idx}
                            style={{
                              fontSize: '0.75rem',
                              backgroundColor: '#e2e8f0',
                              padding: '0.3rem 0.6rem',
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.4rem',
                            }}
                          >
                            <span style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              💾 {mId.split('_').slice(1).join('_') || mId}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeExistingMedia(idx)}
                              style={{ border: 'none', background: 'none', color: '#e53e3e', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

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
                            onClick={() => removeNewFile(idx)}
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
                    disabled={saving}
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
                    {saving ? 'Guardando...' : editingPostId ? 'Actualizar' : 'Guardar en Local'}
                  </button>
                </div>
              </form>
            ) : (
              <div>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                  {['facebook', 'instagram', 'linkedin'].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPreviewPlatform(p)}
                      style={{
                        padding: '0.3rem 0.7rem',
                        borderRadius: '4px',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: 'bold',
                        textTransform: 'capitalize',
                        backgroundColor: previewPlatform === p ? '#0066cc' : '#e2e8f0',
                        color: previewPlatform === p ? '#fff' : '#333',
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>

                {/* Simulated Social Feed Card */}
                <div
                  style={{
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '1rem',
                    backgroundColor: '#fff',
                    maxWidth: '400px',
                    margin: '0 auto',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.8rem' }}>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        backgroundColor: '#0066cc',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold',
                        fontSize: '0.9rem',
                      }}
                    >
                      SF
                    </div>
                    <div>
                      <strong style={{ display: 'block', fontSize: '0.85rem' }}>SocialForge User</strong>
                      <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                        Simulación de Feed • {previewPlatform.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <p style={{ fontSize: '0.9rem', whiteSpace: 'pre-wrap', margin: '0 0 0.8rem 0', color: '#1e293b' }}>
                    {text || 'Escribe un texto en el editor para ver la vista previa...'}
                  </p>

                  {(existingMediaIds.length > 0 || selectedFiles.length > 0) && (
                    <div
                      style={{
                        height: '180px',
                        backgroundColor: '#f8fafc',
                        border: '1px dashed #cbd5e1',
                        borderRadius: '6px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#64748b',
                        fontSize: '0.85rem',
                        marginBottom: '0.8rem',
                      }}
                    >
                      <span>🖼️ Preview de Galería</span>
                      <span style={{ fontSize: '0.75rem', marginTop: '0.2rem' }}>
                        {existingMediaIds.length + selectedFiles.length} elemento(s) adjunto(s)
                      </span>
                    </div>
                  )}

                  {linkUrl && (
                    <div
                      style={{
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        padding: '0.6rem',
                        backgroundColor: '#f8fafc',
                        fontSize: '0.8rem',
                        color: '#0066cc',
                        wordBreak: 'break-all',
                      }}
                    >
                      🔗 {linkUrl}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    style={{ padding: '0.5rem 1rem', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: '#fff', cursor: 'pointer' }}
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}