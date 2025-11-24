import React, { useId, useState } from "react";
import { FaRegEye, FaRegEyeSlash } from "react-icons/fa6";

const Input = ({ value, onChange, label, placeholder, type = "text", id, name, className = "", ...props }) => {
  const [showPassword, setShowPassword] = useState(false);
  const generatedId = useId();

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const inputType = type === "password" ? (showPassword ? "text" : "password") : type;
  const inputId = id || generatedId;
  const inputName = name || inputId;
  const labelFor = inputId;

  return (
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={labelFor}
          className="block text-sm font-medium text-slate-700"
        >
          {label}
        </label>
      )}
  
      <div className="relative">
        <input
          id={inputId}
          name={inputName}
          type={inputType}
          placeholder={placeholder}
          className={`w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500 ${className}`.trim()}
          value={value}
          onChange={(e) => onChange(e)}
          {...props}
        />

        {type === "password" && (
          <button
            type="button"
            onClick={toggleShowPassword}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
            aria-label={showPassword ? "Hide password" : "Show password"}
            title={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <FaRegEye size={16} />
            ) : (
              <FaRegEyeSlash size={16} />
            )}
          </button>
        )}
      </div>
    </div>
  );   
};

export default Input;
