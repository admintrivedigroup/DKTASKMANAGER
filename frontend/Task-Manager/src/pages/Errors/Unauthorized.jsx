import React from "react";
import { Link, useLocation } from "react-router-dom";

const Unauthorized = () => {
  const location = useLocation();
  const fromPath =
    typeof location.state?.from?.pathname === "string"
      ? location.state.from.pathname
      : "/login";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-100 via-slate-200 to-white px-4 py-16 text-center dark:from-slate-950 dark:via-slate-900 dark:to-slate-900">
      <div className="w-full max-w-md space-y-6 rounded-3xl border border-white/60 bg-white/80 p-8 shadow-[0_24px_60px_rgba(15,23,42,0.1)] backdrop-blur-xl transition-colors duration-300 dark:border-slate-800/60 dark:bg-slate-900/70 dark:text-slate-100 dark:shadow-[0_24px_60px_rgba(2,6,23,0.6)]">
        <p className="text-xs font-semibold uppercase tracking-[0.4em] text-primary/80 dark:text-indigo-300/80">
          Access Restricted
        </p>
        <h1 className="text-3xl font-semibold text-slate-900 transition-colors duration-300 dark:text-white">
          You don&apos;t have permission to view this page.
        </h1>
        <p className="text-sm text-slate-600 transition-colors duration-300 dark:text-slate-400">
          If you believe this is a mistake, please contact your workspace Super Admin or try signing in with a different account.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            to={fromPath}
            replace
            className="inline-flex items-center justify-center rounded-2xl border border-primary/20 bg-primary/90 px-5 py-3 text-sm font-semibold uppercase tracking-[0.28em] text-white shadow-[0_18px_36px_rgba(59,130,246,0.35)] transition hover:-translate-y-0.5 hover:bg-primary"
          >
            Try Again
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200/70 bg-white/80 px-5 py-3 text-sm font-semibold uppercase tracking-[0.28em] text-slate-600 transition hover:-translate-y-0.5 hover:border-primary/30 hover:text-primary dark:border-slate-700/60 dark:bg-slate-900/60 dark:text-slate-300"
          >
            Go to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;