import type { ComponentChildren } from "preact";
import { useCallback, useLayoutEffect, useRef, useState } from "preact/hooks";
import { createPortal } from "preact/compat";
import { bubble, bubbleBottom, bubbleTop, bubbleVisible, root, rootBlock, trigger, triggerBlock } from "./tooltip.css";

type TooltipProps = {
  content: string;
  children: ComponentChildren;
  class?: string;
  triggerClass?: string;
  bubbleClass?: string;
  align?: "start" | "center" | "end";
  placement?: "auto" | "top" | "bottom";
  focusableTrigger?: boolean;
  block?: boolean;
  onlyWhenTruncated?: boolean;
};

type TooltipPosition = {
  left: number;
  top: number;
  placement: "top" | "bottom";
};

export const Tooltip = ({
  content,
  children,
  class: className,
  triggerClass,
  bubbleClass,
  align = "start",
  placement = "auto",
  focusableTrigger = false,
  block = false,
  onlyWhenTruncated = false,
}: TooltipProps) => {
  const triggerRef = useRef<HTMLSpanElement | null>(null);
  const bubbleRef = useRef<HTMLSpanElement | null>(null);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [position, setPosition] = useState<TooltipPosition | null>(null);
  const open = hovered || focused;

  const isOverflowing = (element: HTMLElement | null): boolean => {
    if (!element) {
      return false;
    }

    return element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1;
  };

  const checkTruncation = useCallback(() => {
    const triggerElement = triggerRef.current;
    if (!triggerElement) {
      return false;
    }

    if (isOverflowing(triggerElement)) {
      return true;
    }

    const firstChild = triggerElement.firstElementChild;
    if (firstChild instanceof HTMLElement && isOverflowing(firstChild)) {
      return true;
    }

    return false;
  }, []);

  const updatePosition = useCallback(() => {
    const triggerElement = triggerRef.current;
    const bubbleElement = bubbleRef.current;
    if (!triggerElement || !bubbleElement) {
      return;
    }

    const triggerRect = triggerElement.getBoundingClientRect();
    const bubbleRect = bubbleElement.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const viewportMargin = 8;
    const spacing = 10;

    let left = triggerRect.left;
    if (align === "center") {
      left = triggerRect.left + (triggerRect.width - bubbleRect.width) / 2;
    } else if (align === "end") {
      left = triggerRect.right - bubbleRect.width;
    }

    const maxLeft = viewportWidth - bubbleRect.width - viewportMargin;
    left = Math.min(Math.max(left, viewportMargin), Math.max(viewportMargin, maxLeft));

    const topCandidate = triggerRect.top - bubbleRect.height - spacing;
    const bottomCandidate = triggerRect.bottom + spacing;
    const canPlaceTop = topCandidate >= viewportMargin;
    const canPlaceBottom = bottomCandidate + bubbleRect.height <= viewportHeight - viewportMargin;

    let resolvedPlacement: "top" | "bottom";
    if (placement === "top") {
      resolvedPlacement = canPlaceTop || !canPlaceBottom ? "top" : "bottom";
    } else if (placement === "bottom") {
      resolvedPlacement = canPlaceBottom || !canPlaceTop ? "bottom" : "top";
    } else {
      resolvedPlacement = canPlaceBottom || !canPlaceTop ? "bottom" : "top";
    }

    const top = resolvedPlacement === "top"
      ? Math.max(viewportMargin, topCandidate)
      : Math.min(viewportHeight - bubbleRect.height - viewportMargin, bottomCandidate);

    setPosition({ left, top, placement: resolvedPlacement });
  }, [align, placement]);

  useLayoutEffect(() => {
    if (!open || typeof window === "undefined") {
      setPosition(null);
      return;
    }

    if (onlyWhenTruncated && !checkTruncation()) {
      setPosition(null);
      return;
    }

    updatePosition();

    const handleReposition = () => {
      if (onlyWhenTruncated && !checkTruncation()) {
        setPosition(null);
        return;
      }
      updatePosition();
    };

    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);

    return () => {
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [open, checkTruncation, onlyWhenTruncated, updatePosition]);

  const bubbleClassName = `${bubble}${position?.placement === "top" ? ` ${bubbleTop}` : ` ${bubbleBottom}`}${position ? ` ${bubbleVisible}` : ""}${bubbleClass ? ` ${bubbleClass}` : ""}`;
  const showBubble = open && (!onlyWhenTruncated || checkTruncation());

  return (
    <span
      class={`${root}${block ? ` ${rootBlock}` : ""}${className ? ` ${className}` : ""}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusIn={() => setFocused(true)}
      onFocusOut={() => setFocused(false)}
    >
      <span
        ref={triggerRef}
        class={`${trigger}${block ? ` ${triggerBlock}` : ""}${triggerClass ? ` ${triggerClass}` : ""}`}
        tabIndex={focusableTrigger ? 0 : undefined}
      >
        {children}
      </span>
      {showBubble && typeof document !== "undefined"
        ? createPortal(
          <span
            ref={bubbleRef}
            class={bubbleClassName}
            role="tooltip"
            style={position ? { left: `${position.left}px`, top: `${position.top}px` } : undefined}
          >
            {content}
          </span>,
          document.body,
        )
        : null}
    </span>
  );
};
