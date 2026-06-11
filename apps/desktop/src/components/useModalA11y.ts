import { useEffect, type RefObject } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

/**
 * Shared modal accessibility behaviour for the app's overlay dialogs:
 * - Escape closes the dialog
 * - body scroll is locked while open
 * - focus is moved into the panel on open and trapped (Tab cycles within)
 * - focus is restored to the previously-focused element on close
 *
 * Attach `panelRef` to the dialog panel element and give it `tabIndex={-1}`
 * so it can receive focus as a fallback. The hook is a no-op while `isOpen`
 * is false, so it is safe to call before an early `return null`.
 */
export function useModalA11y(
  isOpen: boolean,
  onClose: () => void,
  panelRef: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const panel = panelRef.current;
    const focusables = () =>
      panel ? Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((el) => el.offsetParent !== null) : [];

    // Move focus into the dialog on open.
    const first = focusables()[0];
    (first ?? panel)?.focus?.();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panel) {
        return;
      }
      const items = focusables();
      if (items.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (event.shiftKey) {
        if (active === firstItem || !panel.contains(active)) {
          event.preventDefault();
          lastItem.focus();
        }
      } else if (active === lastItem || !panel.contains(active)) {
        event.preventDefault();
        firstItem.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [isOpen, onClose, panelRef]);
}
