import React, { useEffect, useMemo, useRef, useState } from "react";
import { LuChevronDown, LuSearch } from "react-icons/lu";

const noop = () => {};

const SearchableSelect = ({
  value,
  onChange,
  options = [],
  filteredOptions,
  getOptionValue = noop,
  getOptionLabel = noop,
  placeholder = "Select an option",
  searchTerm,
  onSearchTermChange = noop,
  searchPlaceholder = "Search",
  noResultsMessage = "No results found.",
  icon: Icon,
  staticOptions = [],
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  const searchValue = typeof searchTerm === "string" ? searchTerm : "";
  const normalizedSearchTerm = searchValue.trim().toLowerCase();

  const staticItems = useMemo(
    () =>
      staticOptions.map((option, index) => ({
        id: `static-${index}`,
        value: option?.value ?? "",
        label: option?.label ?? "",
      })),
    [staticOptions]
  );

  const dynamicItems = useMemo(
    () =>
      (options || []).map((option, index) => ({
        id: `option-${index}`,
        value: getOptionValue(option),
        label: getOptionLabel(option),
        option,
      })),
    [getOptionLabel, getOptionValue, options]
  );

  const allItems = useMemo(
    () => [...staticItems, ...dynamicItems],
    [dynamicItems, staticItems]
  );

  const filteredDynamicItems = useMemo(() => {
    const source = Array.isArray(filteredOptions) ? filteredOptions : options;
    return (source || []).map((option, index) => ({
      id: `filtered-${index}`,
      value: getOptionValue(option),
      label: getOptionLabel(option),
    }));
  }, [filteredOptions, getOptionLabel, getOptionValue, options]);

  const filteredStaticItems = useMemo(() => {
    if (!normalizedSearchTerm) {
      return staticItems;
    }

    return staticItems.filter((item) =>
      item.label.toLowerCase().includes(normalizedSearchTerm)
    );
  }, [normalizedSearchTerm, staticItems]);

  const displayedItems = useMemo(
    () => [...filteredStaticItems, ...filteredDynamicItems],
    [filteredDynamicItems, filteredStaticItems]
  );

  const selectedItem = useMemo(
    () => allItems.find((item) => item.value === value),
    [allItems, value]
  );

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleClickOutside = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const focusSearch = () => {
      searchInputRef.current?.focus();
    };

    if (typeof window !== "undefined" && window.requestAnimationFrame) {
      const frame = window.requestAnimationFrame(focusSearch);
      return () => window.cancelAnimationFrame(frame);
    }

    focusSearch();
    return undefined;
  }, [isOpen]);

  const toggleOpen = () => {
    if (disabled) {
      return;
    }
    setIsOpen((previous) => !previous);
  };

  const handleOptionSelect = (optionValue) => {
    onChange?.(optionValue);
    setIsOpen(false);
  };

  const handleSearchChange = (event) => {
    onSearchTermChange?.(event.target.value);
  };

  const isPlaceholder = !selectedItem?.label;
  const buttonTextColor = isPlaceholder
    ? "text-slate-400 dark:text-slate-500"
    : "text-slate-700 dark:text-slate-200";

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={toggleOpen}
        disabled={disabled}
        className={`flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:bg-slate-900/60 ${buttonTextColor}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="flex w-full items-center gap-2">
          {Icon ? (
            <Icon className="h-4 w-4 text-slate-400" aria-hidden="true" />
          ) : null}
          <span className="flex-1 truncate">
            {selectedItem?.label || placeholder}
          </span>
        </span>
        <LuChevronDown
          className={`h-4 w-4 text-slate-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      {isOpen ? (
        <div className="absolute z-20 mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-900">
          <div className="relative">
            <LuSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchInputRef}
              type="search"
              value={searchValue}
              onChange={handleSearchChange}
              placeholder={searchPlaceholder}
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          <div
            role="listbox"
            className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-transparent"
          >
            {displayedItems.length > 0 ? (
              displayedItems.map((item) => {
                const isSelected = item.value === value;
                return (
                  <button
                    type="button"
                    key={`${item.id}-${item.value}`}
                    onClick={() => handleOptionSelect(item.value)}
                    className={`flex w-full items-center rounded-lg px-3 py-2 text-left text-sm transition ${
                      isSelected
                        ? "bg-primary/10 font-medium text-primary"
                        : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800/60"
                    }`}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })
            ) : (
              <p className="px-3 py-4 text-center text-sm text-slate-500 dark:text-slate-400">
                {noResultsMessage}
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default SearchableSelect;