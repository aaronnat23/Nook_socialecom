'use client';
import { useEffect, useRef } from 'react';
/** Trap modal focus, hide background controls from assistive tech, restore focus on close. */
export function useModal(onClose: () => void, active = true) {
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (!active) return;
    const backdrops = document.querySelectorAll<HTMLElement>('.modal-backdrop');
    const backdrop = backdrops[backdrops.length - 1];
    const dialog = backdrop?.querySelector<HTMLElement>('[role="dialog"]');
    if (!dialog || !backdrop) return;
    const previous = document.activeElement as HTMLElement | null;
    const siblings = Array.from(document.body.children).filter(
      (node): node is HTMLElement =>
        node instanceof HTMLElement && node !== backdrop && !node.contains(backdrop),
    );
    const states = siblings.map((node) => ({ node, inert: node.inert }));
    for (const { node } of states) node.inert = true;
    const focusable = () =>
      Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not(:disabled),a[href],input:not(:disabled),textarea:not(:disabled),select:not(:disabled),[tabindex="0"]',
        ),
      ).filter((node) => node.offsetParent !== null);
    const first = dialog.querySelector<HTMLElement>('[autofocus]') || focusable()[0];
    first?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close.current();
      }
      if (event.key === 'Tab') {
        const elements = focusable();
        const start = elements[0],
          end = elements.at(-1);
        if (
          event.shiftKey &&
          (document.activeElement === start || !dialog.contains(document.activeElement))
        ) {
          event.preventDefault();
          end?.focus();
        } else if (
          !event.shiftKey &&
          (document.activeElement === end || !dialog.contains(document.activeElement))
        ) {
          event.preventDefault();
          start?.focus();
        }
      }
    };
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('keydown', key);
      for (const { node, inert } of states) node.inert = inert;
      if (previous?.isConnected) previous.focus();
    };
  }, [active]);
}
