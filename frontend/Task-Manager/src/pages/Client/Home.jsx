import React, { useContext, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  LuCalendarDays,
  LuFileText,
  LuFolderTree,
  LuPhoneCall,
  LuReceipt,
  LuSparkles,
  LuArrowUpRight,
} from "react-icons/lu";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import { UserContext } from "../../context/userContext.jsx";
import toast from "react-hot-toast";

const ClientHome = () => {
  const navigate = useNavigate();
  const { user } = useContext(UserContext);

  const firstName = useMemo(() => {
    if (!user?.name || typeof user.name !== "string") {
      return "there";
    }

    const parts = user.name.trim().split(/\s+/);
    return parts.length ? parts[0] : "there";
  }, [user?.name]);

  const cards = useMemo(
    () => [
      {
        id: "matters",
        title: "My Matters",
        description: "Track every case file, milestones, and responsibilities in one collaborative view.",
        icon: LuFolderTree,
        accent: "from-indigo-500 via-sky-500 to-cyan-400",
        action: () => navigate("/client/projects"),
        cta: "View matters",
      },
      {
        id: "documents",
        title: "Matter Documents",
        description: "Securely access filings, briefs, and supporting records shared with your team.",
        icon: LuFileText,
        accent: "from-violet-500 via-purple-500 to-fuchsia-400",
        disabled: true,
        cta: "Coming soon",
      },
      {
        id: "invoices",
        title: "Invoices",
        description: "Review statements, payment history, and upcoming retainers with clarity.",
        icon: LuReceipt,
        accent: "from-amber-500 via-orange-500 to-rose-400",
        action: () => navigate("/client/invoices"),
        cta: "View invoices",
      },
      {
        id: "calendar",
        title: "Calendar",
        description: "Stay ahead with synced hearings, deadlines, and key follow-ups across matters.",
        icon: LuCalendarDays,
        accent: "from-emerald-500 via-teal-500 to-cyan-400",
        disabled: true,
        cta: "Coming soon",
      },
      {
        id: "contact",
        title: "Reach Us",
        description: "Need help? Connect with your client success partner directly from the workspace.",
        icon: LuPhoneCall,
        accent: "from-blue-500 via-indigo-500 to-purple-500",
        action: () => {
          if (typeof window !== "undefined") {
            window.open(
              "https://www.ravalandtrivediassociates.com/contact",
              "_blank",
              "noopener,noreferrer"
            );
          }
        },
        cta: "Visit contact page",
      },
    ],
    [navigate]
  );

  const handleCardClick = (card) => {
    if (card.disabled) {
      toast.dismiss();
      toast(card.comingSoonMessage || "This space is almost ready. Stay tuned!");
      return;
    }

    if (typeof card.action === "function") {
      card.action();
    }
  };

  return (
    <DashboardLayout activeMenu="Home">
      <section className="relative overflow-hidden rounded-[32px] border border-white/60 bg-gradient-to-br from-slate-900 via-indigo-800 to-sky-700 px-4 py-8 text-white shadow-[0_24px_50px_rgba(30,64,175,0.35)] sm:px-7 sm:py-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.16),_transparent_65%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_rgba(56,189,248,0.18),_transparent_55%)]" />
        <div className="relative flex flex-col gap-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1 text-xs font-medium tracking-[0.28em] uppercase text-white/70">
            <LuSparkles className="h-3.5 w-3.5" />
            Welcome back
          </div>
          <div>
            <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
              Good to see you, {firstName}.
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-white/75">
              Everything you need to stay aligned on progress, documents, and next steps lives here. Jump straight into your matters or explore what&apos;s coming next for clients.
            </p>
          </div>
          <div className="inline-flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.34em] text-white/60">
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">Client Workspace</span>
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">Secure Access</span>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => handleCardClick(card)}
              className={`group relative flex h-full min-h-[180px] flex-col justify-between gap-4 overflow-hidden rounded-[28px] border border-white/60 bg-white/70 p-5 text-left transition duration-200 hover:-translate-y-1 hover:border-transparent hover:shadow-[0_26px_60px_rgba(15,23,42,0.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-400 dark:border-slate-800/70 dark:bg-slate-900/70 ${
                card.disabled ? "cursor-not-allowed opacity-80" : "cursor-pointer"
              }`}
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none absolute inset-0 -z-10 opacity-0 transition duration-300 group-hover:opacity-100 ${
                  card.disabled ? "" : `bg-gradient-to-br ${card.accent} blur-[2px]`
                }`}
              />
              <div className="flex items-center gap-4">
                <span className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-white/70 bg-white/70 shadow-[0_18px_40px_rgba(15,23,42,0.12)] dark:border-slate-700/70 dark:bg-slate-800/80">
                  <span
                    aria-hidden="true"
                    className={`absolute inset-0 -z-10 bg-gradient-to-br ${card.accent} opacity-80`}
                  />
                  <Icon className="relative text-xl text-white" />
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 transition-colors duration-200 dark:text-slate-100">
                    {card.title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-500 transition-colors duration-200 dark:text-slate-400">
                    {card.description}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm font-semibold text-indigo-600 transition-colors duration-200 group-hover:text-indigo-700 dark:text-indigo-300 dark:group-hover:text-indigo-200">
                <span>{card.cta}</span>
                <LuArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </div>
              {card.disabled && (
                <span className="absolute right-4 top-4 inline-flex items-center rounded-full border border-amber-200 bg-amber-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-amber-600 shadow-sm">
                  Preview
                </span>
              )}
            </button>
          );
        })}
      </section>
    </DashboardLayout>
  );
};

export default ClientHome;