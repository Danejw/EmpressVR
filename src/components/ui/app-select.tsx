"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";

export type SelectOption = Readonly<{ value: string; label: string; disabled?: boolean }>;

type AppSelectProps = {
  id?: string;
  value: string;
  options: readonly SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  ariaLabel?: string;
  className?: string;
};

/** Accessible, reusable select for public and staff forms, with optional search. */
export function AppSelect({
  id, value, options, onChange, placeholder = "Select an option",
  disabled = false, required = false, searchable = false,
  searchPlaceholder = "Search options", ariaLabel, className = "",
}: AppSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const generatedId = useId();
  const listId = generatedId + "-list";
  const selected = options.find(option => option.value === value);
  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return options.filter(option => !term ||
      option.label.toLowerCase().includes(term) ||
      option.value.toLowerCase().includes(term));
  }, [options, query]);
  const activeOption = visible[active];

  useEffect(() => {
    function onOutside(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onOutside);
    return () => document.removeEventListener("pointerdown", onOutside);
  }, []);

  useEffect(() => {
    if (open && searchable) searchRef.current?.focus();
  }, [open, searchable]);

  function choose(option: SelectOption) {
    if (option.disabled) return;
    onChange(option.value);
    setQuery("");
    setActive(0);
    setOpen(false);
    triggerRef.current?.focus();
  }
  function move(delta: number) {
    if (!open) { setOpen(true); setActive(0); return; }
    if (!visible.length) return;
    let next = active;
    for (let attempt = 0; attempt < visible.length; attempt++) {
      next = (next + delta + visible.length) % visible.length;
      if (!visible[next].disabled) break;
    }
    setActive(next);
    rootRef.current?.querySelector<HTMLElement>('[data-select-index="' + next + '"]')
      ?.scrollIntoView({ block: "nearest" });
  }
  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape" && open) {
      event.preventDefault(); setOpen(false); setQuery(""); triggerRef.current?.focus();
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault(); move(event.key === "ArrowDown" ? 1 : -1);
    } else if (event.key === "Enter" && open && activeOption) {
      event.preventDefault(); choose(activeOption);
    } else if (event.key === "Home" && open) {
      event.preventDefault(); setActive(0);
    } else if (event.key === "End" && open) {
      event.preventDefault(); setActive(Math.max(0, visible.length - 1));
    }
  }

  return <div className={"app-select " + className} ref={rootRef}
    onBlur={event => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
        setOpen(false);
        setQuery("");
      }
    }}>
    <button id={id} ref={triggerRef} type="button"
      className="app-select-trigger" role="combobox" aria-label={ariaLabel}
      aria-haspopup="listbox" aria-expanded={open} aria-controls={listId}
      aria-required={required} disabled={disabled}
      aria-activedescendant={open && activeOption ? listId + "-option-" + active : undefined}
      onClick={() => { setOpen(prev => !prev); setQuery(""); setActive(0); }}
      onKeyDown={onKeyDown}>
      <span className={selected ? undefined : "app-select-placeholder"}>
        {selected?.label ?? placeholder}
      </span>
      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24"
        stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round">
        <path d="m6 9 6 6 6-6" />
      </svg>
    </button>
    {open ? <div className="app-select-popup">
      {searchable ? <input ref={searchRef} className="app-select-search" type="search"
        value={query} placeholder={searchPlaceholder}
        aria-label={searchPlaceholder} aria-controls={listId}
        aria-activedescendant={activeOption ? listId + "-option-" + active : undefined}
        onChange={event => { setQuery(event.target.value); setActive(0); }}
        onKeyDown={onKeyDown} /> : null}
      <div id={listId} role="listbox" aria-label={ariaLabel ?? "Options"}
        className="app-select-options">
        {visible.length ? visible.map((option, index) =>
          <button type="button" role="option" key={option.value}
            data-select-index={index} id={listId + "-option-" + index}
            aria-selected={option.value === value} tabIndex={-1}
            className={"app-select-option" + (active === index ? " is-active" : "")}
            disabled={option.disabled} onMouseEnter={() => setActive(index)}
            onClick={() => choose(option)}>
            {option.label}
          </button>) :
          <p className="app-select-empty">No matching options</p>}
      </div>
    </div> : null}
  </div>;
}
