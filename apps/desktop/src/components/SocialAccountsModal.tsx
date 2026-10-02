import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

export interface Account {
  id: number;
  platform: string;
  account_name: string;
  account_id: string;
  access_token: string;
  expires_at?: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAccountsUpdated?: () => void;
}

export const SocialAccountsModal: React.FC<Props> = ({ isOpen, onClose, onAccountsUpdated }) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [inputToken, setInputToken] = useState<string>('');
  const [showTokenInput, setShowTokenInput] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const fetchAccounts = async () => {
    try {
      const res = await invoke<Account[]>('get_connected_accounts');
      setAccounts(res);
      if (onAccountsUpdated) onAccountsUpdated();
    } catch (err: any) {
      console.error('Error al obtener cuentas:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAccounts();
      setErrorMessage('');
    }
  }, [isOpen]);

  const handleStartFacebookOAuth = async () => {
    try {
      setErrorMessage('');
      const res = await invoke<{ auth_url: string }>('get_facebook_auth_url');
      window.open(res.auth_url, '_blank');
      setShowTokenInput(true);
    } catch (err: any) {
      setErrorMessage('Error abriendo ventana de login: ' + String(err));
    }
  };

  const handleSubmitToken = async () => {
    if (!inputToken.trim()) return;
    setLoading(true);
    setErrorMessage('');

    let tokenToSave = inputToken.trim();

    // Extrae automáticamente el token si pegas la URL completa de redirección
    if (tokenToSave.includes('access_token=')) {
      const match = tokenToSave.match(/access_token=([^&]+)/);
      if (match && match[1]) {
        tokenToSave = match[1];
      }
    }

    try {
      await invoke<Account[]>('save_facebook_token', { userAccessToken: tokenToSave });
      setInputToken('');
      setShowTokenInput(false);
      await fetchAccounts();
    } catch (err: any) {
      setErrorMessage('Error al vincular cuentas de Facebook: ' + String(err));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-xl w-full max-w-lg shadow-2xl p-6 flex flex-col gap-5">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <h2 className="text-xl font-bold tracking-tight">Cuentas Conectadas</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 transition-colors"
          >
            ✕
          </button>
        </div>

        {errorMessage && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-3 rounded-lg break-words">
            {errorMessage}
          </div>
        )}

        {/* Lista de Cuentas Conectadas en SQLite */}
        <div className="flex flex-col gap-3 max-h-60 overflow-y-auto pr-1">
          {accounts.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-4">
              No hay cuentas vinculadas. Haz clic abajo para conectar Facebook.
            </p>
          ) : (
            accounts.map((acc) => (
              <div
                key={acc.id}
                className="flex items-center justify-between p-3 bg-slate-800/60 border border-slate-700/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-xs uppercase">
                    {acc.platform.substring(0, 2)}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{acc.account_name}</p>
                    <p className="text-xs text-slate-400">ID: {acc.account_id}</p>
                  </div>
                </div>
                <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-1 rounded">
                  Conectada
                </span>
              </div>
            ))
          )}
        </div>

        {/* Acciones de vinculación */}
        <div className="border-t border-slate-800 pt-4 flex flex-col gap-3">
          <button
            onClick={handleStartFacebookOAuth}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <span>Conectar Facebook / Páginas</span>
          </button>

          {showTokenInput && (
            <div className="mt-2 flex flex-col gap-2 bg-slate-800/40 p-3 border border-slate-700/40 rounded-lg">
              <label className="text-xs text-slate-300 font-medium">
                Pega la URL del navegador o el Access Token de Facebook:
              </label>
              <input
                type="text"
                value={inputToken}
                onChange={(e) => setInputToken(e.target.value)}
                placeholder="Pega aquí la URL completa resultante o el token..."
                className="bg-slate-950 border border-slate-700 rounded p-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={handleSubmitToken}
                disabled={loading || !inputToken.trim()}
                className="self-end bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded transition-colors"
              >
                {loading ? 'Obteniendo Páginas de Meta...' : 'Guardar y Vincular'}
              </button>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm px-4 py-2 rounded-lg transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};