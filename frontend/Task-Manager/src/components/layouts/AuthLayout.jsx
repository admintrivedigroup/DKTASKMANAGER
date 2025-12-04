import React from "react";
import logo from "../../assets/images/logo.png";

const AuthLayout = ({ children }) => {
  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-200 text-slate-900">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70 mix-blend-overlay bg-[radial-gradient(circle_at_20%_20%,rgba(79,70,229,0.12),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(59,130,246,0.08),transparent_30%),radial-gradient(circle_at_50%_100%,rgba(15,23,42,0.1),transparent_32%)]"
      />

      <div className="relative z-10 flex min-h-screen flex-col lg:flex-row">
        {/* Brand Side */}
        <div className="hidden lg:flex lg:w-5/12 xl:w-1/2 bg-slate-900 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-700 via-indigo-800 to-slate-900 opacity-95" />
          <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_600px_at_20%_20%,rgba(255,255,255,0.18),transparent_35%),radial-gradient(circle_420px_at_80%_10%,rgba(255,255,255,0.12),transparent_30%),radial-gradient(circle_520px_at_50%_80%,rgba(255,255,255,0.1),transparent_32%)]" />

          <div className="relative z-10 flex h-full w-full flex-col justify-between p-12 xl:p-14">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md shadow-lg shadow-indigo-900/40 flex items-center justify-center">
                <img
                  src={logo}
                  alt="Logo"
                  className="h-7 w-7 object-contain brightness-0 invert"
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.28em] text-indigo-100/80 font-semibold">
                  Vijay Trivedi Group
                </p>
                <p className="text-sm text-indigo-100/70">Task &amp; Matter Management Suite</p>
              </div>
            </div>

            <div className="space-y-6 max-w-xl">
              <h1 className="text-5xl font-semibold leading-tight tracking-tight">
                Manage your projects with
                <span className="block text-indigo-100 font-bold">precision and clarity.</span>
              </h1>
              <p className="text-indigo-100/80 text-lg leading-relaxed max-w-md font-light">
                Streamline your workflow, track progress, and collaborate effectively with your team in one unified workspace.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4 text-sm text-indigo-100/90 bg-white/5 backdrop-blur-lg p-5 rounded-2xl border border-white/15 inline-flex w-auto shadow-lg shadow-indigo-900/30">
                <div className="flex -space-x-3">
                  <div className="h-9 w-9 rounded-full bg-indigo-400 border-2 border-indigo-600 ring-2 ring-indigo-900/50" />
                  <div className="h-9 w-9 rounded-full bg-indigo-300 border-2 border-indigo-600 ring-2 ring-indigo-900/50" />
                  <div className="h-9 w-9 rounded-full bg-indigo-200 border-2 border-indigo-600 ring-2 ring-indigo-900/50" />
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-white">Trusted by your team</span>
                  <span className="text-xs opacity-80">Join the workspace today</span>
                </div>
              </div>
              <p className="text-xs text-indigo-100/60 font-medium tracking-wide">
                © 2025 Vijay Trivedi Group. All rights reserved.
              </p>
            </div>
          </div>
        </div>

        {/* Form Side */}
        <div className="flex-1 flex items-center justify-center px-6 py-10 sm:px-10 lg:px-16 xl:px-20">
          <div className="w-full max-w-xl space-y-8">
            <div className="lg:hidden flex flex-col items-center gap-3 text-center">
              <div className="h-16 w-16 bg-indigo-50 rounded-2xl flex items-center justify-center shadow-sm shadow-slate-200">
                <img src={logo} alt="Logo" className="h-10 w-10 object-contain" />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-semibold text-slate-900">Vijay Trivedi Group</h2>
                <p className="text-sm text-slate-500">Task &amp; Matter Management Suite</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white/90 shadow-xl shadow-slate-200/70 backdrop-blur-sm">
              <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-400 rounded-t-2xl" />
              <div className="p-6 sm:p-8 lg:p-10 space-y-8">{children}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
