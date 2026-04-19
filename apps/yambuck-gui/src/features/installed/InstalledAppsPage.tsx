import { useMemo, useState } from "preact/hooks";
import { InstalledAppsTable } from "./InstalledAppsTable";
import { InstalledAppsToolbar } from "./InstalledAppsToolbar";
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
}: InstalledAppsPageProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [scopeFilter, setScopeFilter] = useState<"all" | "user" | "system">("all");
  const [sortBy, setSortBy] = useState<"installed_desc" | "name_asc">("installed_desc");

  const visibleApps = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const filtered = installedApps.filter((app) => {
      if (scopeFilter !== "all" && app.installScope !== scopeFilter) {
        return false;
      }

      if (!query) {
        return true;
      }

      return app.displayName.toLowerCase().includes(query);
    });

    const sorted = [...filtered];
    if (sortBy === "name_asc") {
      sorted.sort((left, right) => left.displayName.localeCompare(right.displayName));
      return sorted;
    }

    sorted.sort((left, right) => {
      const leftTime = Date.parse(left.installedAt);
      const rightTime = Date.parse(right.installedAt);
      if (Number.isNaN(leftTime) || Number.isNaN(rightTime)) {
        return right.displayName.localeCompare(left.displayName);
      }
      return rightTime - leftTime;
    });
    return sorted;
  }, [installedApps, scopeFilter, searchQuery, sortBy]);

  return (
    <section class="panel installed-page-panel">
      <h1>Installed apps</h1>
      <p class="subtitle">Manage applications installed by Yambuck.</p>

      <InstalledAppsToolbar
        searchQuery={searchQuery}
        scopeFilter={scopeFilter}
        sortBy={sortBy}
        onSearchQueryChange={setSearchQuery}
        onScopeFilterChange={setScopeFilter}
        onSortByChange={setSortBy}
        onRefresh={onRefresh}
      />

      {loadingInstalled ? <p class="subtitle">Loading installed apps...</p> : null}

      {!loadingInstalled && installedApps.length === 0 ? <p class="subtitle">No apps installed yet.</p> : null}

      {!loadingInstalled && installedApps.length > 0 && visibleApps.length === 0 ? (
        <p class="subtitle">No installed apps match your current search/filter.</p>
      ) : null}

      {visibleApps.length > 0 ? (
        <InstalledAppsTable
          apps={visibleApps}
          onOpenDetails={onOpenDetails}
          onLaunch={onLaunch}
          onUninstall={onUninstall}
        />
      ) : null}
    </section>
  );
};
