import type { InstalledApp } from "../../types/app";

type InstalledAppsPageProps = {
  loadingInstalled: boolean;
  installedApps: InstalledApp[];
  onRefresh: () => void;
  onOpenDetails: (app: InstalledApp) => void;
  onLaunch: (app: InstalledApp) => void;
  onUninstall: (app: InstalledApp) => void;
};

export const InstalledAppsPage = ({
  loadingInstalled,
  installedApps,
  onRefresh,
  onOpenDetails,
  onLaunch,
  onUninstall,
}: InstalledAppsPageProps) => (
  <section class="panel">
    <h1>Installed apps</h1>
    <p class="subtitle">Manage applications installed by Yambuck.</p>
    <div class="actions start">
      <button class="button ghost" onClick={onRefresh}>
        Refresh list
      </button>
    </div>

    {loadingInstalled ? <p class="subtitle">Loading installed apps...</p> : null}

    {!loadingInstalled && installedApps.length === 0 ? (
      <p class="subtitle">No apps installed yet.</p>
    ) : null}

    {installedApps.length > 0 ? (
      <div class="installed-list">
        {installedApps.map((app) => (
          <article class="installed-card" key={app.appId}>
            <div class="installed-card-main">
              {app.iconDataUrl ? (
                <img class="installed-app-icon" src={app.iconDataUrl} alt={`${app.displayName} icon`} />
              ) : (
                <div class="installed-app-icon placeholder" aria-hidden="true">No icon</div>
              )}
              <div class="installed-app-copy">
                <h2>{app.displayName}</h2>
                <p>{app.appId}</p>
              </div>
            </div>
            <div class="installed-app-meta">
              <p>Version {app.version}</p>
              <p>Scope: {app.installScope}</p>
            </div>
            <div class="installed-actions">
              <button class="button ghost" onClick={() => onOpenDetails(app)}>
                Review
              </button>
              <button class="button ghost" onClick={() => onLaunch(app)}>
                Launch
              </button>
              <button class="button ghost" onClick={() => onUninstall(app)}>
                Uninstall
              </button>
            </div>
          </article>
        ))}
      </div>
    ) : null}
  </section>
);
