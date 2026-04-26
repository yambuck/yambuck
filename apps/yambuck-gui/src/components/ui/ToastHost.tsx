import { FeedbackToneIcon } from "./FeedbackToneIcon";

export type ToastTone = "info" | "success" | "warning" | "error";

export type ToastItem = {
  id: number;
  tone: ToastTone;
  message: string;
};

type ToastHostProps = {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
  onPause: (id: number) => void;
  onResume: (id: number) => void;
  onCopyMessage: (message: string) => void;
};

export const ToastHost = ({ toasts, onDismiss, onPause, onResume, onCopyMessage }: ToastHostProps) => (
  <div class="toast-host" data-no-drag="true">
    {toasts.map((toast) => (
      <div
        key={toast.id}
        class={`toast ${toast.tone}`}
        onMouseEnter={() => onPause(toast.id)}
        onMouseLeave={() => onResume(toast.id)}
        onClick={() => onCopyMessage(toast.message)}
      >
        <span class="toast-icon" aria-hidden="true"><FeedbackToneIcon tone={toast.tone} size={16} /></span>
        <span class="toast-copy">{toast.message}</span>
        <button
          class="toast-close"
          onClick={(event) => {
            event.stopPropagation();
            onDismiss(toast.id);
          }}
          aria-label="Dismiss toast"
        >
          ×
        </button>
      </div>
    ))}
  </div>
);
