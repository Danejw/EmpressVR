"use client";

import { useRef, type ReactNode, type MouseEvent } from "react";

/** Navigation dropdown with persistent trigger and automatic close after navigation. */
export function HeaderMenu({children}:{children:ReactNode}){
  const menu=useRef<HTMLDetailsElement>(null);
  function onNavigate(event:MouseEvent<HTMLElement>){
    if(event.target instanceof Element && event.target.closest("a")){
      menu.current?.removeAttribute("open");
    }
  }
  return <details className="header-menu" ref={menu}>
    <summary aria-label="Navigation menu" title="Navigation menu">
      <svg width="23" height="23" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <path d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </summary>
    <nav aria-label="Primary navigation" onClick={onNavigate}>
      {children}
    </nav>
  </details>;
}
