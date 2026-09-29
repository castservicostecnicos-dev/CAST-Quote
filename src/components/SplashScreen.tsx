import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  ShieldCheck,
  HardDrive,
  RefreshCw,
  FileText,
  Wrench,
  Camera,
  PenTool,
  Printer,
  Building2,
  Boxes,
  Cloud,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Radio
} from 'lucide-react';

interface FeatureTip {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  badge: string;
  title: string;
  description: string;
}

const FEATURE_TIPS: FeatureTip[] = [
  {
    id: 'quotes',
    icon: FileText,
    badge: 'Comercial',
    title: 'Gestão Completa de Orçamentos',
    description: 'Elabore propostas profissionais com cálculo dinâmico de serviços, materiais, mão de obra e margens de lucro de forma rápida.'
  },
  {
    id: 'orders',
    icon: Wrench,
    badge: 'Operação',
    title: 'Ordens de Serviço em Tempo Real',
    description: 'Acompanhe o ciclo completo de cada atendimento, da aprovação inicial até a conclusão pelo técnico, com histórico detalhado.'
  },
  {
    id: 'photos',
    icon: Camera,
    badge: 'Vistoria',
    title: 'Laudo com Fotos Verticais',
    description: 'Registre evidências fotográficas no padrão vertical diretamente pelo aplicativo, com data, hora e marcação automática.'
  },
  {
    id: 'signature',
    icon: PenTool,
    badge: 'Validação',
    title: 'Assinatura Digital no Dispositivo',
    description: 'Colete a validação e o aceite formal do cliente na tela do celular ou tablet, agilizando aprovações sem necessidade de papel.'
  },
  {
    id: 'pdf',
    icon: Printer,
    badge: 'Documentos',
    title: 'PDFs Profissionais & Compartilhamento',
    description: 'Gere documentos elegantes com a identidade visual da sua empresa e envie com um clique via WhatsApp ou e-mail.'
  },
  {
    id: 'multicompany',
    icon: Building2,
    badge: 'Multiempresa',
    title: 'Gestão Multiempresa & Permissões',
    description: 'Gerencie filiais e personalize logotipo, cores corporativas e níveis de acesso exclusivos para cada equipe.'
  },
  {
    id: 'catalog',
    icon: Boxes,
    badge: 'Agilidade',
    title: 'Catálogo de Serviços & Insumos',
    description: 'Cadastre tabelas de preços padronizadas para preencher orçamentos rapidamente em campo, sem retrabalho de digitação.'
  },
  {
    id: 'cloud_offline',
    icon: Cloud,
    badge: 'Disponibilidade',
    title: 'Sincronização & Modo Offline',
    description: 'Trabalhe com segurança mesmo em locais sem internet. Seus dados são salvos localmente e sincronizados de forma transparente.'
  }
];

export interface SplashScreenProps {
  statusText?: string;
  brandColor?: string;
  isBackendWakingUp?: boolean;
  retryCount?: number;
  onFinish?: () => void;
  minDurationMs?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  brandColor = '#2563eb',
  onFinish,
  minDurationMs = 2400
}) => {
  // Visual states
  const [progress, setProgress] = useState<number>(0);
  const [currentTipIndex, setCurrentTipIndex] = useState<number>(0);
  const [tipTransitioning, setTipTransitioning] = useState<boolean>(false);
  const [isFadingOut, setIsFadingOut] = useState<boolean>(false);

  // Server health / cold-start states
  const [serverAwake, setServerAwake] = useState<boolean>(false);
  const [isColdStarting, setIsColdStarting] = useState<boolean>(false);
  const [retryAttempts, setRetryAttempts] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('Iniciando ecossistema CAST QUOTE...');

  const startTimeRef = useRef<number>(Date.now());
  const serverAwakeRef = useRef<boolean>(false);
  const hasFinishedRef = useRef<boolean>(false);

  // 1. Elapsed Seconds Counter
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 2. Health check ping loop: actively monitors the Render server cold start
  useEffect(() => {
    let isCancelled = false;
    let pollTimeoutId: any = null;

    const probeServerHealth = async (): Promise<boolean> => {
      try {
        const controller = new AbortController();
        const abortTimeout = setTimeout(() => controller.abort(), 4000);
        const res = await fetch('/api/health', {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          signal: controller.signal
        });
        clearTimeout(abortTimeout);
        return res.ok;
      } catch {
        return false;
      }
    };

    const runProbeCycle = async () => {
      if (isCancelled || serverAwakeRef.current) return;

      const isOk = await probeServerHealth();

      if (isCancelled) return;

      if (isOk) {
        serverAwakeRef.current = true;
        setServerAwake(true);
        setIsColdStarting(false);
      } else {
        setRetryAttempts(prev => {
          const next = prev + 1;
          if (next >= 1 || Date.now() - startTimeRef.current > 3000) {
            setIsColdStarting(true);
          }
          return next;
        });

        // Retry in 1.4s
        pollTimeoutId = setTimeout(runProbeCycle, 1400);
      }
    };

    // First attempt immediately
    runProbeCycle();

    return () => {
      isCancelled = true;
      if (pollTimeoutId) clearTimeout(pollTimeoutId);
    };
  }, []);

  // 3. Smooth percentage progress engine
  useEffect(() => {
    const interval = setInterval(() => {
      if (hasFinishedRef.current) return;

      const now = Date.now();
      const elapsedMs = now - startTimeRef.current;
      const isAwake = serverAwakeRef.current;

      // Determine target percentage
      let target = 0;

      if (!isAwake) {
        // While waiting for the server to wake up on Render:
        // Smoothly progress up to 90%, but do NOT reach 100% until server is confirmed ready!
        if (elapsedMs < 1200) {
          target = Math.min(30, (elapsedMs / 1200) * 30);
        } else if (elapsedMs < 4000) {
          target = 30 + ((elapsedMs - 1200) / 2800) * 25; // 30% -> 55%
        } else if (elapsedMs < 15000) {
          target = 55 + ((elapsedMs - 4000) / 11000) * 20; // 55% -> 75%
        } else if (elapsedMs < 35000) {
          target = 75 + ((elapsedMs - 15000) / 20000) * 13; // 75% -> 88%
        } else {
          // Asymptotically creep towards 92% max while waiting
          target = Math.min(92, 88 + (elapsedMs - 35000) / 10000);
        }

        // Set contextual status message during wait
        if (elapsedMs < 2000) {
          setStatusMessage('Carregando catálogo de serviços e preferências...');
        } else if (elapsedMs < 5000) {
          setStatusMessage('Conectando ao servidor em nuvem...');
        } else {
          setStatusMessage('Aguardando inicialização do servidor no Render...');
        }
      } else {
        // Server is awake!
        // Guarantee minimum animation duration so the splash screen is smooth and delightful
        const timeRatio = Math.min(1, elapsedMs / minDurationMs);
        if (timeRatio < 1) {
          target = Math.max(70, timeRatio * 98);
          setStatusMessage('Finalizando preparativos e sincronização...');
        } else {
          target = 100;
          setStatusMessage('Ambiente pronto! Entrando no sistema...');
        }
      }

      // Move progress smoothly towards target
      setProgress(prev => {
        if (prev >= 100) return 100;
        const diff = target - prev;
        if (diff <= 0.2 && target === 100) {
          return 100;
        }
        // Smooth interpolation step
        const step = Math.max(0.4, diff * 0.16);
        const next = Math.min(target, prev + step);
        return Math.round(next * 10) / 10;
      });

      // Completion check
      if (isAwake && progress >= 99.5 && elapsedMs >= minDurationMs) {
        hasFinishedRef.current = true;
        setProgress(100);
        setStatusMessage('Ambiente pronto! Entrando no sistema...');

        // Smooth fade-out before triggering unmount/completion
        setTimeout(() => {
          setIsFadingOut(true);
          setTimeout(() => {
            if (onFinish) {
              onFinish();
            }
          }, 320);
        }, 400);
      }
    }, 40);

    return () => clearInterval(interval);
  }, [progress, minDurationMs, onFinish]);

  // 4. Feature Tip Auto-Rotation (every 3.8s)
  useEffect(() => {
    const tipInterval = setInterval(() => {
      setTipTransitioning(true);
      setTimeout(() => {
        setCurrentTipIndex(prev => (prev + 1) % FEATURE_TIPS.length);
        setTipTransitioning(false);
      }, 200);
    }, 3800);

    return () => clearInterval(tipInterval);
  }, []);

  const handlePrevTip = () => {
    setTipTransitioning(true);
    setTimeout(() => {
      setCurrentTipIndex(prev => (prev - 1 + FEATURE_TIPS.length) % FEATURE_TIPS.length);
      setTipTransitioning(false);
    }, 150);
  };

  const handleNextTip = () => {
    setTipTransitioning(true);
    setTimeout(() => {
      setCurrentTipIndex(prev => (prev + 1) % FEATURE_TIPS.length);
      setTipTransitioning(false);
    }, 150);
  };

  // Manual bypass if user wants to enter offline/cache mode when cold start takes too long
  const handleBypassOffline = () => {
    serverAwakeRef.current = true;
    setServerAwake(true);
    setProgress(100);
    setStatusMessage('Iniciando com dados locais salvos...');
    setTimeout(() => {
      setIsFadingOut(true);
      setTimeout(() => {
        if (onFinish) onFinish();
      }, 250);
    }, 250);
  };

  const activeTip = FEATURE_TIPS[currentTipIndex];
  const TipIcon = activeTip.icon;

  return (
    <div
      id="cast-splash-screen"
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-between bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4 sm:px-6 py-6 sm:py-8 text-white select-none overflow-y-auto transition-opacity duration-300 ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{ minHeight: '100dvh' }}
    >
      {/* Background ambient lighting */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-20 transition-all duration-700"
        style={{ backgroundColor: brandColor }}
      />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-80 h-80 rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />

      {/* Top Header Bar */}
      <div className="w-full max-w-lg flex items-center justify-between gap-2 z-10">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-800 text-[11px] font-semibold tracking-wider text-slate-300 backdrop-blur-md shadow-sm">
          {isColdStarting ? (
            <>
              <Radio className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span className="text-amber-300">CONECTANDO AO SERVIDOR EM NUVEM</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>CONEXÃO SEGURA E CRIPTOGRAFADA</span>
            </>
          )}
        </div>

        {elapsedSeconds > 4 && (
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-[11px] font-medium text-slate-400 backdrop-blur-md">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>{elapsedSeconds}s</span>
          </div>
        )}
      </div>

      {/* Main Center Area */}
      <div className="flex flex-col items-center justify-center text-center max-w-md w-full my-auto py-4 z-10">
        {/* App Logo & Breathing Aura */}
        <div className="relative mb-4 sm:mb-5">
          <div
            className="absolute -inset-3 rounded-3xl blur-lg opacity-40 animate-pulse transition-all duration-500"
            style={{ backgroundColor: brandColor }}
          />
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl sm:rounded-3xl bg-slate-900 border-2 border-slate-700/80 shadow-2xl flex items-center justify-center p-1.5 overflow-hidden">
            <img
              src="/app-logo.png"
              alt="CAST Quote"
              className="w-full h-full object-contain rounded-xl sm:rounded-2xl drop-shadow-md"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>

        {/* Brand Name */}
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center justify-center gap-2">
          <span>CAST</span>
          <span style={{ color: brandColor }}>QUOTE</span>
        </h1>
        <p className="text-[11px] sm:text-xs text-slate-400 font-medium tracking-wider uppercase mt-1">
          SISTEMA DE GESTÃO, ORÇAMENTOS E ORDENS DE SERVIÇO
        </p>

        {/* Progress Bar & Percentage Section */}
        <div className="w-full mt-6 space-y-2.5">
          {/* Percentage Counter and Status Label */}
          <div className="flex items-end justify-between px-1">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 truncate max-w-[280px]">
              {progress >= 100 ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400 shrink-0" />
              )}
              <span className="truncate">{statusMessage}</span>
            </span>
            <span
              className="text-2xl sm:text-3xl font-black font-mono tracking-tight leading-none drop-shadow-sm"
              style={{ color: progress >= 100 ? '#10b981' : (brandColor || '#3b82f6') }}
            >
              {Math.round(progress)}%
            </span>
          </div>

          {/* Progress Bar Track */}
          <div className="w-full bg-slate-900/90 rounded-full h-3 border border-slate-700/80 p-0.5 overflow-hidden shadow-inner relative">
            <div
              className="h-full rounded-full transition-all duration-150 ease-out relative"
              style={{
                width: `${Math.min(100, Math.max(3, progress))}%`,
                background: progress >= 100
                  ? 'linear-gradient(90deg, #10b981, #059669)'
                  : `linear-gradient(90deg, ${brandColor}, #3b82f6, #6366f1)`
              }}
            >
              {/* Shimmer line inside progress fill */}
              <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full" />
            </div>
          </div>
        </div>

        {/* Cold-Start Informative Notice (when Render server is waking up from sleep) */}
        {isColdStarting && (
          <div className="w-full mt-4 p-3 rounded-xl bg-slate-900/90 border border-amber-500/40 text-left shadow-lg backdrop-blur-md animate-fadeIn">
            <div className="flex items-center gap-2 text-amber-300 font-semibold text-xs mb-1">
              <HardDrive className="w-4 h-4 text-amber-400 shrink-0 animate-bounce" />
              <span>Inicializando servidor em nuvem (Render)</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              O servidor entra em repouso quando inativo para economia de recursos. O primeiro carregamento pode levar de 30 a 50 segundos para subir o ambiente completo.
            </p>
            <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-800">
              <span>Tentativas de conexão: {retryAttempts}</span>
              <span>Aguardando resposta do servidor...</span>
            </div>

            {/* Offline Bypass Option if Render takes longer than 35s */}
            {elapsedSeconds >= 35 && (
              <div className="mt-2 pt-2 border-t border-slate-800/80 flex justify-center">
                <button
                  type="button"
                  onClick={handleBypassOffline}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-medium text-slate-200 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Cloud className="w-3.5 h-3.5 text-blue-400" />
                  <span>Continuar no Modo Offline</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Rotating Informative Feature Carousel (O que o sistema faz / Informações genéricas) */}
        <div className="w-full mt-5 relative">
          <div className="w-full rounded-2xl bg-slate-900/90 border border-slate-800/90 p-4 sm:p-5 shadow-xl backdrop-blur-md text-left transition-all duration-300">
            {/* Card Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Conheça o CAST Quote
                </span>
              </div>
              <span className="text-[10px] font-semibold text-slate-400 px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700">
                {currentTipIndex + 1} de {FEATURE_TIPS.length}
              </span>
            </div>

            {/* Dynamic Tip Body */}
            <div
              className={`flex items-start gap-3 transition-opacity duration-200 min-h-[64px] ${
                tipTransitioning ? 'opacity-0 scale-98' : 'opacity-100 scale-100'
              }`}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-slate-700/60 shadow-inner"
                style={{ backgroundColor: `${brandColor}20`, color: brandColor }}
              >
                <TipIcon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="text-xs sm:text-sm font-bold text-white tracking-tight truncate">
                    {activeTip.title}
                  </h3>
                  <span className="text-[9px] font-semibold uppercase px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                    {activeTip.badge}
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed">
                  {activeTip.description}
                </p>
              </div>
            </div>

            {/* Carousel Controls & Indicators */}
            <div className="mt-3.5 pt-2.5 border-t border-slate-800 flex items-center justify-between">
              {/* Dots */}
              <div className="flex items-center gap-1.5">
                {FEATURE_TIPS.map((tip, idx) => (
                  <button
                    key={tip.id}
                    type="button"
                    onClick={() => setCurrentTipIndex(idx)}
                    className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                      idx === currentTipIndex
                        ? 'w-5 bg-white'
                        : 'w-1.5 bg-slate-700 hover:bg-slate-500'
                    }`}
                    aria-label={`Ver dica ${idx + 1}`}
                  />
                ))}
              </div>

              {/* Prev / Next Buttons */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrevTip}
                  className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Dica anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNextTip}
                  className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Próxima dica"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Branding Info */}
      <div className="flex flex-col items-center gap-1 text-[11px] text-slate-500 z-10 text-center">
        <div className="flex items-center gap-1 font-semibold text-slate-400">
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span>CAST ENGENHARIA &amp; TECNOLOGIA</span>
        </div>
        <span>Versão 1.0 • PWA &amp; Offline-First Ready • Nuvem Integrada</span>
      </div>
    </div>
  );
};
