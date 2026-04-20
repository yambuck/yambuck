import { useMemo, useState } from "preact/hooks";
import { Panel } from "../../components/ui/Panel";
import { subtitle } from "../shared/packageUi.css";
import { InstalledAppsTable } from "./InstalledAppsTable";
import { InstalledAppsToolbar } from "./InstalledAppsToolbar";
import type { InstalledApp } from "../../types/app";

type InstalledAppsSortField = "name" | "installedAt";
type InstalledAppsSortDirection = "asc" | "desc";

type InstalledAppsPageProps = {
  loadingInstalled: boolean;
  installedApps: InstalledApp[];
  onRefresh: () => void;
  onOpenDetails: (app: InstalledApp) => void;
};

export const InstalledAppsPage = ({
  loadingInstalled,
  installedApps,
  onRefresh,
  onOpenDetails,
}: InstalledAppsPageProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [scopeFilter, setScopeFilter] = useState<"all" | "user" | "system">("all");
  const [sortField, setSortField] = useState<InstalledAppsSortField>("installedAt");
  const [sortDirection, setSortDirection] = useState<InstalledAppsSortDirection>("desc");

  const handleSortChange = (field: InstalledAppsSortField) => {
    if (sortField === field) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortField(field);
    setSortDirection(field === "name" ? "asc" : "desc");
  };

  const visibleApps = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const filtered = installedApps.filter((app) => {
      if (scopeFilter !== "all" && app.installScope !== scopeFilter) {
        return false;
      }

      if (!query) {
        return true;
      }

      return app.displayName.toLowerCase().includes(query) || app.appId.toLowerCase().includes(query);
    });

    const sorted = [...filtered];
    if (sortField === "name") {
      sorted.sort((left, right) => {
        const comparison = left.displayName.localeCompare(right.displayName);
        if (comparison !== 0) {
          return sortDirection === "asc" ? comparison : -comparison;
        }
        return left.appId.localeCompare(right.appId);
      });
      return sorted;
    }

    sorted.sort((left, right) => {
      const leftTime = Date.parse(left.installedAt);
      const rightTime = Date.parse(right.installedAt);
      if (Number.isNaN(leftTime) || Number.isNaN(rightTime)) {
        return left.displayName.localeCompare(right.displayName);
      }
      return sortDirection === "asc" ? leftTime - rightTime : rightTime - leftTime;
    });
    return sorted;
  }, [installedApps, scopeFilter, searchQuery, sortField, sortDirection]);

  return (
    <Panel>
      <h1>Installed apps</h1>
      <p class={`subtitle ${subtitle}`}>Manage applications installed by Yambuck.</p>

      <InstalledAppsToolbar
        searchQuery={searchQuery}
        scopeFilter={scopeFilter}
        onSearchQueryChange={setSearchQuery}
        onScopeFilterChange={setScopeFilter}
        onRefresh={onRefresh}
      />

      {loadingInstalled ? <p class={`subtitle ${subtitle}`}>Loading installed apps...</p> : null}

      {!loadingInstalled && installedApps.length === 0 ? <p class={`subtitle ${subtitle}`}>No apps installed yet.</p> : null}

      {!loadingInstalled && installedApps.length > 0 && visibleApps.length === 0 ? (
        <p class={`subtitle ${subtitle}`}>No installed apps match your current search/filter.</p>
      ) : null}

      {visibleApps.length > 0 ? (
        <InstalledAppsTable
          apps={visibleApps}
          onOpenDetails={onOpenDetails}
          sortField={sortField}
          sortDirection={sortDirection}
          onSortFieldChange={handleSortChange}
        />
      ) : null}
    </Panel>
  );
};
