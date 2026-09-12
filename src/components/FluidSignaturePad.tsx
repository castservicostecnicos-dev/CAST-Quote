import React, { useRef, useEffect, useState, useCallback } from 'react';
import { RotateCcw, Trash2, Check, PenTool, Sparkles, Activity, Maximize2, Minimize2 } from 'lucide-react';

export interface FluidSignaturePadProps {
  onSave?: (dataUrl: string) => void;
  onStrokeChange?: (isEmpty: boolean, strokeCount: number) => void;
  height?: number;
  penColor?: string;
  penWidth?: number;
  readOnly?: boolean;
  showGuides?: boolean;
  showTelemetry?: boolean;
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
  dynamicWidth: boolean;
}

export const FluidSignaturePad: React.FC<FluidSignaturePadProps> = ({
  onSave,
  onStrokeChange,
  height = 240,
  penColor: defaultColor = '#1e3a8a', // Classic deep ballpoint blue
  penWidth: defaultWidth = 2.5,
  readOnly = false,
  showGuides = true,
  showTelemetry = true,
  initialDataUrl,
  clientName
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Drawing state
  const isDrawingRef = useRef(false);
  const currentStrokeRef = useRef<Point[]>([]);
  const strokesRef = useRef<Stroke[]>([]);
  const lastVelocityRef = useRef(0);
  const lastWidthRef = useRef(defaultWidth);

  // Settings state
  const [selectedColor, setSelectedColor] = useState(defaultColor);
  const [selectedWidth, setSelectedWidth] = useState(defaultWidth);
  const [dynamicThickness, setDynamicThickness] = useState(true);
  const [strokeCount, setStrokeCount] = useState(0);
  const [pointCount, setPointCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Color options: Formal Brazilian business colors
  const colorOptions = [
    { label: 'Azul Caneta', value: '#1d4ed8', bg: 'bg-blue-600' },
    { label: 'Azul Notarial', value: '#0f2b5c', bg: 'bg-slate-900' },
    { label: 'Preto Documental', value: '#09090b', bg: 'bg-black' }
  ];

  // Pen stroke presets
  const strokePresets = [
    { label: 'Fina (1.8px)', width: 1.8, dynamic: false },
    { label: 'Média Fluida (2.6px)', width: 2.6, dynamic: true },
    { label: 'Caligráfica (3.4px)', width: 3.4, dynamic: true }
  ];

  // Resize canvas with devicePixelRatio for Retina clarity
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    if (rect.width === 0) return;

    const dpr = Math.max(window.devicePixelRatio || 1, 2);
    const displayWidth = Math.floor(rect.width);
    const displayHeight = isFullscreen ? Math.min(Math.floor(window.innerHeight * 0.72), 520) : height;

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
  }, [height, isFullscreen]);

  useEffect(() => {
    resizeCanvas();
    const handleResize = () => resizeCanvas();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [resizeCanvas]);

  // Load initial image if provided
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

  // Redraw all strokes with quadratic Bézier smoothing
  const redrawAll = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.max(window.devicePixelRatio || 1, 2);
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;

    ctx.clearRect(0, 0, w, h);

    strokesRef.current.forEach((stroke) => {
      drawStroke(ctx, stroke);
    });

    if (onStrokeChange) {
      onStrokeChange(strokesRef.current.length === 0, strokesRef.current.length);
    }
  };

  // Draw an individual stroke using mid-point Bézier smoothing
  const drawStroke = (ctx: CanvasRenderingContext2D, stroke: Stroke) => {
    const points = stroke.points;
    if (points.length === 0) return;

    ctx.strokeStyle = stroke.color;
    ctx.fillStyle = stroke.color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (points.length === 1) {
      const p = points[0];
      ctx.beginPath();
      ctx.arc(p.x, p.y, stroke.baseWidth * 0.9, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    if (points.length === 2) {
      ctx.lineWidth = stroke.baseWidth;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      ctx.lineTo(points[1].x, points[1].y);
      ctx.stroke();
      return;
    }

    let currentWidth = stroke.baseWidth;

    for (let i = 1; i < points.length; i++) {
      const p1 = points[i - 1];
      const p2 = points[i];

      if (stroke.dynamicWidth) {
        const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        const timeDiff = Math.max(p2.time - p1.time, 16);
        const vel = Math.min(dist / timeDiff, 3.5);
        const targetWidth = Math.max(stroke.baseWidth * 0.65, Math.min(stroke.baseWidth * 1.35, stroke.baseWidth * (1.15 - vel * 0.25)));
        currentWidth = currentWidth * 0.7 + targetWidth * 0.3;
      } else {
        currentWidth = stroke.baseWidth;
      }

      ctx.lineWidth = currentWidth;

      const midPoint = {
        x: (p1.x + p2.x) / 2,
        y: (p1.y + p2.y) / 2
      };

      ctx.beginPath();
      if (i === 1) {
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(midPoint.x, midPoint.y);
      } else {
        const prevMid = {
          x: (points[i - 2].x + p1.x) / 2,
          y: (points[i - 2].y + p1.y) / 2
        };
        ctx.moveTo(prevMid.x, prevMid.y);
        ctx.quadraticCurveTo(p1.x, p1.y, midPoint.x, midPoint.y);
      }
      ctx.stroke();
    }
  };

  // Helper to extract clean coordinate from Pointer/Touch event
  const getCoordinates = useCallback((clientX: number, clientY: number, pressure = 0.5): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0, time: Date.now() };

    const rect = canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
      time: Date.now(),
      pressure: pressure > 0 ? pressure : 0.5
    };
  }, []);

  // Native non-passive touch listeners for 100% reliable mobile touch recognition
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onTouchStart = (e: TouchEvent) => {
      if (readOnly) return;
      e.preventDefault();
      e.stopPropagation();

      if (e.touches.length === 0) return;
      const touch = e.touches[0];
      const pt = getCoordinates(touch.clientX, touch.clientY, (touch as any).force || 0.5);

      isDrawingRef.current = true;
      lastVelocityRef.current = 0;
      lastWidthRef.current = selectedWidth;
      currentStrokeRef.current = [pt];

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = selectedColor;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, selectedWidth * 0.9, 0, Math.PI * 2);
        ctx.fill();
      }

      setPointCount((prev) => prev + 1);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isDrawingRef.current || readOnly) return;
      e.preventDefault();
      e.stopPropagation();

      if (e.touches.length === 0) return;
      const touch = e.touches[0];
      const pt = getCoordinates(touch.clientX, touch.clientY, (touch as any).force || 0.5);

      const stroke = currentStrokeRef.current;
      if (stroke.length > 0) {
        const lastPt = stroke[stroke.length - 1];
        const dist = Math.hypot(pt.x - lastPt.x, pt.y - lastPt.y);
        if (dist < 0.5) return;
      }

      stroke.push(pt);

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const len = stroke.length;
      if (len >= 3) {
        const p0 = stroke[len - 3];
        const p1 = stroke[len - 2];
        const p2 = stroke[len - 1];

        const mid1 = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
        const mid2 = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };

        let width = selectedWidth;
        if (dynamicThickness) {
          const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
          const timeDiff = Math.max(p2.time - p1.time, 16);
          const vel = Math.min(dist / timeDiff, 3.5);
          const targetW = Math.max(selectedWidth * 0.65, Math.min(selectedWidth * 1.35, selectedWidth * (1.15 - vel * 0.25)));
          lastWidthRef.current = lastWidthRef.current * 0.7 + targetW * 0.3;
          width = lastWidthRef.current;
        }

        ctx.strokeStyle = selectedColor;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = width;

        ctx.beginPath();
        ctx.moveTo(mid1.x, mid1.y);
        ctx.quadraticCurveTo(p1.x, p1.y, mid2.x, mid2.y);
        ctx.stroke();
      } else if (len === 2) {
        ctx.strokeStyle = selectedColor;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = selectedWidth;
        ctx.beginPath();
        ctx.moveTo(stroke[0].x, stroke[0].y);
        ctx.lineTo(stroke[1].x, stroke[1].y);
        ctx.stroke();
      }

      setPointCount((prev) => prev + 1);
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!isDrawingRef.current) return;
      e.preventDefault();
      e.stopPropagation();
      isDrawingRef.current = false;

      if (currentStrokeRef.current.length > 0) {
        strokesRef.current.push({
          points: [...currentStrokeRef.current],
          color: selectedColor,
          baseWidth: selectedWidth,
          dynamicWidth: dynamicThickness
        });
        currentStrokeRef.current = [];

        const count = strokesRef.current.length;
        setStrokeCount(count);
        if (onStrokeChange) onStrokeChange(false, count);

        if (onSave) {
          const dataUrl = exportPng();
          if (dataUrl) onSave(dataUrl);
        }
      }
    };

    // Non-passive listeners ensure that touch dragging never triggers scroll on mobile
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', onTouchEnd, { passive: false });

    return () => {
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
      canvas.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [readOnly, selectedColor, selectedWidth, dynamicThickness, onStrokeChange, onSave, getCoordinates]);

  // Pointer Down: starts capturing touch/stylus/mouse
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (readOnly) return;
    if (e.pointerType === 'touch') return; // Handled by native touchstart for maximum responsiveness
    e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // Ignored if pointerId unsupported
    }

    isDrawingRef.current = true;
    lastVelocityRef.current = 0;
    lastWidthRef.current = selectedWidth;

    const pt = getCoordinates(e.clientX, e.clientY, e.pressure);
    currentStrokeRef.current = [pt];

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = selectedColor;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, selectedWidth * 0.9, 0, Math.PI * 2);
      ctx.fill();
    }

    setPointCount((prev) => prev + 1);
  };

  // Pointer Move: processes mouse and stylus events with coalesced support
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || readOnly) return;
    if (e.pointerType === 'touch') return; // Handled by native touchmove
    e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const nativeEvent = e.nativeEvent as PointerEvent;
    const coalescedList = typeof (nativeEvent as any).getCoalescedEvents === 'function'
      ? (nativeEvent as any).getCoalescedEvents()
      : null;
    const coalescedEvents = coalescedList && coalescedList.length > 0 ? coalescedList : [nativeEvent];

    for (const ce of coalescedEvents) {
      const pt = getCoordinates(ce.clientX, ce.clientY, ce.pressure);

      const stroke = currentStrokeRef.current;
      if (stroke.length > 0) {
        const lastPt = stroke[stroke.length - 1];
        const dist = Math.hypot(pt.x - lastPt.x, pt.y - lastPt.y);
        if (dist < 0.5) continue;
      }

      stroke.push(pt);

      const len = stroke.length;
      if (len >= 3) {
        const p0 = stroke[len - 3];
        const p1 = stroke[len - 2];
        const p2 = stroke[len - 1];

        const mid1 = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
        const mid2 = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };

        let width = selectedWidth;
        if (dynamicThickness) {
          const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
          const timeDiff = Math.max(p2.time - p1.time, 16);
          const vel = Math.min(dist / timeDiff, 3.5);
          const targetW = Math.max(selectedWidth * 0.65, Math.min(selectedWidth * 1.35, selectedWidth * (1.15 - vel * 0.25)));
          lastWidthRef.current = lastWidthRef.current * 0.7 + targetW * 0.3;
          width = lastWidthRef.current;
        }

        ctx.strokeStyle = selectedColor;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = width;

        ctx.beginPath();
        ctx.moveTo(mid1.x, mid1.y);
        ctx.quadraticCurveTo(p1.x, p1.y, mid2.x, mid2.y);
        ctx.stroke();
      } else if (len === 2) {
        ctx.strokeStyle = selectedColor;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = selectedWidth;
        ctx.beginPath();
        ctx.moveTo(stroke[0].x, stroke[0].y);
        ctx.lineTo(stroke[1].x, stroke[1].y);
        ctx.stroke();
      }
    }

    setPointCount((prev) => prev + coalescedEvents.length);
  };

  // Pointer Up/Cancel: commits stroke
  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === 'touch') return;
    if (!isDrawingRef.current) return;
    e.preventDefault();
    isDrawingRef.current = false;

    const canvas = canvasRef.current;
    if (canvas) {
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        // Ignored
      }
    }

    if (currentStrokeRef.current.length > 0) {
      strokesRef.current.push({
        points: [...currentStrokeRef.current],
        color: selectedColor,
        baseWidth: selectedWidth,
        dynamicWidth: dynamicThickness
      });
      currentStrokeRef.current = [];

      const count = strokesRef.current.length;
      setStrokeCount(count);
      if (onStrokeChange) onStrokeChange(false, count);

      if (onSave) {
        const dataUrl = exportPng();
        if (dataUrl) onSave(dataUrl);
      }
    }
  };

  // Clear all strokes
  const handleClear = () => {
    strokesRef.current = [];
    currentStrokeRef.current = [];
    setStrokeCount(0);
    setPointCount(0);

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const dpr = Math.max(window.devicePixelRatio || 1, 2);
        ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
      }
    }

    if (onStrokeChange) onStrokeChange(true, 0);
  };

  // Undo last stroke
  const handleUndo = () => {
    if (strokesRef.current.length === 0) return;
    strokesRef.current.pop();
    const count = strokesRef.current.length;
    setStrokeCount(count);
    redrawAll();

    if (onSave) {
      const dataUrl = exportPng();
      if (dataUrl) onSave(dataUrl);
    }
  };

  // Export clean PNG with transparent background
  const exportPng = (): string | null => {
    const canvas = canvasRef.current;
    if (!canvas || strokesRef.current.length === 0) return null;

    const dpr = Math.max(window.devicePixelRatio || 1, 2);

    // Create an offscreen canvas with original CSS dimensions multiplied by dpr
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return null;

    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    strokesRef.current.forEach((stroke) => {
      drawStroke(ctx, stroke);
    });

    return exportCanvas.toDataURL('image/png');
  };

  return (
    <div className={`w-full flex flex-col bg-white border-2 border-slate-300 rounded-xl overflow-hidden shadow-sm transition-all ${isFullscreen ? 'fixed inset-0 z-50 p-4 bg-slate-900/90 flex items-center justify-center' : ''}`}>
      {/* Top Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 bg-slate-100/90 border-b border-slate-200 text-xs text-slate-700">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-semibold text-slate-800">
            <PenTool className="w-3.5 h-3.5 text-blue-600" />
            <span>Assinatura Digital</span>
          </div>

          {/* Color Chooser */}
          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-300">
            {colorOptions.map((c) => (
              <button
                key={c.value}
                type="button"
                title={c.label}
                onClick={() => setSelectedColor(c.value)}
                className={`w-5 h-5 rounded-full border-2 transition-transform ${c.bg} ${
                  selectedColor === c.value ? 'scale-110 border-blue-500 shadow-sm ring-2 ring-blue-300' : 'border-transparent opacity-70 hover:opacity-100'
                }`}
              />
            ))}
          </div>

          {/* Preset Tips */}
          <div className="hidden sm:flex items-center gap-1 pl-2 border-l border-slate-300">
            {strokePresets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  setSelectedWidth(preset.width);
                  setDynamicThickness(preset.dynamic);
                }}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  selectedWidth === preset.width
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons: Undo & Clear */}
        <div className="flex items-center gap-1.5 ml-auto">
          <button
            type="button"
            onClick={handleUndo}
            disabled={strokeCount === 0 || readOnly}
            title="Desfazer último traço"
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-medium disabled:opacity-40 disabled:pointer-events-none transition shadow-2xs"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden sm:inline">Desfazer</span>
          </button>

          <button
            type="button"
            onClick={handleClear}
            disabled={strokeCount === 0 || readOnly}
            title="Limpar assinatura"
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 text-xs font-medium disabled:opacity-40 disabled:pointer-events-none transition shadow-2xs"
          >
            <Trash2 className="w-3 h-3" />
            <span>Limpar</span>
          </button>

          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? 'Reduzir tela' : 'Expandir área de assinatura (Ideal para celular)'}
            className="p-1 rounded-lg bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 transition"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Boundary Header Notice */}
      <div className="px-3 py-1 bg-amber-50/70 border-b border-amber-200/50 flex items-center justify-between text-[11px] text-amber-800">
        <span className="flex items-center gap-1 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Área delimitada de assinatura • Assine dentro do retângulo abaixo
        </span>
        <span className="text-[10px] text-amber-700 font-mono hidden sm:inline">
          Limites ativos 100% calibrados
        </span>
      </div>

      {/* Main Touch Canvas Area with High-Contrast Visible Boundary Box */}
      <div
        ref={containerRef}
        className={`relative w-full bg-white select-none touch-none cursor-crosshair overflow-hidden border-2 border-dashed border-slate-300 m-2 rounded-lg ${
          isFullscreen ? 'w-[92vw] max-w-3xl rounded-xl shadow-2xl border-blue-400 m-4' : ''
        }`}
        style={{
          height: isFullscreen ? '480px' : `${height}px`,
          width: 'calc(100% - 16px)'
        }}
      >
        {/* Corner Boundary Tick Marks for Instant Visual Identification */}
        <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-slate-400 pointer-events-none" />
        <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-slate-400 pointer-events-none" />
        <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-slate-400 pointer-events-none" />
        <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-slate-400 pointer-events-none" />

        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="absolute inset-0 w-full h-full touch-none block"
          style={{ touchAction: 'none' }}
        />

        {/* Guides: Prominent Baseline & Signing Note */}
        {showGuides && (
          <div className="absolute inset-x-6 bottom-6 pointer-events-none flex flex-col items-center">
            <div className="w-full border-b-2 border-slate-400 mb-1 flex justify-between items-baseline text-xs text-slate-500 select-none">
              <span className="font-bold text-slate-700 text-sm">✕</span>
              <span className="text-[11px] font-medium tracking-wide">Assine acima desta linha</span>
              <span className="text-[9px] uppercase font-mono tracking-wider bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">Área Útil</span>
            </div>
            {clientName ? (
              <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                {clientName}
              </p>
            ) : (
              <p className="text-[10px] text-slate-400">
                Toque e deslize suavemente com o dedo ou caneta stylus.
              </p>
            )}
          </div>
        )}

        {/* Empty state hint */}
        {strokeCount === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 text-xs font-medium tracking-wide">
            <div className="flex flex-col items-center gap-1.5 bg-slate-50/80 backdrop-blur-xs px-4 py-2.5 rounded-xl border border-slate-200 shadow-2xs">
              <Sparkles className="w-4 h-4 text-blue-500 animate-pulse" />
              <span>Toque com o dedo na tela para assinar</span>
              <span className="text-[10px] text-slate-400">Reconhecimento contínuo de traços ativo</span>
            </div>
          </div>
        )}
      </div>

      {/* Real-time Stroke Telemetry & Training Bar */}
      {showTelemetry && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-600">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-emerald-500" />
              <strong className="text-slate-800">Reconhecimento:</strong>
              <span className="text-emerald-600 font-medium">Bézier Suave 120Hz Ativo</span>
            </span>

            <span className="hidden sm:inline text-slate-300">•</span>

            <span className="hidden sm:inline">
              Traços: <strong className="text-slate-800">{strokeCount}</strong>
            </span>

            <span className="hidden md:inline text-slate-300">•</span>

            <span className="hidden md:inline">
              Pontos coletados: <strong className="text-slate-800">{pointCount}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {strokeCount > 0 ? (
              <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-100/80 px-2.5 py-0.5 rounded-full border border-emerald-300">
                <Check className="w-3 h-3" /> Traçado Válido Reconhecido
              </span>
            ) : (
              <span className="text-slate-400 italic">Aguardando assinatura dentro dos limites</span>
            )}

            {isFullscreen && (
              <button
                type="button"
                onClick={() => setIsFullscreen(false)}
                className="px-3 py-1 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
              >
                Concluir Tela Cheia
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
