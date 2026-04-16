import type { ComponentChildren } from "preact";

type MetaFieldProps = {
  label: string;
  tooltip: string;
  value: ComponentChildren;
};

export const MetaField = ({ label, tooltip, value }: MetaFieldProps) => (
  <div>
    <dt>
      <span class="meta-term" tabIndex={0}>
        {label}
        <span class="meta-help" aria-hidden="true">?</span>
        <span class="meta-tooltip" role="tooltip">{tooltip}</span>
      </span>
    </dt>
    <dd>{value}</dd>
  </div>
);
