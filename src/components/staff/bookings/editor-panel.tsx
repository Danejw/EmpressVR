"use client";
import { useEffect, useId, useRef, type ReactNode } from "react";

/** Shared side sheet for booking forms and details; no database or routing dependency. */
export function EditorPanel({ title, onClose, children }: {
  title: string; onClose: () => void; children: ReactNode;
}) {
  const heading = useId();
  const panel = useRef<HTMLElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  useEffect(()=>{
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButton.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") { event.preventDefault(); onClose(); }
      if (event.key !== "Tab" || !panel.current) return;
      const focusable = Array.from(panel.current.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex="0"]'
      )).filter(element=>element.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length-1];
      if (event.shiftKey && document.activeElement===first) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement===last) {
        event.preventDefault(); first.focus();
      }
    }
    document.addEventListener("keydown",onKeyDown);
    return ()=>{document.removeEventListener("keydown",onKeyDown);previous?.focus();};
  },[onClose]);
  return <div className="booking-panel-backdrop" onMouseDown={event=>{
    if (event.target===event.currentTarget) onClose();
  }}>
    <aside className="booking-panel" role="dialog" aria-modal="true" aria-labelledby={heading} ref={panel}>
      <div className="booking-panel-heading">
        <h2 id={heading}>{title}</h2>
        <button ref={closeButton} type="button" onClick={onClose} aria-label="Close panel">×</button>
      </div>
      <div className="booking-panel-body">{children}</div>
    </aside>
  </div>;
}
