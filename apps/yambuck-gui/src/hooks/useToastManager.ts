import { useEffect, useRef, useState } from "preact/hooks";
import type { ToastItem, ToastTone } from "../components/ui/ToastHost";

export const useToastManager = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timeoutIdsRef = useRef<Map<number, number>>(new Map());
  const remainingMsRef = useRef<Map<number, number>>(new Map());
  const startedAtRef = useRef<Map<number, number>>(new Map());

  const clearToastTimer = (id: number) => {
    const timeoutId = timeoutIdsRef.current.get(id);
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
      timeoutIdsRef.current.delete(id);
    }
    startedAtRef.current.delete(id);
  };

  const dismissToast = (id: number) => {
    clearToastTimer(id);
    remainingMsRef.current.delete(id);
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const scheduleDismiss = (id: number, durationMs: number) => {
    if (durationMs <= 0) {
      dismissToast(id);
      return;
    }

    clearToastTimer(id);
    remainingMsRef.current.set(id, durationMs);
    startedAtRef.current.set(id, Date.now());

    const timeoutId = window.setTimeout(() => {
      dismissToast(id);
    }, durationMs);

    timeoutIdsRef.current.set(id, timeoutId);
  };

  useEffect(() => () => {
    timeoutIdsRef.current.forEach((timeoutId) => {
      window.clearTimeout(timeoutId);
    });
    timeoutIdsRef.current.clear();
    remainingMsRef.current.clear();
    startedAtRef.current.clear();
  }, []);

  const pushToast = (tone: ToastTone, toastMessage: string, durationMs = 3600) => {
    const id = Date.now() + Math.floor(Math.random() * 10000);
    setToasts((prev) => {
      const kept = prev.slice(-2);
      const dropped = prev.slice(0, -2);
      dropped.forEach((toast) => {
        clearToastTimer(toast.id);
        remainingMsRef.current.delete(toast.id);
      });
      return [...kept, { id, tone, message: toastMessage }];
    });
    scheduleDismiss(id, durationMs);
  };

  const pauseToast = (id: number) => {
    const startedAt = startedAtRef.current.get(id);
    const remainingMs = remainingMsRef.current.get(id);
    if (startedAt === undefined || remainingMs === undefined) {
      return;
    }

    const elapsed = Date.now() - startedAt;
    const nextRemaining = Math.max(0, remainingMs - elapsed);
    clearToastTimer(id);
    remainingMsRef.current.set(id, nextRemaining);
  };

  const resumeToast = (id: number) => {
    if (timeoutIdsRef.current.has(id)) {
      return;
    }

    const remainingMs = remainingMsRef.current.get(id);
    if (remainingMs === undefined) {
      return;
    }

    scheduleDismiss(id, remainingMs);
  };

  return {
    toasts,
    pushToast,
    dismissToast,
    pauseToast,
    resumeToast,
  };
};
