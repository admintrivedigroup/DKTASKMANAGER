import React from "react";
import { LuCircleAlert } from "react-icons/lu";

const DocumentsDisabledNotice = () => {
  return (
    <section className="flex flex-col items-center justify-center gap-6 rounded-3xl border border-slate-200/70 bg-white/80 p-10 text-center shadow-xl shadow-slate-500/5 transition-colors duration-300 dark:border-slate-800/60 dark:bg-slate-900/70 dark:shadow-slate-900/30">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-100 via-orange-100 to-rose-100 text-amber-600 dark:from-amber-500/20 dark:via-orange-500/10 dark:to-rose-500/10 dark:text-amber-300">
        <LuCircleAlert className="h-8 w-8" aria-hidden="true" />
      </div>
      <div className="max-w-xl space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
          Documents workspace is temporarily unavailable
        </h1>
        <p className="text-base leading-relaxed text-slate-600 dark:text-slate-300">
          We're performing scheduled improvements to the documents experience. Please
          check back soon or contact your workspace administrator if you need urgent
          assistance with document access.
        </p>
      </div>
    </section>
  );
};

export default DocumentsDisabledNotice;