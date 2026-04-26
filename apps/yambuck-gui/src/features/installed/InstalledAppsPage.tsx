import { useMemo, useState } from "preact/hooks";
import { Panel } from "../../components/ui/Panel";
import { appText } from "../../i18n/app";
import { logUiAction } from "../../lib/ui-log";
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
    logUiAction("installed-sort-change", {
      field,
      currentField: sortField,
      currentDirection: sortDirection,
    });
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
      <h1>{appText("installed.title")}</h1>
      <p class={`subtitle ${subtitle}`}>{appText("installed.subtitle")}</p>

      <InstalledAppsToolbar
        searchQuery={searchQuery}
        scopeFilter={scopeFilter}
        onSearchQueryChange={(value) => {
          logUiAction("installed-search-change", { length: value.trim().length });
          setSearchQuery(value);
        }}
        onScopeFilterChange={(value) => {
          logUiAction("installed-scope-filter-change", { scope: value });
          setScopeFilter(value);
        }}
        onRefresh={onRefresh}
      />

      {loadingInstalled ? <p class={`subtitle ${subtitle}`}>{appText("installed.loading")}</p> : null}

      {!loadingInstalled && installedApps.length === 0 ? <p class={`subtitle ${subtitle}`}>{appText("installed.empty")}</p> : null}

      {!loadingInstalled && installedApps.length > 0 && visibleApps.length === 0 ? (
        <p class={`subtitle ${subtitle}`}>{appText("installed.noMatches")}</p>
      ) : null}

      {visibleApps.length > 0 ? (
        <InstalledAppsTable
          apps={visibleApps}
          onOpenDetails={(app) => {
            logUiAction("installed-open-review", { appId: app.appId, scope: app.installScope });
            onOpenDetails(app);
          }}
          sortField={sortField}
          sortDirection={sortDirection}
          onSortFieldChange={handleSortChange}
        />
      ) : null}
    </Panel>
  );
};
