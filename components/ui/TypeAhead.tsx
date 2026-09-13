"use client";

import { useId, useMemo, useRef, useState } from "react";

export type TypeAheadOption = {
  id: string;
  label: string;
  render?: React.ReactNode;
};

/**
 * Type two characters, arrow down, Enter — UI spec §3.4. Never forces a
 * mouse trip to a dropdown. `name` carries the selected option's id as a
 * hidden field so this drops into a plain <form action={serverAction}>.
 */
export function TypeAhead({
  name,
  options,
  defaultOption,
  placeholder,
  onSelect,
}: {
  name: string;
  options: TypeAheadOption[];
  defaultOption?: TypeAheadOption;
  placeholder?: string;
  onSelect?: (option: TypeAheadOption) => void;
}) {
  const [query, setQuery] = useState(defaultOption?.label ?? "");
  const [selected, setSelected] = useState<TypeAheadOption | null>(
    defaultOption ?? null,
  );
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options.slice(0, 8);
    return options
      .filter((o) => o.label.toLowerCase().includes(q))
      .slice(0, 8);
  }, [query, options]);

  function choose(option: TypeAheadOption) {
    setSelected(option);
    setQuery(option.label);
    setOpen(false);
    onSelect?.(option);
  }

  return (
    <div className="relative">
      <input type="hidden" name={name} value={selected?.id ?? ""} />
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        autoComplete="off"
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setSelected(null);
          setOpen(true);
          setActiveIndex(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter") {
            if (open && filtered[activeIndex]) {
              e.preventDefault();
              choose(filtered[activeIndex]);
            }
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        className="h-10 w-full rounded-md border-[1.5px] border-[#C9CFD4] px-3 text-[17px] text-[#14171A] outline-none focus:border-[#8B949C]"
      />
      {open && filtered.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-md border-[1.5px] border-[#C9CFD4] bg-white shadow-sm"
        >
          {filtered.map((option, i) => (
            <li
              key={option.id}
              role="option"
              aria-selected={i === activeIndex}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(option);
              }}
              className={`cursor-pointer px-3 py-2 text-[17px] text-[#14171A] ${
                i === activeIndex ? "bg-[#F2F4F5]" : ""
              }`}
            >
              {option.render ?? option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
