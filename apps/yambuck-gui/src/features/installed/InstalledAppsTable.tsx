import type { InstalledApp } from "../../types/app";
import { formatCanonicalTimestampForDisplay } from "../../utils/time";

type InstalledAppsTableProps = {
  apps: InstalledApp[];
  onOpenDetails: (app: InstalledApp) => void;
  onLaunch: (app: InstalledApp) => void;
  onUninstall: (app: InstalledApp) => void;
};

export const InstalledAppsTable = ({ apps, onOpenDetails, onLaunch, onUninstall }: InstalledAppsTableProps) => (
  <div class="installed-table-wrap">
    <table class="installed-table">
      <thead>
        <tr>
          <th>Status</th>
          <th>Application</th>
          <th>Version</th>
          <th class="col-scope">Scope</th>
          <th class="col-installed">Installed</th>
          <th class="col-location">Install location</th>
          <th class="col-actions">Actions</th>
        </tr>
      </thead>
      <tbody>
        {apps.map((app) => (
          <tr key={app.appId}>
            <td>
              <span class={`installed-meta-chip status-${app.installStatus}`}>
                {app.installStatus === "installed" ? "Installed" : "Missing payload"}
              </span>
            </td>
            <td>
              <div class="installed-table-app">
                {app.iconDataUrl ? (
                  <img class="installed-table-icon" src={app.iconDataUrl} alt={`${app.displayName} icon`} />
                ) : (
                  <div class="installed-table-icon placeholder" aria-hidden="true">No icon</div>
                )}
                <div class="installed-table-app-copy">
                  <strong>{app.displayName}</strong>
                  <span class="installed-table-app-id">{app.appId}</span>
                </div>
              </div>
            </td>
            <td><span class="installed-meta-chip">{app.version}</span></td>
            <td class="col-scope"><span class="installed-meta-chip">{app.installScope}</span></td>
            <td class="col-installed">{formatCanonicalTimestampForDisplay(app.installedAt)}</td>
            <td class="col-location"><code class="install-path-code">{app.destinationPath}</code></td>
            <td class="col-actions">
              <div class="installed-table-actions">
                <button class="button ghost" onClick={() => onOpenDetails(app)}>Review</button>
                <button class="button ghost" onClick={() => onLaunch(app)}>Launch</button>
                <button class="button ghost" onClick={() => onUninstall(app)}>Uninstall</button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
