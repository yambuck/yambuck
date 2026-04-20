import { Button } from "../../components/ui/Button";
import { SelectField } from "../../components/ui/SelectField";
import type { SelectFieldOption } from "../../components/ui/SelectField";
import { TextField } from "../../components/ui/TextField";
import { actions, field, fieldLabel, root } from "./installedAppsToolbar.css";

type InstalledAppsScopeFilter = "all" | "user" | "system";
type InstalledAppsSort = "installed_desc" | "name_asc";

const scopeOptions: SelectFieldOption[] = [
  { value: "all", label: "All scopes" },
  { value: "user", label: "User only" },
  { value: "system", label: "System only" },
] as const;

const sortOptions: SelectFieldOption[] = [
  { value: "installed_desc", label: "Newest installed" },
  { value: "name_asc", label: "Name A-Z" },
] as const;

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
  <div class={`${root} installed-toolbar`} data-no-drag="true">
    <label class={`${field} installed-toolbar-field installed-toolbar-search`}>
      <span class={fieldLabel}>Search</span>
      <TextField
        type="search"
        placeholder="Search app name"
        value={searchQuery}
        onInput={onSearchQueryChange}
      />
    </label>

    <label class={`${field} installed-toolbar-field`}>
      <span class={fieldLabel}>Scope</span>
      <SelectField
        value={scopeFilter}
        onValueChange={(nextScope) => onScopeFilterChange(nextScope as InstalledAppsScopeFilter)}
        options={scopeOptions}
      />
    </label>

    <label class={`${field} installed-toolbar-field`}>
      <span class={fieldLabel}>Sort</span>
      <SelectField
        value={sortBy}
        onValueChange={(nextSort) => onSortByChange(nextSort as InstalledAppsSort)}
        options={sortOptions}
      />
    </label>

    <div class={`${actions} installed-toolbar-actions`}>
      <Button onClick={onRefresh}>Refresh list</Button>
    </div>
  </div>
);

export type { InstalledAppsScopeFilter, InstalledAppsSort };
