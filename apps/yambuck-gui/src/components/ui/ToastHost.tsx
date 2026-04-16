export type ToastTone = "info" | "success" | "warning" | "error";

export type ToastItem = {
  id: number;
  tone: ToastTone;
  message: string;
};

type ToastHostProps = {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
};

export const ToastHost = ({ toasts, onDismiss }: ToastHostProps) => (
  <div class="toast-host" data-no-drag="true">
    {toasts.map((toast) => (
      <div key={toast.id} class={`toast ${toast.tone}`}>
        <span>{toast.message}</span>
        <button class="toast-close" onClick={() => onDismiss(toast.id)} aria-label="Dismiss toast">
          ×
        </button>
      </div>
    ))}
  </div>
);
