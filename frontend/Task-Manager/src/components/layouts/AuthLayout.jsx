import React from "react";
import logo from "../../assets/images/logo.png";

const AuthLayout = ({ children }) => {
  return (
    <div className="relative min-h-screen bg-gradient-to-br from-[#eaf3ff] via-[#f5f9ff] to-[#eef6ff] text-slate-900">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-80 mix-blend-overlay bg-[radial-gradient(circle_at_20%_20%,rgba(61,154,248,0.14),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(59,87,255,0.12),transparent_30%),radial-gradient(circle_at_50%_100%,rgba(14,165,233,0.14),transparent_32%)]"
      />

      <div className="relative z-10 flex min-h-screen flex-col lg:flex-row">
        {/* Brand Side */}
        <div className="hidden lg:flex lg:w-5/12 xl:w-1/2 bg-slate-900 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-indigo-900 to-primary-700 opacity-95" />
          <div className="absolute inset-0 opacity-45 bg-[radial-gradient(circle_640px_at_18%_22%,rgba(255,255,255,0.2),transparent_36%),radial-gradient(circle_520px_at_82%_12%,rgba(255,255,255,0.18),transparent_30%),radial-gradient(circle_520px_at_50%_82%,rgba(255,255,255,0.12),transparent_32%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[length:120px_120px] opacity-15" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.12)_1px,transparent_0)] bg-[length:18px_18px] opacity-15 mix-blend-screen" />
          <div className="pointer-events-none absolute -left-20 top-10 h-72 w-72 rounded-full bg-gradient-to-br from-white/10 via-indigo-300/20 to-cyan-200/20 blur-3xl opacity-70 animate-[gentle-float_14s_ease-in-out_infinite]" />
          <div className="pointer-events-none absolute -right-28 bottom-0 h-80 w-80 rounded-full bg-gradient-to-tr from-cyan-300/20 via-indigo-400/24 to-purple-400/18 blur-[110px] opacity-80" />

          <div className="relative z-10 flex h-full w-full flex-col justify-between p-12 xl:p-14">
            <div className="flex items-center gap-4">
              <img
                src={logo}
                alt="Logo"
                className="h-[84px] w-[84px] object-contain drop-shadow-[0_8px_22px_rgba(0,0,0,0.32)]"
              />
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.28em] text-indigo-100/80 font-semibold">
                  Vijay Trivedi Group
                </p>
                <p className="text-sm text-indigo-100/70">Task &amp; Matter Management Suite</p>
              </div>
            </div>

            <div className="space-y-6 max-w-xl">
              <h1 className="text-5xl font-bold leading-tight tracking-tight text-white">
                <span className="block text-gradient">Lead every task with confident clarity</span>
                <span className="mt-2 block text-indigo-100 font-semibold">
                  Keep work visible, accountable, and calm for every role.
                </span>
              </h1>
              <p className="text-indigo-100/80 text-lg leading-relaxed max-w-md font-light">
                A luminous command center for teams who need decisive updates, timely approvals, and a shared rhythm.
              </p>
            </div>

            <div className="space-y-4">
              <div className="inline-flex items-center gap-3 rounded-full bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-indigo-100/90 shadow-lg shadow-indigo-950/30 ring-1 ring-white/15">
                Trusted access | Role-based clarity
              </div>
              <p className="text-xs text-indigo-100/60 font-medium tracking-wide">
                &copy; 2025 Vijay Trivedi Group. All rights reserved.
              </p>
            </div>
          </div>
        </div>

        {/* Form Side */}
        <div className="flex-1 flex items-center justify-center px-6 py-10 sm:px-10 lg:px-16 xl:px-20">
          <div className="relative w-full max-w-xl space-y-8">
            <div className="lg:hidden flex flex-col items-center gap-3 text-center">
              <img src={logo} alt="Logo" className="h-24 w-24 object-contain drop-shadow-sm" />
              <div className="space-y-1">
                <h2 className="text-xl font-semibold text-slate-900">Vijay Trivedi Group</h2>
                <p className="text-sm text-slate-500">Task &amp; Matter Management Suite</p>
              </div>
            </div>

            <div className="relative motion-safe:animate-[card-fade_0.75s_ease-out]">
              <div className="pointer-events-none absolute -inset-4 rounded-[32px] bg-gradient-to-br from-indigo-200/50 via-primary-100/50 to-cyan-100/50 blur-2xl opacity-80 animate-[gentle-float_16s_ease-in-out_infinite]" />
              <div className="relative rounded-[28px] border border-slate-100/90 bg-white/95 shadow-[0_36px_110px_rgba(15,23,42,0.16)] backdrop-blur-xl ring-1 ring-white/70">
                <div className="h-1.5 w-full bg-gradient-to-r from-indigo-600 via-primary-600 to-cyan-400 rounded-t-[28px]" />
                <div className="p-6 sm:p-8 lg:p-10 space-y-8">{children}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;



