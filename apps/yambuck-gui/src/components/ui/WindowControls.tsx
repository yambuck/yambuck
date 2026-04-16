import { IconSettings } from "@tabler/icons-preact";

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
      onClick={onOpenSettings}
      title="Settings"
      aria-label="Open settings"
    >
      <IconSettings size={14} />
    </button>
    <div class="window-controls" data-no-drag="true">
      <button class="window-btn" onClick={onMinimize} title="Minimize" aria-label="Minimize window">
        -
      </button>
      <button
        class="window-btn"
        onClick={onToggleMaximize}
        title={isMaximized ? "Restore" : "Maximize"}
        aria-label={isMaximized ? "Restore window" : "Maximize window"}
      >
        {isMaximized ? "▢" : "□"}
      </button>
      <button class="window-btn close" onClick={onClose} title="Close" aria-label="Close window">
        ×
      </button>
    </div>
  </div>
);
