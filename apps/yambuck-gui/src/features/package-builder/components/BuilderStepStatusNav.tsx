import { appText } from "../../../i18n/app";
import type { BuilderStep } from "../builderTypes";
import {
  stepButton,
  stepButtonActive,
  stepButtonContent,
  stepButtonLabel,
  stepNumber,
  stepList,
  stepStatusAttention,
  stepStatusBadge,
  stepStatusOk,
} from "../packageBuilderPage.css";

type BuilderStepStatusNavProps = {
  steps: BuilderStep[];
  currentStep: BuilderStep;
  onSelectStep: (step: BuilderStep) => void;
  stepIssueMap: Record<BuilderStep, string[]>;
  ariaLabel: string;
};

export const BuilderStepStatusNav = ({
  steps,
  currentStep,
  onSelectStep,
  stepIssueMap,
  ariaLabel,
}: BuilderStepStatusNavProps) => (
  <nav class={stepList} aria-label={ariaLabel}>
    {steps.map((step, index) => {
      const issueCount = stepIssueMap[step].length;
      const hasIssues = issueCount > 0;
      const statusClass = hasIssues ? stepStatusAttention : stepStatusOk;
      const statusLabel = hasIssues
        ? appText("builder.stepStatus.attention", { count: issueCount })
        : appText("builder.stepStatus.ok");
      return (
        <button
          type="button"
          key={step}
          class={`${stepButton}${step === currentStep ? ` ${stepButtonActive}` : ""}`}
          onClick={() => onSelectStep(step)}
        >
          <span class={stepButtonContent}>
            <span class={stepButtonLabel}>
              <span class={stepNumber}>{index + 1}</span>
              <span>{appText(`builder.steps.${step}`)}</span>
            </span>
            <span class={`${stepStatusBadge} ${statusClass}`}>{statusLabel}</span>
          </span>
        </button>
      );
    })}
  </nav>
);
