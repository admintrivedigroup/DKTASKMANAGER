import React from "react";

const InfoCard = ({
  icon: Icon,
  label,
  value,
  color = "text-indigo-600 bg-indigo-50",
  onClick
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex w-full flex-col gap-4 overflow-hidden rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-1 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
    >
      <div className="flex w-full items-center justify-between">
        <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${color}`}>
          {Icon ? <Icon className="text-xl" /> : <span className="text-lg font-semibold">Σ</span>}
        </div>
        {/* Optional: Add a trend indicator here if available */}
      </div>

      <div>
        <p className="text-3xl font-bold text-slate-900">{value}</p>
        <p className="text-sm font-medium text-slate-500">{label}</p>
      </div>
    </button>
  );
};

export default InfoCard;