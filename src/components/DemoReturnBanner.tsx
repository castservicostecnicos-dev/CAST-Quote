import React, { useState } from 'react';
import { Presentation, Layers, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const DemoReturnBanner: React.FC = () => {
  const { user, login } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  // Strictly only show if an explicit DEV simulation was initiated in this session
  // Real client logins will NEVER have cast_dev_simulating in sessionStorage
  const isDevSimulation =
    typeof window !== 'undefined' &&
    sessionStorage.getItem('cast_dev_simulating') === 'true';

  // Demo banner should NEVER appear for DEV account or real client logins
  if (!isDevSimulation || dismissed || user?.role === 'DEV' || !user) {
    return null;
  }

  const handleDismiss = () => {
    sessionStorage.removeItem('cast_dev_simulating');
    localStorage.removeItem('cast_demo_mode');
    setDismissed(true);
  };

  const handleReturnToDev = async () => {
    try {
      sessionStorage.removeItem('cast_dev_simulating');
      localStorage.removeItem('cast_demo_mode');
      setDismissed(true);
      await login('ale11062@gmail.com', 'cast.2468');
    } catch (err: any) {
      alert('Erro ao retornar para o perfil DEV: ' + err.message);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-3">
      <div className="rounded-2xl bg-slate-900/95 text-white p-3 sm:px-4 sm:py-2.5 shadow-2xl border border-purple-500/50 backdrop-blur-md flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-purple-600/30 border border-purple-400/40 text-purple-300 flex items-center justify-center flex-none">
          <Presentation className="w-4 h-4" />
        </div>

        <div className="text-xs">
          <span className="font-bold text-purple-300 block leading-tight">
            Simulação de Perfil (DEV)
          </span>
          <span className="text-[11px] text-slate-300">
            Visualizando como <strong className="text-white">{user.name} ({user.role})</strong>
          </span>
        </div>

        <div className="flex items-center gap-1.5 ml-1">
          <button
            type="button"
            onClick={handleReturnToDev}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition shadow-md active:scale-95 flex-none"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Voltar para DEV</span>
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Fechar simulação"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
