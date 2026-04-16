import { getCurrentWindow } from "@tauri-apps/api/window";
import { getVersion } from "@tauri-apps/api/app";

import mockIcon from "./assets/debug/mock-icon.svg";

const shouldSkipDrag = (event: MouseEvent) => {
  const target = event.target;
  return target instanceof Element && target.closest("button, a, input, textarea, select, [data-no-drag='true']");
};

const startDragging = async (event: MouseEvent) => {
  if (event.buttons !== 1 || shouldSkipDrag(event)) {
    return;
  }

  try {
    await getCurrentWindow().startDragging();
  } catch {
    // no-op when running outside Tauri window context
  }
};

const setMaximizeLabel = (button: HTMLButtonElement, isMaximized: boolean) => {
  button.textContent = isMaximized ? "▢" : "□";
  button.title = isMaximized ? "Restore" : "Maximize";
};

const handleMinimize = async () => {
  try {
    await getCurrentWindow().minimize();
  } catch {
    // no-op when running outside Tauri window context
  }
};

const handleToggleMaximize = async (button: HTMLButtonElement) => {
  try {
    const win = getCurrentWindow();
    const isMaximized = await win.isMaximized();
    if (isMaximized) {
      await win.unmaximize();
      setMaximizeLabel(button, false);
      return;
    }

    await win.maximize();
    setMaximizeLabel(button, true);
  } catch {
    // no-op when running outside Tauri window context
  }
};

const handleClose = async () => {
  try {
    await getCurrentWindow().close();
  } catch {
    // no-op when running outside Tauri window context
  }
};

const syncAppVersion = async () => {
  const versionEl = document.querySelector<HTMLElement>("#app-version");
  if (!versionEl) {
    return;
  }

  try {
    const version = await getVersion();
    versionEl.textContent = `Version ${version}`;
  } catch {
    versionEl.textContent = "Version unavailable";
  }
};

window.addEventListener("DOMContentLoaded", () => {
  const appRoot = document.querySelector<HTMLElement>("#app");
  if (!appRoot) {
    return;
  }

  appRoot.innerHTML = `
    <div class="app-shell">
      <header class="topbar" id="topbar">
        <div class="topbar-left">
          <img class="topbar-icon" src="${mockIcon}" alt="Example app icon" />
          <span class="topbar-name">Example App</span>
        </div>
        <p class="topbar-title">Yambuck Example App</p>
        <div class="topbar-right" data-no-drag="true">
          <div class="window-controls">
            <button id="minimize-button" class="window-btn" type="button" title="Minimize">-</button>
            <button id="maximize-button" class="window-btn" type="button" title="Maximize">□</button>
            <button id="close-button" class="window-btn close" type="button" title="Close">×</button>
          </div>
        </div>
      </header>

      <main class="content-scroll">
        <section class="panel">
          <div class="panel-header">
            <img class="app-icon" src="${mockIcon}" alt="Example app icon" />
            <div>
              <h1>Hello, world.</h1>
              <p class="subtitle">Welcome to the Yambuck Example App - a small desktop app used for demonstration and testing.</p>
            </div>
          </div>

          <section class="install-note">
            <h2>Installation check</h2>
            <p>If you can see this window, you have successfully installed and launched the Yambuck Example App.</p>
            <ul class="checklist">
              <li>Welcome to the Yambuck Example App.</li>
              <li>This is a simple Hello World desktop application.</li>
              <li>If you can see this window, the app has launched successfully.</li>
            </ul>
          </section>

          <p id="app-version" class="version-label">Version</p>
        </section>
      </main>
    </div>
  `;

  const topbar = document.querySelector<HTMLElement>("#topbar");
  topbar?.addEventListener("mousedown", (event) => {
    void startDragging(event);
  });

  const maximizeButton = document.querySelector<HTMLButtonElement>("#maximize-button");
  if (maximizeButton) {
    void getCurrentWindow().isMaximized().then((isMaximized) => {
      setMaximizeLabel(maximizeButton, isMaximized);
    }).catch(() => {
      // no-op when running outside Tauri window context
    });

    maximizeButton.addEventListener("click", () => {
      void handleToggleMaximize(maximizeButton);
    });
  }

  document.querySelector<HTMLButtonElement>("#minimize-button")?.addEventListener("click", () => {
    void handleMinimize();
  });

  document.querySelector<HTMLButtonElement>("#close-button")?.addEventListener("click", () => {
    void handleClose();
  });

  void syncAppVersion();
});
