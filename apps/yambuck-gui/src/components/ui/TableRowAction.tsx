import { IconChevronRight } from "@tabler/icons-preact";
import { Tooltip } from "./Tooltip";
import { actionButton } from "./tableRowAction.css";

type TableRowActionProps = {
  label?: string;
};

export const TableRowAction = ({ label = "Open app details" }: TableRowActionProps) => (
  <Tooltip content={label} align="end">
    <span class={actionButton} aria-hidden="true">
      <IconChevronRight size={28} stroke={2.1} />
    </span>
  </Tooltip>
);
