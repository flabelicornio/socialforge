import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { SocialAccountsModal, Account } from './components/SocialAccountsModal';

export const App: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [postContent, setPostContent] = useState<string>('');
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadAccounts = async () => {
    try {
      const res = await invoke<Account[]>('get_connected_accounts');
      setAccounts(res);
      if (res.length > 0 && !selectedAccountId) {
        setSelectedAccountId(res[0].account_id);
      }
    } catch (err) {
      console.error('Error cargando cuentas:', err);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const handlePublish = async () => {
    if (!selectedAccountId) {
      setStatusMessage({ type: 'error', text: 'Por favor selecciona una página para publicar.' });
      return;
    }
    if (!postContent.trim()) {
      setStatusMessage({ type: 'error', text: 'El contenido de la publicación no puede estar vacío.' });
      return;
    }

    setIsPublishing(true);
    setStatusMessage(null);

    try {
      // Invocamos el comando real de Rust: publish_post
      const postId = await invoke<string>('publish_post', {
        accountId: selectedAccountId,
        message: postContent,
        linkUrl: null
      });
      setStatusMessage({ type: 'success', text: `¡Publicado e insertado en SQLite exitosamente! ID Post: ${postId}` });
      setPostContent('');
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: `Error al publicar: ${String(err)}` });
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center font-black text-xl">
            SF
          </div>
          <h1 className="text-xl font-bold tracking-tight">SocialForge Desktop</h1>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
        >
          <span>Gestión de Cuentas</span>
          {accounts.length > 0 && (
            <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-0.5 rounded-full font-bold">
              {accounts.length}
            </span>
          )}
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-6 flex flex-col gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-slate-200">Crear Publicación Directa</h2>

          {/* Selector de Cuentas */}
          <div className="flex flex-col gap-2">
            <label className="text-xs text-slate-400 font-medium">Publicar en la Cuenta/Página:</label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
            >
              {accounts.length === 0 ? (
                <option value="">No hay cuentas conectadas (Añade una en Gestión de Cuentas)</option>
              ) : (
                accounts.map((acc) => (
                  <option key={acc.account_id} value={acc.account_id}>
                    [{acc.platform.toUpperCase()}] {acc.account_name} ({acc.account_id})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Editor de Mensaje */}
          <div className="flex flex-col gap-2">
            <label className="text-xs text-slate-400 font-medium">Contenido del Post:</label>
            <textarea
              rows={5}
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              placeholder="¿Qué quieres compartir hoy en tus redes con SocialForge?"
              className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-100 focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          {/* Banner de Estado */}
          {statusMessage && (
            <div
              className={`p-3 rounded-lg text-sm border ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-red-500/10 border-red-500/30 text-red-400'
              }`}
            >
              {statusMessage.text}
            </div>
          )}

          {/* Acciones */}
          <div className="flex justify-end pt-2">
            <button
              onClick={handlePublish}
              disabled={isPublishing || accounts.length === 0}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium px-6 py-2.5 rounded-lg transition-colors flex items-center gap-2"
            >
              {isPublishing ? 'Publicando en Meta Graph...' : 'Publicar Ahora'}
            </button>
          </div>
        </div>
      </main>

      {/* Modal Cuentas */}
      <SocialAccountsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAccountsUpdated={loadAccounts}
      />
    </div>
  );
};

export default App;