import { IconMinus, IconSettings, IconSquare, IconX } from "@tabler/icons-preact";
import { logUiAction } from "../../lib/ui-log";

type WindowControlsProps = {
  settingsActive: boolean;
  isMaximized: boolean;
  onOpenSettings: () => void;
  onMinimize: () => void;
  onToggleMaximize: () => void;
  onClose: () => void;
};

export const WindowControls = ({
  settingsActive,
  isMaximized,
  onOpenSettings,
  onMinimize,
  onToggleMaximize,
  onClose,
}: WindowControlsProps) => (
  <div class="topbar-right" data-no-drag="true">
    <button
      class={`window-btn icon ${settingsActive ? "active" : ""}`}
      onClick={() => {
        logUiAction("window-open-settings");
        onOpenSettings();
      }}
      title="Settings"
      aria-label="Open settings"
    >
      <IconSettings size={14} />
    </button>
    <div class="window-controls" data-no-drag="true">
      <button
        class="window-btn"
        onClick={() => {
          logUiAction("window-minimize");
          onMinimize();
        }}
        title="Minimize"
        aria-label="Minimize window"
      >
        <IconMinus size={14} stroke={2.2} />
      </button>
      <button
        class="window-btn"
        onClick={() => {
          logUiAction("window-toggle-maximize", { isMaximized });
          onToggleMaximize();
        }}
        title={isMaximized ? "Restore" : "Maximize"}
        aria-label={isMaximized ? "Restore window" : "Maximize window"}
      >
        <IconSquare size={12} stroke={2.2} />
      </button>
      <button
        class="window-btn close"
        onClick={() => {
          logUiAction("window-close");
          onClose();
        }}
        title="Close"
        aria-label="Close window"
      >
        <IconX size={14} stroke={2.2} />
      </button>
    </div>
  </div>
);
