import { Fragment } from "preact";
import { item, label, list, listAlign, marker, separator } from "./wizardStepper.css";

type WizardStepperStep = {
  id: string;
  label: string;
};

type WizardStepperProps = {
  steps: WizardStepperStep[];
  currentStepId: string;
  align?: "start" | "center";
  onSelectStep?: (id: string) => void;
};

export const WizardStepper = ({ steps, currentStepId, align = "start", onSelectStep }: WizardStepperProps) => {
  const currentIndex = Math.max(0, steps.findIndex((step) => step.id === currentStepId));

  return (
    <ol class={`${list} ${listAlign[align]}`} aria-label="Installer steps">
      {steps.map((step, index) => {
        const state = index < currentIndex ? "complete" : index === currentIndex ? "active" : "pending";
        return (
          <Fragment key={step.id}>
            <li class={item} data-state={state}>
              {onSelectStep ? (
                <button type="button" class={marker} onClick={() => onSelectStep(step.id)}>{index + 1}</button>
              ) : (
                <span class={marker}>{index + 1}</span>
              )}
              <span class={label}>{step.label}</span>
            </li>
            {index < steps.length - 1 ? <li class={separator} aria-hidden="true" /> : null}
          </Fragment>
        );
      })}
    </ol>
  );
};

export type { WizardStepperStep };
