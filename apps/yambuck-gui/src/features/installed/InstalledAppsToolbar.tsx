import { Button } from "../../components/ui/Button";
import { SelectField } from "../../components/ui/SelectField";
import type { SelectFieldOption } from "../../components/ui/SelectField";
import { TextField } from "../../components/ui/TextField";
import { actions, field, fieldLabel, root } from "./installedAppsToolbar.css";

type InstalledAppsScopeFilter = "all" | "user" | "system";

const scopeOptions: SelectFieldOption[] = [
  { value: "all", label: "All scopes" },
  { value: "user", label: "My user" },
  { value: "system", label: "System wide" },
] as const;

type InstalledAppsToolbarProps = {
  searchQuery: string;
  scopeFilter: InstalledAppsScopeFilter;
  onSearchQueryChange: (value: string) => void;
  onScopeFilterChange: (value: InstalledAppsScopeFilter) => void;
  onRefresh: () => void;
};

export const InstalledAppsToolbar = ({
  searchQuery,
  scopeFilter,
  onSearchQueryChange,
  onScopeFilterChange,
  onRefresh,
}: InstalledAppsToolbarProps) => (
  <div class={`${root} installed-toolbar`} data-no-drag="true">
    <label class={`${field} installed-toolbar-field installed-toolbar-search`}>
      <span class={fieldLabel}>Search</span>
      <TextField
        type="search"
        placeholder="Search app name or ID"
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
        logLabel="installed-scope-filter"
      />
    </label>

    <div class={`${actions} installed-toolbar-actions`}>
      <Button onClick={onRefresh}>Refresh list</Button>
    </div>
  </div>
);

export type { InstalledAppsScopeFilter };
