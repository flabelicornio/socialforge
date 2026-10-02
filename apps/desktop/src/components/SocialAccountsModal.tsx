import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface FacebookPage {
  id: string;
  name: string;
  access_token: string;
}

interface SocialAccountsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccountsUpdated?: (pages: FacebookPage[]) => void;
}

export const SocialAccountsModal: React.FC<SocialAccountsModalProps> = ({
  isOpen,
  onClose,
  onAccountsUpdated,
}) => {
  const [inputUrl, setInputUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectedPages, setConnectedPages] = useState<FacebookPage[]>([]);

  if (!isOpen) return null;

  const handleStartOAuth = async () => {
    try {
      const res = await invoke<{ auth_url: string }>('get_facebook_auth_url');
      window.open(res.auth_url, '_blank');
    } catch (err) {
      setError(`Error al obtener URL de autenticación: ${err}`);
    }
  };

  const handleProcessToken = async () => {
    if (!inputUrl.trim()) return;
    setLoading(true);
    setError(null);

    let token = inputUrl.trim();
    if (token.includes('access_token=')) {
      const match = token.match(/access_token=([^&]+)/);
      if (match && match[1]) {
        token = match[1];
      }
    }

    try {
      const pages = await invoke<FacebookPage[]>('fetch_facebook_pages', {
        userAccessToken: token,
      });
      setConnectedPages(pages);
      if (onAccountsUpdated) onAccountsUpdated(pages);
      setInputUrl('');
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={modalOverlayStyle}>
      <div style={modalContainerStyle}>
        <div style={headerStyle}>
          <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Gestión de Cuentas Conectadas</h2>
          <button onClick={onClose} style={closeButtonStyle}>✕</button>
        </div>

        <div style={{ padding: '1.5rem' }}>
          {error && <div style={errorBannerStyle}>{error}</div>}

          <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
            <button onClick={handleStartOAuth} style={primaryButtonStyle}>
              📘 Conectar con Facebook / Meta
            </button>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.5rem' }}>
              Se abrirá una ventana para autorizar los permisos de tus páginas.
            </p>
          </div>

          <div style={inputSectionStyle}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', display: 'block' }}>
              Pegar URL de respuesta o Access Token:
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="https://socialforge.latamstudios.com/oauth/facebook/callback#access_token=..."
                style={inputStyle}
              />
              <button
                onClick={handleProcessToken}
                disabled={loading || !inputUrl.trim()}
                style={actionButtonStyle}
              >
                {loading ? 'Vinculando...' : 'Vincular'}
              </button>
            </div>
          </div>

          <div style={{ marginTop: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Páginas Vinculadas ({connectedPages.length})</h3>
            {connectedPages.length === 0 ? (
              <p style={{ fontSize: '0.875rem', color: '#94a3b8' }}>No hay páginas vinculadas en esta sesión.</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {connectedPages.map((page) => (
                  <li key={page.id} style={pageItemStyle}>
                    <span><strong>{page.name}</strong> (ID: {page.id})</span>
                    <span style={{ color: '#16a34a', fontSize: '0.8rem', fontWeight: 600 }}>Connected</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Estilos CSS-in-JS para mantener UI/UX aislada y limpia
const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(15, 23, 42, 0.65)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 1000,
};

const modalContainerStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  width: '90%',
  maxWidth: '520px',
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  overflow: 'hidden',
  color: '#1e293b',
};

const headerStyle: React.CSSProperties = {
  padding: '1rem 1.5rem',
  borderBottom: '1px solid #e2e8f0',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  backgroundColor: '#f8fafc',
};

const closeButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  fontSize: '1.25rem',
  cursor: 'pointer',
  color: '#64748b',
};

const primaryButtonStyle: React.CSSProperties = {
  backgroundColor: '#1877f2',
  color: '#ffffff',
  border: 'none',
  padding: '0.65rem 1.25rem',
  borderRadius: '8px',
  fontWeight: 600,
  cursor: 'pointer',
  fontSize: '0.95rem',
};

const inputSectionStyle: React.CSSProperties = {
  backgroundColor: '#f8fafc',
  padding: '1rem',
  borderRadius: '8px',
  border: '1px solid #e2e8f0',
};

const inputStyle: React.CSSProperties = {
  flex: 1,
  padding: '0.5rem 0.75rem',
  borderRadius: '6px',
  border: '1px solid #cbd5e1',
  fontSize: '0.85rem',
};

const actionButtonStyle: React.CSSProperties = {
  backgroundColor: '#0f172a',
  color: '#ffffff',
  border: 'none',
  padding: '0.5rem 1rem',
  borderRadius: '6px',
  fontWeight: 600,
  cursor: 'pointer',
};

const errorBannerStyle: React.CSSProperties = {
  backgroundColor: '#fef2f2',
  color: '#dc2626',
  padding: '0.75rem',
  borderRadius: '6px',
  marginBottom: '1rem',
  fontSize: '0.85rem',
  border: '1px solid #fecaca',
};

const pageItemStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '0.6rem 0.8rem',
  backgroundColor: '#f1f5f9',
  borderRadius: '6px',
  marginBottom: '0.5rem',
  fontSize: '0.875rem',
};