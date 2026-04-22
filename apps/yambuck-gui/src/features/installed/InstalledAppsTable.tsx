import type { InstalledApp } from "../../types/app";
import { formatInstallScopeLabel } from "../../utils/scope";
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
  sortButton,
  sortIndicator,
  table,
  versionChip,
  wrap,
} from "./installedAppsTable.css";

type InstalledAppsSortField = "name" | "installedAt";
type InstalledAppsSortDirection = "asc" | "desc";

type InstalledAppsTableProps = {
  apps: InstalledApp[];
  onOpenDetails: (app: InstalledApp) => void;
  sortField: InstalledAppsSortField;
  sortDirection: InstalledAppsSortDirection;
  onSortFieldChange: (field: InstalledAppsSortField) => void;
};

export const InstalledAppsTable = ({
  apps,
  onOpenDetails,
  sortField,
  sortDirection,
  onSortFieldChange,
}: InstalledAppsTableProps) => (
  <div class={`${wrap} installed-table-wrap`}>
    <table class={`${table} installed-table`}>
      <thead>
        <tr>
          <th aria-sort={sortField === "name" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}>
            <button type="button" class={sortButton} onClick={() => onSortFieldChange("name")}>
              Application
              <span class={sortIndicator} aria-hidden="true">
                {sortField === "name" ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}
              </span>
            </button>
          </th>
          <th class={`${colVersion} col-version`}>Version</th>
          <th class={`${colScope} col-scope`}>Scope</th>
          <th
            class={`${colInstalled} col-installed`}
            aria-sort={sortField === "installedAt" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
          >
            <button type="button" class={sortButton} onClick={() => onSortFieldChange("installedAt")}>
              Installed
              <span class={sortIndicator} aria-hidden="true">
                {sortField === "installedAt" ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}
              </span>
            </button>
          </th>
        </tr>
      </thead>
      <tbody>
        {apps.map((app) => (
          <tr key={`${app.appId}:${app.installScope}`} onClick={() => onOpenDetails(app)}>
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
            <td class={`${colScope} col-scope`}><span class={`${chip} installed-meta-chip`}>{formatInstallScopeLabel(app.installScope)}</span></td>
            <td class={`${colInstalled} col-installed`} title={formatCanonicalTimestampForDisplay(app.installedAt)}>
              {formatCompactTimestampForTable(app.installedAt)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
