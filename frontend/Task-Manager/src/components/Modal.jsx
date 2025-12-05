import React from "react";

const Modal = ({
  children,
  isOpen,
  onClose,
  title,
  maxWidthClass = "max-w-2xl",
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-3 py-6 backdrop-blur-sm sm:px-5">
      <div className={`w-full ${maxWidthClass}`}>
        <div className="relative flex max-h-[calc(100vh-3rem)] flex-col overflow-hidden rounded-3xl bg-white shadow-[0_28px_70px_rgba(15,23,42,0.28)] ring-1 ring-slate-200/80 dark:bg-slate-900 dark:ring-slate-800">
          <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-r from-primary/20 via-indigo-100 to-sky-100 opacity-90 dark:from-primary/25 dark:via-slate-800 dark:to-slate-900" />

          <div className="relative flex items-start justify-between gap-3 px-5 py-4 sm:px-8">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500/80 dark:text-slate-400">
                {title ? "Task Desk" : ""}
              </p>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                {title}
              </h3>
            </div>

            <button
              type="button"
              aria-label="Close modal"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-slate-500 ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:bg-white hover:text-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700 dark:hover:text-white"
              onClick={onClose}
            >
              <svg
                className="h-3.5 w-3.5"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 14 14"
              >
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="m1 1 6 6m0 0 6-6M7 7l6 6"
                />
              </svg>
            </button>
          </div>

          <div className="relative h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent dark:via-slate-800" />

          <div className="relative flex-1 overflow-y-auto px-5 pb-6 sm:px-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;
