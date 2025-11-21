import React from "react";

const TaskStatusTabs = ({ tabs, activeTab, setActiveTab }) => {
  return (
    <div className="my-2 rounded-full border border-white/50 bg-white/70 p-1 shadow-[0_18px_40px_rgba(15,23,42,0.08)] transition-colors duration-300 dark:border-slate-800/60 dark:bg-slate-900/60 dark:shadow-[0_20px_45px_rgba(2,6,23,0.5)]">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.label;

          return (
            <button
              key={tab.label}
              className={`group relative inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition ${
                isActive
                  ? "bg-gradient-to-r from-primary/90 via-indigo-500 to-sky-500 text-white shadow-[0_12px_28px_rgba(59,130,246,0.35)]"
                  : "text-slate-500 hover:text-primary dark:text-slate-300 dark:hover:text-indigo-300"
              }`}
              onClick={() => setActiveTab(tab.label)}
            >
               <span>{tab.label}</span>
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-semibold transition-colors duration-300 ${
                  isActive
                    ? "border-white/60 bg-white/20 text-white"
                    : "border-slate-200 bg-white/80 text-slate-500 group-hover:border-primary/40 group-hover:text-primary dark:border-slate-700/60 dark:bg-slate-900/60 dark:text-slate-300 dark:group-hover:text-indigo-300"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TaskStatusTabs;
