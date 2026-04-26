import { IconAlertCircle, IconAlertTriangle, IconCircleCheck, IconInfoCircle } from "@tabler/icons-preact";

export type FeedbackTone = "info" | "success" | "warning" | "error";

type FeedbackToneIconProps = {
  tone: FeedbackTone;
  size?: number;
};

export const FeedbackToneIcon = ({ tone, size = 16 }: FeedbackToneIconProps) => {
  if (tone === "success") {
    return <IconCircleCheck size={size} stroke={2} />;
  }
  if (tone === "warning") {
    return <IconAlertTriangle size={size} stroke={2} />;
  }
  if (tone === "error") {
    return <IconAlertCircle size={size} stroke={2} />;
  }
  return <IconInfoCircle size={size} stroke={2} />;
};
