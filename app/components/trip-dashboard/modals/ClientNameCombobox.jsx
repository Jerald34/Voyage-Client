"use client";
// Controlled combobox for client-name autocomplete inside SaveItineraryModal.
import React, { useId, useRef, useState } from "react";

export default function ClientNameCombobox({ value, onChange, suggestions, placeholder, required, id }) {
  const uid = useId();
  const listboxId = `${uid}-listbox`;
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  // Filter suggestions: prefix matches first, then substring, cap at 8.
  const filtered = React.useMemo(() => {
    if (!suggestions?.length) return [];
    const q = (value ?? "").trim().toLowerCase();
    if (!q) return suggestions.slice(0, 8);
    const prefix = [];
    const sub = [];
    for (const s of suggestions) {
      const lower = s.toLowerCase();
      if (lower.startsWith(q)) prefix.push(s);
      else if (lower.includes(q)) sub.push(s);
    }
    return [...prefix, ...sub].slice(0, 8);
  }, [suggestions, value]);

  const open = () => {
    if (filtered.length) { setIsOpen(true); setActiveIndex(-1); }
  };
  const close = () => { setIsOpen(false); setActiveIndex(-1); };

  const select = (name) => {
    onChange?.(name);
    close();
  };

  // Scroll active option into view.
  const scrollActive = (idx) => {
    if (!listRef.current) return;
    const opt = listRef.current.querySelector(`#${CSS.escape(`${listboxId}-opt-${idx}`)}`);
    opt?.scrollIntoView({ block: "nearest" });
  };

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { open(); return; }
      return;
    }
    if (e.key === "Escape") { e.preventDefault(); close(); return; }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = Math.min(activeIndex + 1, filtered.length - 1);
      setActiveIndex(next);
      scrollActive(next);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const next = Math.max(activeIndex - 1, 0);
      setActiveIndex(next);
      scrollActive(next);
      return;
    }
    if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      select(filtered[activeIndex]);
      return;
    }
    // Tab — let focus move naturally; close without intercepting.
    if (e.key === "Tab") { close(); }
  };

  const handleBlur = (e) => {
    // Delay so option mousedown fires before we close.
    setTimeout(() => {
      if (document.activeElement !== inputRef.current) close();
    }, 150);
  };

  const activeOptionId = isOpen && activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined;

  return (
    <div className="relative">
      <input
        ref={inputRef}
        id={id}
        type="text"
        value={value ?? ""}
        onChange={(e) => { onChange?.(e.target.value); setIsOpen(true); setActiveIndex(-1); }}
        onFocus={open}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-activedescendant={activeOptionId}
        className="w-full min-w-0 px-3 py-[11px] rounded-sm border border-[#dbe2ea] dark:border-[#334155] bg-white dark:bg-[#0f172a] text-sm text-[#111827] dark:text-[#f1f5f9] transition-[border-color,box-shadow] duration-[150ms] ease placeholder:text-[#9ca3af] dark:placeholder:text-[#64748b] focus:outline-none focus:border-[#b65d48] focus:shadow-[0_0_0_4px_rgba(182,93,72,0.12)]"
      />
      {isOpen && filtered.length > 0 && (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          className="absolute z-10 mt-1 w-full max-h-60 overflow-y-auto rounded-lg border border-[#dbe2ea] dark:border-[#334155] bg-white dark:bg-[#1e293b] shadow-lg"
        >
          {filtered.map((name, i) => (
            <li
              key={name}
              id={`${listboxId}-opt-${i}`}
              role="option"
              aria-selected={i === activeIndex}
              onMouseDown={(e) => { e.preventDefault(); select(name); }}
              onMouseEnter={() => setActiveIndex(i)}
              className={`px-3 py-2 text-sm text-[#111827] dark:text-[#f1f5f9] cursor-pointer ${i === activeIndex ? "bg-[#b65d48]/10 dark:bg-[#b65d48]/20" : "hover:bg-[#f8fafc] dark:hover:bg-[#334155]"}`}
            >
              {name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
