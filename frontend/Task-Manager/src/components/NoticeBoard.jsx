import React from "react";
const NoticeBoard = ({ notices }) => {
  if (!Array.isArray(notices) || notices.length === 0) {
    return null;
  }

  return (
    <section className="overflow-hidden rounded-[24px] border border-indigo-100 bg-indigo-50/80 shadow-[0_18px_40px_rgba(79,70,229,0.12)] dark:border-slate-700/70 dark:bg-slate-900/70 dark:shadow-[0_26px_60px_rgba(2,6,23,0.55)]">
      <div className="flex items-center gap-2 bg-indigo-100/80 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.38em] text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-50">
        <span className="inline-flex h-2 w-2 rounded-full bg-indigo-500" />
        Notice Board
      </div>
      <div className="notice-marquee-wrapper">
        <div className="notice-marquee px-4 py-3 text-sm font-medium text-indigo-700 dark:text-slate-100">
          <div className="flex items-center gap-8">
             {notices.map((notice) => (
              <div
                key={notice._id}
                className="inline-flex items-center gap-3 rounded-full bg-white/60 px-4 py-2 text-indigo-700 shadow-sm dark:border dark:border-slate-700/70 dark:bg-slate-800/80 dark:text-slate-100 dark:shadow-[0_16px_40px_rgba(2,6,23,0.45)]"
              >
                <span className="inline-flex h-2 w-2 rounded-full bg-indigo-500" />
                <span className="max-w-[420px] truncate sm:max-w-none">
                  {notice.message}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default NoticeBoard;