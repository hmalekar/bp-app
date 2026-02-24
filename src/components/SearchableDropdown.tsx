import { useRef, useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";

export interface SearchableDropdownOption<T = unknown> {
  value: T;
  label: string;
}

interface SearchableDropdownProps<T> {
  options: SearchableDropdownOption<T>[];
  value: T | null;
  onChange: (value: T | null) => void;
  placeholder?: string;
  getOptionKey: (option: T) => string | number;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
  id?: string;
}

function SearchableDropdown<T>({
  options,
  value,
  onChange,
  placeholder = "Search...",
  getOptionKey,
  disabled = false,
  invalid = false,
  className = "",
  id,
}: SearchableDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [dropdownRect, setDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = value != null ? options.find((o) => getOptionKey(o.value) === getOptionKey(value)) : null;
  const displayLabel = selectedOption ? selectedOption.label : "";

  const filteredOptions = search.trim() ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase())) : options;

  const handleSelect = useCallback(
    (option: SearchableDropdownOption<T>) => {
      onChange(option.value);
      setSearch("");
      setIsOpen(false);
    },
    [onChange],
  );

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange(null);
      setSearch("");
      setIsOpen(false);
    },
    [onChange],
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const inContainer = containerRef.current?.contains(target);
      const inDropdown = (event.target as Element).closest?.("[data-searchable-dropdown-list]");
      if (!inContainer && !inDropdown) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const inputValue = isOpen ? search : displayLabel;

  return (
    <div ref={containerRef} className={`position-relative ${className}`}>
      <div className="input-group">
        <input
          id={id}
          type="text"
          className={`form-control form-control-sm ${invalid ? "is-invalid" : ""}`}
          placeholder={placeholder}
          value={inputValue}
          onChange={(e) => {
            setSearch(e.target.value);
            if (!isOpen) {
              setIsOpen(true);
              const el = containerRef.current;
              if (el) {
                const r = el.getBoundingClientRect();
                setDropdownRect({ top: r.bottom, left: r.left, width: r.width });
              }
            }
          }}
          onFocus={() => {
            setIsOpen(true);
            const el = containerRef.current;
            if (el) {
              const r = el.getBoundingClientRect();
              setDropdownRect({ top: r.bottom, left: r.left, width: r.width });
            }
          }}
          disabled={disabled}
          autoComplete="off"
        />
        {selectedOption && !disabled && (
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={handleClear} aria-label="Clear selection">
            ×
          </button>
        )}
      </div>
      {isOpen &&
        dropdownRect &&
        createPortal(
          <ul
            data-searchable-dropdown-list
            className="list-group shadow-sm"
            style={{
              position: "fixed",
              top: dropdownRect.top,
              left: dropdownRect.left,
              width: dropdownRect.width,
              zIndex: 1050,
              maxHeight: 220,
              overflowY: "auto",
            }}
          >
            {filteredOptions.length === 0 ? (
              <li className="list-group-item list-group-item-secondary small">No matches</li>
            ) : (
              filteredOptions.map((opt) => (
                <li
                  key={String(getOptionKey(opt.value))}
                  role="option"
                  aria-selected={value !== null && getOptionKey(opt.value) === getOptionKey(value)}
                  className="list-group-item list-group-item-action py-2 small"
                  onClick={() => handleSelect(opt)}
                >
                  {opt.label}
                </li>
              ))
            )}
          </ul>,
          document.body,
        )}
    </div>
  );
}

export default SearchableDropdown;
