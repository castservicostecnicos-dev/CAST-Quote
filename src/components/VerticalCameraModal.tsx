import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, X, AlertTriangle, CheckCircle2, RotateCcw, RotateCw, Crop, Image as ImageIcon } from 'lucide-react';
import { api } from '../services/api';

interface VerticalCameraModalProps {
  companyId: string;
  isOpen: boolean;
  onClose: () => void;
  onPhotoAdded: (photo: { url: string; width: number; height: number; caption: string }) => void;
  initialMode?: 'camera' | 'file';
}

export const VerticalCameraModal: React.FC<VerticalCameraModalProps> = ({
  companyId,
  isOpen,
  onClose,
  onPhotoAdded,
  initialMode = 'camera'
}) => {
  const [mode, setMode] = useState<'camera' | 'file'>(initialMode);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState('');
  const [preview, setPreview] = useState<{ dataUrl: string; width: number; height: number } | null>(null);
  const [orientationNotice, setOrientationNotice] = useState<string | null>(null);
  const [isVideoVertical, setIsVideoVertical] = useState(true);
  const [isDragging, setIsDragging] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      if (initialMode === 'camera') {
        startCamera();
      } else {
        stopCamera();
      }
    } else {
      stopCamera();
      setPreview(null);
      setCaption('');
      setOrientationNotice(null);
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, initialMode]);

  const startCamera = async () => {
    stopCamera();
    setCameraError(null);
    setOrientationNotice(null);
    try {
      const constraints: MediaStreamConstraints = {
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          aspectRatio: { ideal: 9 / 16 },
          width: { ideal: 1080 },
          height: { ideal: 1920 }
        }
      };
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(e => console.warn('Autoplay prevented:', e));
      }
    } catch (err: any) {
      console.warn('Unable to access camera:', err);
      setCameraError('Câmera indisponível neste dispositivo ou navegador. Use o envio de arquivo abaixo.');
      setMode('file');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }
  };

  const handleVideoLoadedMetadata = () => {
    if (videoRef.current) {
      const vw = videoRef.current.videoWidth;
      const vh = videoRef.current.videoHeight;
      const isVert = vw < vh;
      setIsVideoVertical(isVert);
      if (!isVert) {
        setOrientationNotice('Câmera na horizontal. Para fotos no padrão CAST, posicione o celular em pé.');
      } else {
        setOrientationNotice(null);
      }
    }
  };

  const captureCameraPhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const width = video.videoWidth;
    const height = video.videoHeight;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, width, height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

    stopCamera();
    setPreview({ dataUrl, width, height });

    if (width >= height) {
      setOrientationNotice('A foto capturada está na horizontal. Use "Girar 90°" ou "Enquadrar Retrato" para ajustar ao padrão do relatório.');
    } else {
      setOrientationNotice(null);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setOrientationNotice('Por favor, selecione um arquivo de imagem válido (JPG, PNG, WebP).');
      return;
    }

    setOrientationNotice(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const width = img.naturalWidth;
        const height = img.naturalHeight;

        setPreview({ dataUrl, width, height });

        if (width >= height) {
          setOrientationNotice(
            'Imagem horizontal detectada. Você pode girar 90° ou enquadrar no formato retrato vertical (2:3).'
          );
        } else {
          setOrientationNotice(null);
        }
      };
      img.onerror = () => {
        setOrientationNotice('Erro ao carregar a imagem. Tente outro arquivo.');
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const rotatePhotoClockwise = () => {
    if (!preview) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.height;
      canvas.height = img.width;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((90 * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      setPreview({
        dataUrl,
        width: canvas.width,
        height: canvas.height
      });
      if (canvas.width < canvas.height) {
        setOrientationNotice(null);
      }
    };
    img.src = preview.dataUrl;
  };

  const cropPhotoToPortrait = () => {
    if (!preview) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      let targetHeight = img.height;
      let targetWidth = Math.round((targetHeight * 2) / 3);
      if (targetWidth > img.width) {
        targetWidth = img.width;
        targetHeight = Math.round((targetWidth * 3) / 2);
      }
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const startX = Math.max(0, (img.width - targetWidth) / 2);
      const startY = Math.max(0, (img.height - targetHeight) / 2);
      ctx.drawImage(img, startX, startY, targetWidth, targetHeight, 0, 0, targetWidth, targetHeight);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      setPreview({
        dataUrl,
        width: targetWidth,
        height: targetHeight
      });
      setOrientationNotice(null);
    };
    img.src = preview.dataUrl;
  };

  const confirmPhoto = async () => {
    if (!preview) return;

    setUploading(true);
    setOrientationNotice(null);
    try {
      let finalDataUrl = preview.dataUrl;
      let finalWidth = preview.width;
      let finalHeight = preview.height;

      // If image is still horizontal/square, auto-enframe into vertical 2:3 canvas before saving
      if (finalWidth >= finalHeight) {
        const converted = await new Promise<{ dataUrl: string; width: number; height: number }>((resolve) => {
          const img = new Image();
          img.onload = () => {
            let targetHeight = img.height;
            let targetWidth = Math.round((targetHeight * 2) / 3);
            if (targetWidth > img.width) {
              targetWidth = img.width;
              targetHeight = Math.round((targetWidth * 3) / 2);
            }
            const canvas = document.createElement('canvas');
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              const startX = Math.max(0, (img.width - targetWidth) / 2);
              const startY = Math.max(0, (img.height - targetHeight) / 2);
              ctx.drawImage(img, startX, startY, targetWidth, targetHeight, 0, 0, targetWidth, targetHeight);
              resolve({
                dataUrl: canvas.toDataURL('image/jpeg', 0.92),
                width: targetWidth,
                height: targetHeight
              });
            } else {
              resolve({ dataUrl: preview.dataUrl, width: preview.width, height: preview.height });
            }
          };
          img.onerror = () => resolve({ dataUrl: preview.dataUrl, width: preview.width, height: preview.height });
          img.src = preview.dataUrl;
        });
        finalDataUrl = converted.dataUrl;
        finalWidth = converted.width;
        finalHeight = converted.height;
      }

      const result = await api.uploadPhoto({
        image: finalDataUrl,
        width: finalWidth,
        height: finalHeight,
        company_id: companyId,
        caption: caption.trim()
      });

      onPhotoAdded({
        url: result.url,
        width: result.width || finalWidth,
        height: result.height || finalHeight,
        caption: caption.trim()
      });

      handleClose();
    } catch (err: any) {
      console.error('Erro ao enviar foto:', err);
      setOrientationNotice(err.message || 'Erro ao enviar foto para o servidor');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    stopCamera();
    setPreview(null);
    setCaption('');
    setOrientationNotice(null);
    onClose();
  };

  if (!isOpen) return null;

  const isVertical = preview ? preview.height > preview.width : true;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg my-auto rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Anexar Foto ao Orçamento</h3>
              <p className="text-xs text-slate-400">Padrão vertical (2:3) para relatórios e PDF</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switcher */}
        {!preview && (
          <div className="flex border-b border-slate-800 bg-slate-900/60 p-1.5 gap-1.5">
            <button
              onClick={() => {
                setMode('camera');
                startCamera();
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                mode === 'camera'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              Câmera do Dispositivo
            </button>
            <button
              onClick={() => {
                stopCamera();
                setMode('file');
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                mode === 'file'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              Carregar Arquivo / Galeria
            </button>
          </div>
        )}

        {/* Orientation Notice / Alert */}
        {orientationNotice && (
          <div className="m-3 p-3 rounded-xl bg-amber-950/80 border border-amber-600/70 text-amber-200 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-none mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold text-amber-100 block mb-0.5">Ajuste de Orientação</span>
              <span>{orientationNotice}</span>
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center min-h-[300px]">
          {preview ? (
            /* Preview Screen */
            <div className="w-full flex flex-col items-center space-y-4">
              <div className="relative rounded-xl overflow-hidden border-2 border-slate-700 shadow-xl max-h-[320px] aspect-[2/3] bg-black flex items-center justify-center">
                <img
                  src={preview.dataUrl}
                  alt="Pré-visualização da foto"
                  className="w-full h-full object-contain"
                />

                <div
                  className={`absolute top-2 right-2 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-md ${
                    isVertical ? 'bg-emerald-600' : 'bg-amber-600'
                  }`}
                >
                  {isVertical ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                  {isVertical ? 'VERTICAL VÁLIDA' : 'HORIZONTAL'}
                </div>

                <div className="absolute bottom-2 left-2 bg-black/70 text-slate-300 text-[10px] px-2 py-0.5 rounded">
                  {preview.width} x {preview.height} px
                </div>
              </div>

              {/* Adjust Tools if user wants to rotate or crop */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={rotatePhotoClockwise}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition"
                  title="Girar 90° no sentido horário"
                >
                  <RotateCw className="w-3.5 h-3.5 text-blue-400" />
                  Girar 90°
                </button>
                <button
                  type="button"
                  onClick={cropPhotoToPortrait}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition"
                  title="Enquadrar centralmente no formato retrato 2:3"
                >
                  <Crop className="w-3.5 h-3.5 text-emerald-400" />
                  Enquadrar Retrato (2:3)
                </button>
              </div>

              {/* Caption input */}
              <div className="w-full">
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Legenda da Foto (opcional, impresso no PDF)
                </label>
                <input
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Ex: Foto do painel elétrico principal..."
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500"
                />
              </div>

              {/* Action buttons */}
              <div className="flex w-full gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setPreview(null);
                    setOrientationNotice(null);
                    if (mode === 'camera') startCamera();
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Trocar Foto
                </button>
                <button
                  type="button"
                  onClick={confirmPhoto}
                  disabled={uploading}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700 transition flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50"
                >
                  {uploading ? (
                    <span>Salvando foto...</span>
                  ) : (
                    <span>Adicionar ao Orçamento</span>
                  )}
                </button>
              </div>
            </div>
          ) : mode === 'camera' ? (
            /* Live Camera Stream */
            <div className="w-full flex flex-col items-center">
              {cameraError ? (
                <div className="text-center p-6 text-slate-400 text-sm">
                  <p className="mb-4">{cameraError}</p>
                  <button
                    onClick={() => setMode('file')}
                    className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700"
                  >
                    Carregar Arquivo da Galeria
                  </button>
                </div>
              ) : (
                <>
                  <div className="relative w-full max-w-[260px] aspect-[9/16] bg-black rounded-2xl overflow-hidden border-2 border-slate-700 shadow-2xl flex items-center justify-center">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      onLoadedMetadata={handleVideoLoadedMetadata}
                      className="w-full h-full object-cover"
                    />

                    {/* Viewfinder guide */}
                    <div className="absolute inset-3 border-2 border-dashed border-white/50 rounded-xl pointer-events-none flex flex-col items-center justify-between p-2">
                      <span className="text-[10px] font-semibold text-white/80 bg-black/50 px-2 py-0.5 rounded">
                        ENQUADRAMENTO VERTICAL
                      </span>
                      {!isVideoVertical && (
                        <div className="bg-amber-600/90 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg text-center shadow-lg animate-pulse">
                          GIRE PARA A VERTICAL
                        </div>
                      )}
                      <span className="text-[9px] text-white/70 bg-black/50 px-1.5 py-0.5 rounded">
                        CAST QUOTE
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col items-center gap-2">
                    <button
                      type="button"
                      onClick={captureCameraPhoto}
                      className="w-14 h-14 rounded-full border-4 border-white bg-blue-600 hover:bg-blue-500 text-white shadow-xl flex items-center justify-center transition active:scale-95"
                      title="Capturar Foto"
                    >
                      <div className="w-5 h-5 rounded-full bg-white" />
                    </button>
                    <span className="text-[11px] text-slate-400">
                      Toque para capturar
                    </span>
                  </div>
                </>
              )}
            </div>
          ) : (
            /* File Upload & Drag-and-Drop Area */
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`w-full flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-2xl transition text-center cursor-pointer ${
                isDragging
                  ? 'border-blue-500 bg-blue-600/10'
                  : 'border-slate-700 bg-slate-800/50 hover:bg-slate-800'
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.jpg,.jpeg,.png,.webp,.svg,.bmp"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload-input"
              />
              <div className="w-14 h-14 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center mb-3">
                <Upload className="w-7 h-7" />
              </div>
              <p className="text-sm font-semibold text-white mb-1">
                Selecione ou arraste uma foto aqui
              </p>
              <p className="text-xs text-slate-400 max-w-xs mb-4">
                Aceita fotos do celular, galeria ou computador. Se a imagem for horizontal, ajustamos automaticamente para o formato retrato.
              </p>
              <button
                type="button"
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-md transition"
              >
                Escolher Arquivo
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
