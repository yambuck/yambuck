type InstalledAppsScopeFilter = "all" | "user" | "system";
type InstalledAppsSort = "installed_desc" | "name_asc";

type InstalledAppsToolbarProps = {
  searchQuery: string;
  scopeFilter: InstalledAppsScopeFilter;
  sortBy: InstalledAppsSort;
  onSearchQueryChange: (value: string) => void;
  onScopeFilterChange: (value: InstalledAppsScopeFilter) => void;
  onSortByChange: (value: InstalledAppsSort) => void;
  onRefresh: () => void;
};

export const InstalledAppsToolbar = ({
  searchQuery,
  scopeFilter,
  sortBy,
  onSearchQueryChange,
  onScopeFilterChange,
  onSortByChange,
  onRefresh,
}: InstalledAppsToolbarProps) => (
  <div class="installed-toolbar" data-no-drag="true">
    <label class="installed-toolbar-field installed-toolbar-search">
      <span>Search</span>
      <input
        type="search"
        placeholder="Search app name"
        value={searchQuery}
        onInput={(event) => onSearchQueryChange((event.currentTarget as HTMLInputElement).value)}
      />
    </label>

    <label class="installed-toolbar-field">
      <span>Scope</span>
      <select value={scopeFilter} onChange={(event) => onScopeFilterChange((event.currentTarget as HTMLSelectElement).value as InstalledAppsScopeFilter)}>
        <option value="all">All scopes</option>
        <option value="user">User only</option>
        <option value="system">System only</option>
      </select>
    </label>

    <label class="installed-toolbar-field">
      <span>Sort</span>
      <select value={sortBy} onChange={(event) => onSortByChange((event.currentTarget as HTMLSelectElement).value as InstalledAppsSort)}>
        <option value="installed_desc">Newest installed</option>
        <option value="name_asc">Name A-Z</option>
      </select>
    </label>

    <div class="installed-toolbar-actions">
      <button class="button ghost" onClick={onRefresh}>Refresh list</button>
    </div>
  </div>
);

export type { InstalledAppsScopeFilter, InstalledAppsSort };
