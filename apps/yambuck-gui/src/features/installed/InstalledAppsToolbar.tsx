import { Button } from "../../components/ui/Button";
import { appText } from "../../i18n/app";
import { SelectField } from "../../components/ui/SelectField";
import type { SelectFieldOption } from "../../components/ui/SelectField";
import { TextField } from "../../components/ui/TextField";
import { actions, field, fieldLabel, root } from "./installedAppsToolbar.css";

type InstalledAppsScopeFilter = "all" | "user" | "system";

const scopeOptions: SelectFieldOption[] = [
  { value: "all", label: appText("installed.scope.all") },
  { value: "user", label: appText("installed.scope.user") },
  { value: "system", label: appText("installed.scope.system") },
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
      <span class={fieldLabel}>{appText("installed.toolbar.search")}</span>
      <TextField
        type="search"
        placeholder={appText("installed.toolbar.searchPlaceholder")}
        value={searchQuery}
        onInput={onSearchQueryChange}
      />
    </label>

    <label class={`${field} installed-toolbar-field`}>
      <span class={fieldLabel}>{appText("installed.toolbar.scope")}</span>
      <SelectField
        value={scopeFilter}
        onValueChange={(nextScope) => onScopeFilterChange(nextScope as InstalledAppsScopeFilter)}
        options={scopeOptions}
        logLabel="installed-scope-filter"
      />
    </label>

    <div class={`${actions} installed-toolbar-actions`}>
      <Button onClick={onRefresh}>{appText("installed.toolbar.refresh")}</Button>
    </div>
  </div>
);

export type { InstalledAppsScopeFilter };
