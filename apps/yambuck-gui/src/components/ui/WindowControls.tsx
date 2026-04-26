import { IconMinus, IconSettings, IconSquare, IconX } from "@tabler/icons-preact";
import { logUiAction } from "../../lib/ui-log";
import { appText } from "../../i18n/app";

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
      title={appText("window.settingsTitle")}
      aria-label={appText("window.settingsAria")}
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
        title={appText("window.minimizeTitle")}
        aria-label={appText("window.minimizeAria")}
      >
        <IconMinus size={14} stroke={2.2} />
      </button>
      <button
        class="window-btn"
        onClick={() => {
          logUiAction("window-toggle-maximize", { isMaximized });
          onToggleMaximize();
        }}
        title={isMaximized ? appText("window.restoreTitle") : appText("window.maximizeTitle")}
        aria-label={isMaximized ? appText("window.restoreAria") : appText("window.maximizeAria")}
      >
        <IconSquare size={12} stroke={2.2} />
      </button>
      <button
        class="window-btn close"
        onClick={() => {
          logUiAction("window-close");
          onClose();
        }}
        title={appText("window.closeTitle")}
        aria-label={appText("window.closeAria")}
      >
        <IconX size={14} stroke={2.2} />
      </button>
    </div>
  </div>
);
