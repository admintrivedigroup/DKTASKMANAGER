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
    <div className="space-y-2">
      <label
        htmlFor={labelFor}
        className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-300"
      >
        {label}
      </label>
  
      <div className="input-box">
        <input
          id={inputId}
          name={inputName}
          type={inputType}
          placeholder={placeholder}
          className={`w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-700 outline-none dark:text-slate-50 dark:placeholder:text-slate-200 ${className}`.trim()}
          value={value}
          onChange={(e) => onChange(e)}
          {...props}
        />

        {type === "password" && (
          <button
          type="button"
          onClick={toggleShowPassword}
          className="text-blue-500 transition hover:text-blue-600 dark:text-indigo-300 dark:hover:text-indigo-200"
          aria-label={showPassword ? "Hide password" : "Show password"}
          title={showPassword ? "Hide password" : "Show password"}
        >
            {showPassword ? (
              <FaRegEye size={20} />
            ) : (
              <FaRegEyeSlash size={20} className="text-slate-400 dark:text-slate-300" />
            )}
          </button>
        )}
      </div>
    </div>
  );   
};

export default Input;
