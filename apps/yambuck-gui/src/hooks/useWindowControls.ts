import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useState } from "preact/hooks";

type UseWindowControlsOptions = {
  onError: (message: string) => void;
};

export const useWindowControls = ({ onError }: UseWindowControlsOptions) => {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    const win = getCurrentWindow();
    const syncMaximizeState = async () => {
      try {
        setIsMaximized(await win.isMaximized());
      } catch {
        setIsMaximized(false);
      }
    };

    void syncMaximizeState();

    let detachResizeListener: (() => void) | undefined;
    void win.onResized(async () => {
      await syncMaximizeState();
    }).then((unlisten) => {
      detachResizeListener = unlisten;
    });

    return () => {
      if (detachResizeListener) {
        detachResizeListener();
      }
    };
  }, []);

  const handleTitlebarMouseDown = async (event: MouseEvent) => {
    if (event.buttons !== 1) {
      return;
    }

    const target = event.target as HTMLElement | null;
    if (target?.closest("button, a, input, [data-no-drag='true']")) {
      return;
    }

    try {
      await getCurrentWindow().startDragging();
    } catch {
      // no-op if drag is unavailable
    }
  };

  const handleMinimize = async () => {
    try {
      await getCurrentWindow().minimize();
    } catch {
      onError("Unable to minimize window.");
    }
  };

  const handleToggleMaximize = async () => {
    try {
      const win = getCurrentWindow();
      const currentlyMaximized = await win.isMaximized();
      if (currentlyMaximized) {
        await win.unmaximize();
        setIsMaximized(false);
      } else {
        await win.maximize();
        setIsMaximized(true);
      }
    } catch {
      onError("Unable to resize window.");
    }
  };

  const handleClose = async () => {
    try {
      await getCurrentWindow().close();
    } catch {
      onError("Unable to close window.");
    }
  };

  return {
    isMaximized,
    handleTitlebarMouseDown,
    handleMinimize,
    handleToggleMaximize,
    handleClose,
  };
};
