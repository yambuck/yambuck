import type { InstalledApp } from "../../types/app";
import { formatCanonicalTimestampForDisplay, formatCompactTimestampForTable } from "../../utils/time";
import {
  appCell,
  appCopy,
  appId,
  appName,
  chip,
  colInstalled,
  colScope,
  colVersion,
  icon,
  iconPlaceholder,
  table,
  versionChip,
  wrap,
} from "./installedAppsTable.css";

type InstalledAppsTableProps = {
  apps: InstalledApp[];
  onOpenDetails: (app: InstalledApp) => void;
};

export const InstalledAppsTable = ({ apps, onOpenDetails }: InstalledAppsTableProps) => (
  <div class={`${wrap} installed-table-wrap`}>
    <table class={`${table} installed-table`}>
      <thead>
        <tr>
          <th>Application</th>
          <th class={`${colVersion} col-version`}>Version</th>
          <th class={`${colScope} col-scope`}>Scope</th>
          <th class={`${colInstalled} col-installed`}>Installed</th>
        </tr>
      </thead>
      <tbody>
        {apps.map((app) => (
          <tr key={app.appId} onClick={() => onOpenDetails(app)}>
            <td>
              <div class={`${appCell} installed-table-app`}>
                {app.iconDataUrl ? (
                  <img class={`${icon} installed-table-icon`} src={app.iconDataUrl} alt={`${app.displayName} icon`} />
                ) : (
                  <div class={`${icon} ${iconPlaceholder} installed-table-icon placeholder`} aria-hidden="true">No icon</div>
                )}
                <div class={`${appCopy} installed-table-app-copy`}>
                  <strong class={appName} title={app.displayName}>{app.displayName}</strong>
                  <span class={`${appId} installed-table-app-id`} title={app.appId}>{app.appId}</span>
                </div>
              </div>
            </td>
            <td class={`${colVersion} col-version`}><span class={`${chip} ${versionChip} installed-meta-chip version-chip`} title={app.version}>{app.version}</span></td>
            <td class={`${colScope} col-scope`}><span class={`${chip} installed-meta-chip`}>{app.installScope}</span></td>
            <td class={`${colInstalled} col-installed`} title={formatCanonicalTimestampForDisplay(app.installedAt)}>
              {formatCompactTimestampForTable(app.installedAt)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
