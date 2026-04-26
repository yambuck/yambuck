import { IconChevronRight } from "@tabler/icons-preact";
import { actionButton } from "./tableRowAction.css";

type TableRowActionProps = {
  label?: string;
};

export const TableRowAction = ({ label = "Open app details" }: TableRowActionProps) => (
  <span class={actionButton} aria-hidden="true" title={label}>
    <IconChevronRight size={28} stroke={2.1} />
  </span>
);
