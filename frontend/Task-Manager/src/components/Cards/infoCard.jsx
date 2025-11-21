import React from "react";

const InfoCard = ({
  icon: Icon,
  label,
  value,
  color = "from-primary via-indigo-500 to-sky-400",
  onClick
}) => {
  const gradientClass = color.includes("from-") ? color : "from-primary via-indigo-500 to-sky-400";

  return (
    <button
      type="button"
      onClick={onClick}
      className="relative w-full overflow-hidden rounded-[28px] border border-white/60 bg-white/80 p-5 text-left shadow-[0_24px_48px_rgba(15,23,42,0.08)] backdrop-blur transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:ring-primary/60"
    >
      <span className={`absolute inset-0 -z-10 bg-gradient-to-br ${gradientClass} opacity-[0.16]`} />
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
        </div>

        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${gradientClass} text-white shadow-[0_12px_28px_rgba(79,70,229,0.25)]`}>
          {Icon ? <Icon className="text-xl" /> : <span className="text-lg font-semibold">Σ</span>}
        </div>
      </div>

      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/70">
      <span className={`block h-full w-full bg-gradient-to-r ${gradientClass}`} />
      </div>
      </button>
  );
};

export default InfoCard;