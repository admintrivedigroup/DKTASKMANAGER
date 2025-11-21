import React, { useState } from "react";
import { LuChevronDown } from "react-icons/lu";

const SelectDropdown = ({ options, value, onChange, placeholder }) => {
    const [isOpen, setIsOpen] = useState(false);

    const handleSelect = (option) => {
        onChange(option);
        setIsOpen(false);
    };

    return (
        <div className="relative w-full">
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className={`flex w-full items-center justify-between rounded-2xl bg-transparent px-4 py-3 text-left text-sm font-medium text-slate-600 transition hover:text-slate-900 ${
              isOpen ? "text-slate-900" : ""
            }`}
          >
            <span>
              {value ? options.find((opt) => opt.value === value)?.label : placeholder}
            </span>
            <LuChevronDown
              className={`ml-2 transition-transform ${isOpen ? "rotate-180" : "rotate-0"}`}
            />
          </button>
    
          {isOpen && (
            <div className="dropdown-panel absolute left-0 top-full z-20 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_24px_48px_rgba(15,23,42,0.12)]">
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => handleSelect(option.value)}
              className={`w-full px-4 py-2.5 text-left text-sm font-medium text-slate-600 transition hover:bg-primary/5 hover:text-slate-900 ${
                option.value === value ? "bg-primary/5 text-primary" : ""
              }`}
            >
              {option.label}
            </button>
          ))}
    
        </div>
        )}
    </div>
    );
};

export default SelectDropdown;
