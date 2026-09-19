import React, { useRef, useEffect, useState, useCallback } from 'react';
import { RotateCcw, Trash2, Check, PenTool, Maximize2, Minimize2 } from 'lucide-react';

export interface FluidSignaturePadProps {
  onSave?: (dataUrl: string) => void;
  onStrokeChange?: (isEmpty: boolean, strokeCount: number) => void;
  height?: number;
  penColor?: string;
  penWidth?: number;
  readOnly?: boolean;
  showGuides?: boolean;
  initialDataUrl?: string;
  clientName?: string;
}

interface Point {
  x: number;
  y: number;
  time: number;
  pressure?: number;
}

interface Stroke {
  points: Point[];
  color: string;
  baseWidth: number;
}

export const FluidSignaturePad: React.FC<FluidSignaturePadProps> = ({
  onSave,
  onStrokeChange,
  height = 240,
  penColor: defaultColor = '#1d4ed8', // Royal Blue
  penWidth: defaultWidth = 2.6,
  readOnly = false,
  showGuides = true,
  initialDataUrl,
  clientName
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Drawing state in refs for ultra-low latency & 120fps touch tracking
  const isDrawingRef = useRef(false);
  const currentPointsRef = useRef<Point[]>([]);
  const strokesRef = useRef<Stroke[]>([]);
  const lastWidthRef = useRef(defaultWidth);
  const lastVelocityRef = useRef(0);

  // UI state
  const [selectedColor, setSelectedColor] = useState(defaultColor);
  const [strokeCount, setStrokeCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isHoveringBoundary, setIsHoveringBoundary] = useState(false);

  // Pen color options: Traditional Document Colors
  const colorOptions = [
    { label: 'Azul Caneta', value: '#1d4ed8', hexBg: 'bg-blue-600' },
    { label: 'Azul Notarial', value: '#0f2b5c', hexBg: 'bg-slate-900' },
    { label: 'Preto Documental', value: '#09090b', hexBg: 'bg-black' }
  ];

  // Helper to compute stroke width smoothly according to speed/pressure
  const computeWidth = useCallback((p1: Point, p2: Point, baseWidth: number): number => {
    const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const dt = Math.max(p2.time - p1.time, 10);
    const velocity = Math.min(dist / dt, 4.0);

    // Smooth velocity transition
    const smoothedVelocity = 0.6 * velocity + 0.4 * lastVelocityRef.current;
    lastVelocityRef.current = smoothedVelocity;

    // Faster motion = thinner stroke, slower motion = fuller ink
    const velocityFactor = Math.max(0.6, Math.min(1.4, 1.25 - smoothedVelocity * 0.28));
    const targetWidth = baseWidth * velocityFactor;

    // Blend with previous width to eliminate sharp steps
    const finalWidth = 0.65 * lastWidthRef.current + 0.35 * targetWidth;
    lastWidthRef.current = finalWidth;
    return finalWidth;
  }, []);

  // Redraw all strokes with quadratic Bézier curve interpolation
  const redrawAll = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.max(window.devicePixelRatio || 1, 2);
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;

    ctx.clearRect(0, 0, w, h);

    strokesRef.current.forEach((stroke) => {
      const pts = stroke.points;
      if (pts.length === 0) return;

      ctx.strokeStyle = stroke.color;
      ctx.fillStyle = stroke.color;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (pts.length === 1) {
        ctx.beginPath();
        ctx.arc(pts[0].x, pts[0].y, stroke.baseWidth * 0.9, 0, Math.PI * 2);
        ctx.fill();
        return;
      }

      if (pts.length === 2) {
        ctx.lineWidth = stroke.baseWidth;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        ctx.lineTo(pts[1].x, pts[1].y);
        ctx.stroke();
        return;
      }

      // Smooth Bézier curve through midpoints
      let currWidth = stroke.baseWidth;
      for (let i = 1; i < pts.length; i++) {
        const p1 = pts[i - 1];
        const p2 = pts[i];
        currWidth = computeWidth(p1, p2, stroke.baseWidth);
        ctx.lineWidth = currWidth;

        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;

        ctx.beginPath();
        if (i === 1) {
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(midX, midY);
        } else {
          const prevMidX = (pts[i - 2].x + p1.x) / 2;
          const prevMidY = (pts[i - 2].y + p1.y) / 2;
          ctx.moveTo(prevMidX, prevMidY);
          ctx.quadraticCurveTo(p1.x, p1.y, midX, midY);
        }
        ctx.stroke();
      }
    });

    const isEmpty = strokesRef.current.length === 0;
    setStrokeCount(strokesRef.current.length);
    if (onStrokeChange) {
      onStrokeChange(isEmpty, strokesRef.current.length);
    }
  }, [computeWidth, onStrokeChange]);

  // High-DPI canvas resizing
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    if (rect.width === 0) return;

    const dpr = Math.max(window.devicePixelRatio || 1, 2);
    const displayWidth = Math.floor(rect.width);
    const displayHeight = isFullscreen
      ? Math.min(Math.floor(window.innerHeight * 0.65), 520)
      : height;

    canvas.width = Math.floor(displayWidth * dpr);
    canvas.height = Math.floor(displayHeight * dpr);
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
    }

    redrawAll();
  }, [height, isFullscreen, redrawAll]);

  useEffect(() => {
    resizeCanvas();
    const handleResize = () => resizeCanvas();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [resizeCanvas]);

  // Load initial dataUrl if provided
  useEffect(() => {
    if (initialDataUrl && canvasRef.current) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const dpr = Math.max(window.devicePixelRatio || 1, 2);
        const w = canvas.width / dpr;
        const h = canvas.height / dpr;
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        setStrokeCount(1);
        if (onStrokeChange) onStrokeChange(false, 1);
      };
      img.src = initialDataUrl;
    }
  }, [initialDataUrl, onStrokeChange]);

  // Export clean PNG
  const emitSave = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || strokesRef.current.length === 0) return;
    try {
      const dataUrl = canvas.toDataURL('image/png');
      if (onSave) onSave(dataUrl);
    } catch (err) {
      console.error('Erro ao exportar assinatura do canvas:', err);
    }
  }, [onSave]);

  // Coordinate normalizer respecting canvas boundary
  const getCoordinates = useCallback((clientX: number, clientY: number): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0, time: Date.now() };
    const rect = canvas.getBoundingClientRect();

    // Constrain strictly within bounding box with a 4px inner padding
    const rawX = clientX - rect.left;
    const rawY = clientY - rect.top;
    const clampedX = Math.max(4, Math.min(rect.width - 4, rawX));
    const clampedY = Math.max(4, Math.min(rect.height - 4, rawY));

    return {
      x: clampedX,
      y: clampedY,
      time: Date.now()
    };
  }, []);

  // Pointer start (Mouse, Touch, Stylus)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (readOnly) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    if (canvas) {
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {}
    }

    const pt = getCoordinates(e.clientX, e.clientY);
    isDrawingRef.current = true;
    currentPointsRef.current = [pt];
    lastWidthRef.current = defaultWidth;
    lastVelocityRef.current = 0;
    setIsHoveringBoundary(true);

    const ctx = canvas?.getContext('2d');
    if (ctx) {
      ctx.strokeStyle = selectedColor;
      ctx.fillStyle = selectedColor;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, defaultWidth * 0.9, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  // Pointer move
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || readOnly) return;
    e.preventDefault();

    const pt = getCoordinates(e.clientX, e.clientY);
    const pts = currentPointsRef.current;
    pts.push(pt);

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    if (pts.length >= 2) {
      const p1 = pts[pts.length - 2];
      const p2 = pts[pts.length - 1];
      const strokeW = computeWidth(p1, p2, defaultWidth);

      ctx.strokeStyle = selectedColor;
      ctx.lineWidth = strokeW;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;

      ctx.beginPath();
      if (pts.length === 2) {
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(midX, midY);
      } else {
        const p0 = pts[pts.length - 3];
        const prevMidX = (p0.x + p1.x) / 2;
        const prevMidY = (p0.y + p1.y) / 2;
        ctx.moveTo(prevMidX, prevMidY);
        ctx.quadraticCurveTo(p1.x, p1.y, midX, midY);
      }
      ctx.stroke();
    }
  };

  // Pointer end
  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || readOnly) return;
    isDrawingRef.current = false;
    setIsHoveringBoundary(false);

    const canvas = canvasRef.current;
    if (canvas) {
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {}
    }

    if (currentPointsRef.current.length > 0) {
      strokesRef.current.push({
        points: [...currentPointsRef.current],
        color: selectedColor,
        baseWidth: defaultWidth
      });
      currentPointsRef.current = [];
      setStrokeCount(strokesRef.current.length);
      if (onStrokeChange) {
        onStrokeChange(false, strokesRef.current.length);
      }
      emitSave();
    }
  };

  // Clear signature
  const handleClear = () => {
    strokesRef.current = [];
    currentPointsRef.current = [];
    setStrokeCount(0);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const dpr = Math.max(window.devicePixelRatio || 1, 2);
        ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
      }
    }
    if (onStrokeChange) onStrokeChange(true, 0);
    if (onSave) onSave('');
  };

  // Undo last stroke
  const handleUndo = () => {
    if (strokesRef.current.length === 0) return;
    strokesRef.current.pop();
    redrawAll();
    emitSave();
  };

  return (
    <div className="w-full flex flex-col select-none">
      {/* Top Toolbar: Pen Color and Controls */}
      <div className="flex items-center justify-between gap-2 pb-2.5 px-0.5">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
            <PenTool className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden sm:inline">Cor da Tinta:</span>
          </span>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            {colorOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSelectedColor(opt.value)}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition ${
                  selectedColor === opt.value
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className={`w-2.5 h-2.5 rounded-full ${opt.hexBg}`} />
                <span className="text-[11px] font-medium hidden xs:inline">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons: Undo, Clear, Fullscreen */}
        <div className="flex items-center gap-1.5 ml-auto">
          <button
            type="button"
            onClick={handleUndo}
            disabled={strokeCount === 0 || readOnly}
            title="Desfazer último traço"
            className="flex items-center gap-1 px-3 py-1.5 min-h-[38px] rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold disabled:opacity-40 disabled:pointer-events-none transition shadow-2xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Desfazer</span>
          </button>

          <button
            type="button"
            onClick={handleClear}
            disabled={strokeCount === 0 || readOnly}
            title="Limpar assinatura"
            className="flex items-center gap-1 px-3 py-1.5 min-h-[38px] rounded-xl bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 text-xs font-semibold disabled:opacity-40 disabled:pointer-events-none transition shadow-2xs"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Limpar</span>
          </button>

          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? 'Reduzir tela' : 'Expandir área de assinatura (Ideal para celular)'}
            className="flex items-center gap-1 px-2.5 py-1.5 min-h-[38px] rounded-xl bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 text-xs font-semibold transition"
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-4 h-4" />
                <span className="hidden md:inline">Reduzir</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-4 h-4" />
                <span className="hidden md:inline">Expandir</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Clear Demarcation Notice */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-t-xl text-[11px] text-slate-700 font-medium">
        <span className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${isHoveringBoundary ? 'bg-blue-600' : 'bg-slate-400'}`} />
          Espaço de Assinatura {clientName ? `• ${clientName}` : ''}
        </span>
        <span className="text-[10px] text-slate-500 font-medium hidden sm:inline">
          Área livre para assinar
        </span>
      </div>

      {/* Main Touch Canvas Area with High-Contrast Visible Boundary Box */}
      <div
        ref={containerRef}
        className={`relative w-full bg-white select-none touch-none cursor-crosshair overflow-hidden border-2 rounded-b-xl transition-all duration-200 ${
          isHoveringBoundary
            ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
            : 'border-slate-300 hover:border-slate-400 shadow-inner'
        }`}
        style={{
          height: isFullscreen ? '420px' : `${height}px`
        }}
      >
        {/* Optimized Canvas Element - 100% clean white, zero overlays */}
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="absolute inset-0 w-full h-full touch-none block bg-white"
          style={{ touchAction: 'none' }}
        />
      </div>

      {/* Footer Status Bar */}
      <div className="flex items-center justify-between px-2 pt-2 text-[11px] text-slate-500">
        <div className="flex items-center gap-1.5">
          {strokeCount > 0 ? (
            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <Check className="w-3 h-3" /> {strokeCount} traço{strokeCount > 1 ? 's' : ''} registrado{strokeCount > 1 ? 's' : ''}
            </span>
          ) : (
            <span className="text-slate-400">Nenhum traço registrado</span>
          )}
        </div>

        <span className="text-[10px] text-slate-400">
          Traçado suave sem pixelização
        </span>
      </div>
    </div>
  );
};
