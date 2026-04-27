import { Button } from "../../../components/ui/Button";
import { ModalShell } from "../../../components/ui/ModalShell";
import { appText } from "../../../i18n/app";
import type { BuilderStep } from "../builderTypes";
import {
  actionBar,
  checklistList,
  checklistModalBody,
  checklistSection,
  checklistSectionHeader,
  checklistStatus,
  manifestModalCard,
  previewTitle,
  sectionBody,
} from "../packageBuilderPage.css";

type BuilderSaveChecklistModalProps = {
  isOpen: boolean;
  steps: BuilderStep[];
  stepIssueMap: Record<BuilderStep, string[]>;
  canContinue: boolean;
  isBusy: boolean;
  intent: "save" | "saveAs" | "build";
  onClose: () => void;
  onContinue: () => void;
};

export const BuilderSaveChecklistModal = ({
  isOpen,
  steps,
  stepIssueMap,
  canContinue,
  isBusy,
  intent,
  onClose,
  onContinue,
}: BuilderSaveChecklistModalProps) => {
  if (!isOpen) {
    return null;
  }

  return (
    <ModalShell
      onClose={onClose}
      cardClass={manifestModalCard}
      closeTitle={appText("builder.checklist.close")}
    >
      <section class={checklistModalBody}>
        <h3 class={previewTitle}>{appText("builder.checklist.title")}</h3>
        <p class={sectionBody}>{appText("builder.checklist.body")}</p>

        {steps.map((step) => {
          const issueCount = stepIssueMap[step].length;
          return (
            <section key={step} class={checklistSection}>
              <div class={checklistSectionHeader}>
                <span>{appText(`builder.steps.${step}`)}</span>
                <span class={checklistStatus}>
                  {issueCount > 0
                    ? appText("builder.stepStatus.attention", { count: issueCount })
                    : appText("builder.stepStatus.ok")}
                </span>
              </div>

              {issueCount > 0 ? (
                <ul class={checklistList}>
                  {stepIssueMap[step].map((issue) => (
                    <li key={`${step}-${issue}`}>{issue}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          );
        })}

        <div class={actionBar}>
          <Button onClick={onClose}>{appText("builder.checklist.close")}</Button>
          <Button
            variant="primary"
            onClick={onContinue}
            disabled={!canContinue || isBusy}
          >
            {intent === "saveAs"
              ? appText("builder.checklist.continueSaveAs")
              : intent === "build"
                ? appText("builder.checklist.continueBuild")
                : appText("builder.checklist.continueSave")}
          </Button>
        </div>
      </section>
    </ModalShell>
  );
};
