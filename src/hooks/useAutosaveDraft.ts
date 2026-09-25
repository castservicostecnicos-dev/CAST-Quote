import { useState, useEffect, useRef, useCallback } from 'react';

export interface SavedDraftWrapper<T> {
  data: T;
  timestamp: number;
  formattedTime: string;
}

interface UseAutosaveDraftOptions<T> {
  storageKey: string;
  data: T;
  enabled?: boolean;
  isReady?: boolean; // Don't save before initial load/hydration is complete
  debounceMs?: number;
  hasMeaningfulChanges?: (data: T) => boolean;
}

export function useAutosaveDraft<T>({
  storageKey,
  data,
  enabled = true,
  isReady = true,
  debounceMs = 1200,
  hasMeaningfulChanges
}: UseAutosaveDraftOptions<T>) {
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [savedDraft, setSavedDraft] = useState<SavedDraftWrapper<T> | null>(null);
  const [hasSavedDraft, setHasSavedDraft] = useState<boolean>(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const previousDataJsonRef = useRef<string>('');
  const pendingDataJsonRef = useRef<string>('');
  const lastKnownRawDraftRef = useRef<string | null>(null);
  const hasMeaningfulChangesRef = useRef(hasMeaningfulChanges);
  hasMeaningfulChangesRef.current = hasMeaningfulChanges;
  const dataRef = useRef(data);
  dataRef.current = data;

  // Check for existing draft in localStorage on initialization or key change
  const checkForExistingDraft = useCallback(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        if (raw === lastKnownRawDraftRef.current) {
          return null;
        }
        const parsed: SavedDraftWrapper<T> = JSON.parse(raw);
        if (parsed && parsed.data) {
          // Verify if meaningful
          const isMeaningful = hasMeaningfulChangesRef.current
            ? hasMeaningfulChangesRef.current(parsed.data)
            : true;
          if (isMeaningful) {
            lastKnownRawDraftRef.current = raw;
            setSavedDraft(parsed);
            setHasSavedDraft(true);
            return parsed;
          } else {
            localStorage.removeItem(storageKey);
          }
        }
      }
    } catch (e) {
      console.warn('Erro ao ler rascunho de salvamento automático:', e);
    }
    lastKnownRawDraftRef.current = null;
    setSavedDraft((prev) => (prev !== null ? null : prev));
    setHasSavedDraft((prev) => (prev !== false ? false : prev));
    return null;
  }, [storageKey]);

  useEffect(() => {
    if (enabled) {
      checkForExistingDraft();
    } else {
      lastKnownRawDraftRef.current = null;
      pendingDataJsonRef.current = '';
      setStatus((prev) => (prev !== 'idle' ? 'idle' : prev));
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    }
  }, [enabled, storageKey]);

  // Safely serialize data
  let currentJson = '';
  try {
    currentJson = JSON.stringify(data);
  } catch {
    currentJson = '';
  }

  // Debounced auto-save effect
  useEffect(() => {
    if (!enabled || !isReady || !currentJson) {
      return;
    }

    // Skip if unchanged or already scheduled for this payload
    if (previousDataJsonRef.current === currentJson || pendingDataJsonRef.current === currentJson) {
      return;
    }

    // Skip empty or initial default states
    if (hasMeaningfulChangesRef.current && !hasMeaningfulChangesRef.current(dataRef.current)) {
      previousDataJsonRef.current = currentJson;
      return;
    }

    // Mark pending so repeated renders don't re-trigger
    pendingDataJsonRef.current = currentJson;
    setStatus((prev) => (prev !== 'saving' ? 'saving' : prev));

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      try {
        const now = new Date();
        const wrapper: SavedDraftWrapper<T> = {
          data: dataRef.current,
          timestamp: now.getTime(),
          formattedTime: now.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          })
        };
        const stringified = JSON.stringify(wrapper);
        localStorage.setItem(storageKey, stringified);
        lastKnownRawDraftRef.current = stringified;
        previousDataJsonRef.current = currentJson;
        pendingDataJsonRef.current = '';
        setLastSavedAt(now);
        setStatus('saved');
        setSavedDraft(wrapper);
      } catch (err) {
        console.warn('Falha ao salvar rascunho em localStorage:', err);
        pendingDataJsonRef.current = '';
        setStatus('idle');
      }
    }, debounceMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [currentJson, enabled, isReady, storageKey, debounceMs]);

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
      lastKnownRawDraftRef.current = null;
      previousDataJsonRef.current = '';
      pendingDataJsonRef.current = '';
      setSavedDraft(null);
      setHasSavedDraft(false);
      setStatus('idle');
      setLastSavedAt(null);
    } catch (e) {
      console.warn('Erro ao remover rascunho salvo:', e);
    }
  }, [storageKey]);

  const saveImmediately = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    try {
      const now = new Date();
      const currentData = dataRef.current;
      const currentDataJson = JSON.stringify(currentData);
      const wrapper: SavedDraftWrapper<T> = {
        data: currentData,
        timestamp: now.getTime(),
        formattedTime: now.toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })
      };
      const stringified = JSON.stringify(wrapper);
      localStorage.setItem(storageKey, stringified);
      lastKnownRawDraftRef.current = stringified;
      previousDataJsonRef.current = currentDataJson;
      pendingDataJsonRef.current = '';
      setLastSavedAt(now);
      setStatus('saved');
      setSavedDraft(wrapper);
    } catch (err) {
      console.warn('Falha no salvamento imediato do rascunho:', err);
    }
  }, [storageKey]);

  return {
    status,
    lastSavedAt,
    hasSavedDraft,
    savedDraft,
    clearDraft,
    saveImmediately,
    checkForExistingDraft
  };
}
