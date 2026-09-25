import React from 'react';
import { Sparkles, ShieldCheck, HardDrive, RefreshCw } from 'lucide-react';

interface SplashScreenProps {
  statusText?: string;
  brandColor?: string;
  isBackendWakingUp?: boolean;
  retryCount?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  statusText = 'Carregando ecossistema CAST QUOTE...',
  brandColor = '#2563eb',
  isBackendWakingUp = false,
  retryCount = 0
}) => {
  return (
    <div
      id="cast-splash-screen"
      className="fixed inset-0 z-9999 flex flex-col items-center justify-between bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-6 py-10 text-white select-none overflow-hidden"
      style={{ minHeight: '100dvh' }}
    >
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />
      <div
        className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-80 h-80 rounded-full blur-3xl pointer-events-none opacity-20"
        style={{ backgroundColor: brandColor }}
      />

      {/* Top Tag */}
      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-[11px] font-semibold tracking-wider text-slate-300 backdrop-blur-md">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
        <span>CONEXÃO SEGURA E CRIPTOGRAFADA</span>
      </div>

      {/* Center Hero Logo and Branding */}
      <div className="flex flex-col items-center justify-center text-center max-w-sm w-full my-auto">
        {/* Logo Emblem with Smooth Breathing Effect */}
        <div className="relative mb-6">
          <div
            className="absolute -inset-2 rounded-3xl blur-md opacity-40 animate-pulse"
            style={{ backgroundColor: brandColor }}
          />
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-slate-900 border-2 border-slate-700/80 shadow-2xl flex items-center justify-center p-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 512 512"
              className="w-full h-full drop-shadow-md"
            >
              <defs>
                <linearGradient id="splashBlueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#1d4ed8" />
                </linearGradient>
                <linearGradient id="splashAmberGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fbbf24" />
                  <stop offset="100%" stopColor="#f59e0b" />
                </linearGradient>
              </defs>
              <rect x="80" y="80" width="352" height="352" rx="48" fill="#1e293b" stroke="#334155" strokeWidth="6" />
              <rect x="136" y="128" width="240" height="272" rx="20" fill="#ffffff" />
              <rect x="136" y="128" width="240" height="64" rx="20" fill="url(#splashBlueGrad)" />
              <circle cx="176" cy="160" r="14" fill="#ffffff" opacity="0.9" />
              <rect x="204" y="152" width="130" height="16" rx="8" fill="#ffffff" />
              <rect x="168" y="220" width="176" height="14" rx="7" fill="#cbd5e1" />
              <rect x="168" y="248" width="140" height="14" rx="7" fill="#e2e8f0" />
              <rect x="168" y="276" width="160" height="14" rx="7" fill="#e2e8f0" />
              <rect x="168" y="324" width="176" height="44" rx="12" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="2" />
              <circle cx="196" cy="346" r="10" fill="url(#splashAmberGrad)" />
              <rect x="220" y="338" width="100" height="16" rx="6" fill="#0284c7" />
            </svg>
          </div>
        </div>

        {/* Brand Name */}
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center justify-center gap-2">
          <span>CAST</span>
          <span style={{ color: brandColor }}>QUOTE</span>
        </h1>
        <p className="text-xs text-slate-400 font-medium tracking-wide mt-1">
          SISTEMA DE GESTÃO, ORÇAMENTOS E ORDENS DE SERVIÇO
        </p>

        {/* Dynamic Status / Loading bar */}
        <div className="w-full mt-8 space-y-3">
          <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden border border-slate-700/50 p-[1px]">
            <div
              className="h-full rounded-full animate-pulse transition-all duration-500"
              style={{
                width: isBackendWakingUp ? '85%' : '100%',
                backgroundColor: brandColor
              }}
            />
          </div>

          <div className="flex items-center justify-center gap-2 text-xs font-medium text-slate-300">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
            <span>{statusText}</span>
          </div>

          {isBackendWakingUp && (
            <div className="mt-2 p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50 text-[11px] text-slate-300 text-center leading-relaxed">
              <p className="font-semibold text-amber-300 flex items-center justify-center gap-1.5 mb-0.5">
                <HardDrive className="w-3.5 h-3.5" />
                <span>Inicializando servidor em nuvem...</span>
              </p>
              <p className="text-slate-400 text-[10px]">
                Aguarde alguns instantes enquanto o ambiente de dados e serviços é ativado com segurança.
                {retryCount > 0 ? ` (Tentativa ${retryCount})` : ''}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="flex flex-col items-center gap-1 text-[11px] text-slate-500">
        <div className="flex items-center gap-1 font-semibold text-slate-400">
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span>CAST ENGENHARIA & TECNOLOGIA</span>
        </div>
        <span>Versão 1.0 • PWA & Offline-First Ready</span>
      </div>
    </div>
  );
};
