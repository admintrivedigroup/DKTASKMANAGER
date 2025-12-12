import React from "react";

const TaskStatusTabs = ({ tabs, activeTab, setActiveTab }) => {
  return (
    <div className="rounded-xl border border-slate-200 bg-white/90 px-1.5 py-1 shadow-sm backdrop-blur-sm transition-colors duration-300 dark:border-slate-800/70 dark:bg-slate-900/70 dark:shadow-none">
      <div className="flex flex-wrap items-center gap-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.label;

          return (
            <button
              key={tab.label}
              className={`group inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                isActive
                  ? "bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-100 dark:bg-indigo-900/40 dark:text-indigo-100 dark:ring-indigo-800/60"
                  : "text-slate-600 hover:bg-slate-50 hover:text-indigo-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-indigo-200"
              }`}
              onClick={() => setActiveTab(tab.label)}
            >
               <span>{tab.label}</span>
              <span
                className={`flex h-6 min-w-[1.6rem] items-center justify-center rounded-full border text-xs font-semibold transition-colors duration-300 ${
                  isActive
                    ? "border-indigo-200 bg-white text-indigo-700 dark:border-indigo-700/70 dark:bg-indigo-900/60 dark:text-indigo-100"
                    : "border-slate-200 bg-white text-slate-600 group-hover:border-indigo-200 group-hover:text-indigo-700 dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-slate-200"
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
