import { Button } from "../../components/ui/Button";
import { SelectField } from "../../components/ui/SelectField";
import { TextField } from "../../components/ui/TextField";

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
      <TextField
        type="search"
        placeholder="Search app name"
        value={searchQuery}
        onInput={onSearchQueryChange}
      />
    </label>

    <label class="installed-toolbar-field">
      <span>Scope</span>
      <SelectField value={scopeFilter} onChange={(event) => onScopeFilterChange((event.currentTarget as HTMLSelectElement).value as InstalledAppsScopeFilter)}>
        <option value="all">All scopes</option>
        <option value="user">User only</option>
        <option value="system">System only</option>
      </SelectField>
    </label>

    <label class="installed-toolbar-field">
      <span>Sort</span>
      <SelectField value={sortBy} onChange={(event) => onSortByChange((event.currentTarget as HTMLSelectElement).value as InstalledAppsSort)}>
        <option value="installed_desc">Newest installed</option>
        <option value="name_asc">Name A-Z</option>
      </SelectField>
    </label>

    <div class="installed-toolbar-actions">
      <Button onClick={onRefresh}>Refresh list</Button>
    </div>
  </div>
);

export type { InstalledAppsScopeFilter, InstalledAppsSort };
