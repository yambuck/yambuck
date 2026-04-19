import type { ComponentChildren } from "preact";
import { copyPlainText } from "../../utils/clipboard";

type MetaFieldProps = {
  label: string;
  tooltip: string;
  value: ComponentChildren;
  copyValue?: string;
  copyEnabled?: boolean;
};

export const MetaField = ({
  label,
  tooltip,
  value,
  copyValue,
  copyEnabled = true,
}: MetaFieldProps) => {
  const fallbackValue = typeof value === "string" || typeof value === "number" ? String(value) : "";
  const resolvedCopyValue = copyValue ?? fallbackValue;
  const isCopyable = copyEnabled && resolvedCopyValue.trim().length > 0;

  const handleCopy = async (event: MouseEvent) => {
    if (!isCopyable) {
      return;
    }

    const target = event.target as HTMLElement | null;
    if (!target) {
      return;
    }

    if (target.closest("a, button, input, select, textarea, [data-no-copy='true']")) {
      return;
    }

    try {
      await copyPlainText(resolvedCopyValue);
    } catch {
      // copy is a hidden convenience feature; silently ignore failures
    }
  };

  return (
    <div class="meta-field" data-copyable={isCopyable ? "true" : "false"} onClick={(event) => void handleCopy(event)}>
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
};
