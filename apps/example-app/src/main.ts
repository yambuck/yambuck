import { invoke } from "@tauri-apps/api/core";

import mockIcon from "./assets/debug/mock-icon.svg";
import mockShotA from "./assets/debug/mock-shot-a.svg";
import mockShotB from "./assets/debug/mock-shot-b.svg";
import mockShotC from "./assets/debug/mock-shot-c.svg";
import mockShotD from "./assets/debug/mock-shot-d.svg";
import mockShotE from "./assets/debug/mock-shot-e.svg";
import mockShotF from "./assets/debug/mock-shot-f.svg";

const screenshots = [
  mockShotA,
  mockShotB,
  mockShotC,
  mockShotD,
  mockShotE,
  mockShotF,
];

async function refreshLaunchStatus() {
  const statusEl = document.querySelector<HTMLElement>("#launch-status");
  if (!statusEl) {
    return;
  }

  statusEl.textContent = "Checking launch status...";

  try {
    const message = await invoke<string>("get_launch_status");
    statusEl.textContent = message;
    statusEl.dataset.tone = "success";
  } catch {
    statusEl.textContent = "Unable to read launch status from backend.";
    statusEl.dataset.tone = "error";
  }
}

window.addEventListener("DOMContentLoaded", () => {
  const appRoot = document.querySelector<HTMLElement>("#app");
  if (!appRoot) {
    return;
  }

  const screenshotTiles = screenshots
    .map(
      (source, index) =>
        `<li class="screenshot-tile"><img src="${source}" alt="Example screenshot ${index + 1}" /></li>`,
    )
    .join("");

  appRoot.innerHTML = `
    <div class="app-shell">
      <header class="topbar" data-tauri-drag-region>
        <div class="topbar-left">
          <img class="topbar-icon" src="${mockIcon}" alt="Example app icon" />
          <span class="topbar-name">Example App</span>
        </div>
        <p class="topbar-title">Yambuck Example</p>
        <div class="topbar-right">
          <span class="badge">Launch Test Target</span>
        </div>
      </header>

      <main class="content-scroll">
        <section class="panel">
          <div class="panel-header">
            <img class="app-icon" src="${mockIcon}" alt="Example app icon" />
            <div>
              <h1>Hello, world.</h1>
              <p class="subtitle">This is a minimal Tauri v2 app used for Yambuck packaging, install, and bundle verification.</p>
            </div>
          </div>

          <div class="status-row">
            <p id="launch-status" class="status-chip" data-tone="info">Ready to check launch status.</p>
            <button id="status-button" class="button" type="button">Check launch status</button>
          </div>

          <section class="meta-section">
            <h2>Included debug preview assets</h2>
            <p>Using the same mock icon and six screenshots from the Yambuck debug preview page.</p>
            <ul class="screenshot-strip">${screenshotTiles}</ul>
          </section>
        </section>
      </main>
    </div>
  `;

  document
    .querySelector<HTMLButtonElement>("#status-button")
    ?.addEventListener("click", () => {
      void refreshLaunchStatus();
    });

  void refreshLaunchStatus();
});
