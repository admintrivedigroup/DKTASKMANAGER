import React from "react";

const InfoCard = ({
  icon: Icon,
  label,
  value,
  color = "text-indigo-700 bg-indigo-50",
  onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    className="group relative flex w-full flex-col gap-3 overflow-hidden rounded-xl border border-slate-200/80 bg-white/95 p-4 text-left shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 dark:border-slate-800/80 dark:bg-slate-900/80 dark:shadow-slate-950/40 dark:focus:ring-offset-slate-900"
  >
    <div className="flex w-full items-center justify-between">
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-lg ${color} bg-opacity-90 text-base font-semibold dark:bg-white/10 dark:text-white dark:ring-1 dark:ring-white/10`}
      >
        {Icon ? <Icon className="text-xl" /> : <span className="text-lg font-semibold">I</span>}
      </div>
    </div>

    <div>
      <p className="text-2xl font-bold leading-snug text-slate-900 dark:text-slate-50">
        {value}
      </p>
      <p className="text-sm font-medium text-slate-500 dark:text-slate-300">{label}</p>
    </div>
  </button>
);

export default InfoCard;
