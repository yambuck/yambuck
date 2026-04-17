import { useState } from "preact/hooks";
import type { ToastItem, ToastTone } from "../components/ui/ToastHost";

export const useToastManager = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const pushToast = (tone: ToastTone, toastMessage: string, durationMs = 3600) => {
    const id = Date.now() + Math.floor(Math.random() * 10000);
    setToasts((prev) => [...prev.slice(-2), { id, tone, message: toastMessage }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, durationMs);
  };

  const dismissToast = (id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return {
    toasts,
    pushToast,
    dismissToast,
  };
};
