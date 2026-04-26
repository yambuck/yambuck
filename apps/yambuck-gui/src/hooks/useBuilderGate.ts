import { useEffect, useState } from "preact/hooks";
import { logUiAction } from "../lib/ui-log";
import type { AppPage } from "../types/app";

const BUILDER_GATE_DISMISS_KEY = "yambuck.builderGateDismissed";

const loadBuilderGateDismissed = (): boolean => {
  try {
    return window.localStorage.getItem(BUILDER_GATE_DISMISS_KEY) === "1";
  } catch {
    return false;
  }
};

type UseBuilderGateParams = {
  page: AppPage;
  setPage: (page: AppPage) => void;
};

export const useBuilderGate = ({ page, setPage }: UseBuilderGateParams) => {
  const [builderGateDismissed, setBuilderGateDismissed] = useState(() => loadBuilderGateDismissed());
  const [showBuilderGate, setShowBuilderGate] = useState(false);
  const [rememberBuilderGateDismissal, setRememberBuilderGateDismissal] = useState(false);

  useEffect(() => {
    if (page !== "packageBuilder" || builderGateDismissed) {
      setShowBuilderGate(false);
      return;
    }
    logUiAction("builder-gate-show");
    setShowBuilderGate(true);
  }, [page, builderGateDismissed]);

  const handleBuilderGateContinue = () => {
    logUiAction("builder-gate-continue", { remember: rememberBuilderGateDismissal });
    if (rememberBuilderGateDismissal) {
      try {
        window.localStorage.setItem(BUILDER_GATE_DISMISS_KEY, "1");
      } catch {
        // ignore localStorage failures
      }
      setBuilderGateDismissed(true);
    }
    setShowBuilderGate(false);
  };

  const handleBuilderGateCancel = () => {
    logUiAction("builder-gate-cancel");
    setShowBuilderGate(false);
    setRememberBuilderGateDismissal(false);
    setPage("installer");
  };

  return {
    showBuilderGate,
    rememberBuilderGateDismissal,
    setRememberBuilderGateDismissal,
    handleBuilderGateContinue,
    handleBuilderGateCancel,
  };
};
