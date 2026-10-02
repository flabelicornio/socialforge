import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { SocialAccountsModal, Account } from './components/SocialAccountsModal';

interface PostAttachment {
  id: string;
  name: string;
  type: 'image' | 'video';
  dataUrl: string; // Garantiza la persistencia completa local del archivo adjunto
}

interface Post {
  id: string;
  content: string;
  platforms: string[];
  scheduledAt: string;
  attachments: PostAttachment[];
}

export function App() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [content, setContent] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['facebook', 'instagram']);
  const [scheduledAt, setScheduledAt] = useState('');
  const [attachments, setAttachments] = useState<PostAttachment[]>([]);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);

  const [connectedAccounts, setConnectedAccounts] = useState<Account[]>([]);
  const [isAccountsModalOpen, setIsAccountsModalOpen] = useState(false);

  // Cargar publicaciones y cuentas al iniciar
  useEffect(() => {
    const savedPosts = localStorage.getItem('socialforge_posts');
    if (savedPosts) {
      try {
        setPosts(JSON.parse(savedPosts));
      } catch (e) {
        console.error('Error cargando posts locales:', e);
      }
    }
    syncAccounts();
  }, []);

  // Persistir publicaciones cada vez que cambien
  useEffect(() => {
    localStorage.setItem('socialforge_posts', JSON.stringify(posts));
  }, [posts]);

  const syncAccounts = async () => {
    try {
      const res = await invoke<Account[]>('get_connected_accounts');
      setConnectedAccounts(res);
    } catch (e) {
      console.warn('Backend aún no responde a get_connected_accounts:', e);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        const newAttachment: PostAttachment = {
          id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
          name: file.name,
          type: file.type.startsWith('video/') ? 'video' : 'image',
          dataUrl,
        };
        setAttachments((prev) => [...prev, newAttachment]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((att) => att.id !== id));
  };

  const handleSavePost = () => {
    if (!content.trim()) return;

    if (editingPostId) {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === editingPostId
            ? { ...p, content, platforms: selectedPlatforms, scheduledAt, attachments }
            : p
        )
      );
      setEditingPostId(null);
    } else {
      const newPost: Post = {
        id: Date.now().toString(),
        content,
        platforms: selectedPlatforms,
        scheduledAt: scheduledAt || new Date().toISOString(),
        attachments,
      };
      setPosts((prev) => [newPost, ...prev]);
    }

    // Limpiar formulario
    setContent('');
    setScheduledAt('');
    setAttachments([]);
  };

  const handleEditPost = (post: Post) => {
    setEditingPostId(post.id);
    setContent(post.content);
    setSelectedPlatforms(post.platforms);
    setScheduledAt(post.scheduledAt);
    setAttachments(post.attachments || []);
  };

  const handleDeletePost = (id: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== id));
  };

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]
    );
  };

  return (
    <div style={{ padding: '24px', fontFamily: 'system-ui, sans-serif', maxWidth: '1000px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#0f172a' }}>SocialForge Desktop</h1>
        <button
          onClick={() => setIsAccountsModalOpen(true)}
          style={{
            padding: '8px 16px',
            backgroundColor: '#0f172a',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          Gestionar Cuentas ({connectedAccounts.filter((a) => a.is_connected).length})
        </button>
      </header>

      {/* Editor de publicaciones */}
      <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', marginBottom: '32px', background: '#fff' }}>
        <h2 style={{ marginTop: 0, fontSize: '1.1rem' }}>
          {editingPostId ? 'Editar Publicación' : 'Crear Nueva Publicación'}
        </h2>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="¿Qué quieres compartir hoy?"
          rows={4}
          style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
        />

        {/* Adjuntos */}
        <div style={{ marginTop: '12px' }}>
          <label style={{ fontSize: '0.875rem', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Adjuntos:</label>
          <input type="file" multiple accept="image/*,video/*" onChange={handleFileUpload} />

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
            {attachments.map((att) => (
              <div key={att.id} style={{ position: 'relative', border: '1px solid #e2e8f0', padding: '4px', borderRadius: '4px' }}>
                {att.type === 'image' ? (
                  <img src={att.dataUrl} alt={att.name} style={{ width: '80px', height: '80px', objectFit: 'cover' }} />
                ) : (
                  <video src={att.dataUrl} style={{ width: '80px', height: '80px', objectFit: 'cover' }} />
                )}
                <button
                  onClick={() => handleRemoveAttachment(att.id)}
                  style={{
                    position: 'absolute',
                    top: '-6px',
                    right: '-6px',
                    background: '#ef4444',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '50%',
                    width: '20px',
                    height: '20px',
                    cursor: 'pointer',
                    fontSize: '10px',
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Plataformas */}
        <div style={{ marginTop: '12px' }}>
          <label style={{ fontSize: '0.875rem', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Plataformas:</label>
          <div style={{ display: 'flex', gap: '10px' }}>
            {['facebook', 'instagram', 'x', 'linkedin'].map((p) => (
              <label key={p} style={{ cursor: 'pointer', fontSize: '0.9rem' }}>
                <input
                  type="checkbox"
                  checked={selectedPlatforms.includes(p)}
                  onChange={() => togglePlatform(p)}
                />{' '}
                {p.toUpperCase()}
              </label>
            ))}
          </div>
        </div>

        {/* Programación */}
        <div style={{ marginTop: '12px' }}>
          <label style={{ fontSize: '0.875rem', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Fecha de Programación:</label>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
          />
        </div>

        <div style={{ marginTop: '16px', display: 'flex', gap: '10px' }}>
          <button
            onClick={handleSavePost}
            style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
          >
            {editingPostId ? 'Guardar Cambios' : 'Guardar Publicación'}
          </button>
          {editingPostId && (
            <button
              onClick={() => {
                setEditingPostId(null);
                setContent('');
                setAttachments([]);
              }}
              style={{ padding: '8px 16px', backgroundColor: '#64748b', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
            >
              Cancelar
            </button>
          )}
        </div>
      </div>

      {/* Lista de publicaciones */}
      <h2>Publicaciones ({posts.length})</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {posts.map((post) => (
          <div key={post.id} style={{ border: '1px solid #e2e8f0', padding: '12px', borderRadius: '8px', background: '#fff' }}>
            <p style={{ margin: '0 0 8px 0' }}>{post.content}</p>
            {post.attachments && post.attachments.length > 0 && (
              <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                {post.attachments.map((att) => (
                  <img
                    key={att.id}
                    src={att.dataUrl}
                    alt={att.name}
                    style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px' }}
                  />
                ))}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b' }}>
              <span>Plataformas: {post.platforms.join(', ')}</span>
              <span>{post.scheduledAt}</span>
            </div>
            <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
              <button onClick={() => handleEditPost(post)} style={{ fontSize: '0.8rem', cursor: 'pointer' }}>
                Editar
              </button>
              <button onClick={() => handleDeletePost(post.id)} style={{ fontSize: '0.8rem', color: '#ef4444', cursor: 'pointer' }}>
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>

      <SocialAccountsModal
        isOpen={isAccountsModalOpen}
        onClose={() => setIsAccountsModalOpen(false)}
        onAccountsUpdated={syncAccounts}
      />
    </div>
  );
}

export default App;