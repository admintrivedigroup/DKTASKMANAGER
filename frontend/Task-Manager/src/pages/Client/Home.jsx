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
        accent: "bg-indigo-50 text-indigo-600",
        action: () => navigate("/client/projects"),
        cta: "View matters",
      },
      {
        id: "documents",
        title: "Matter Documents",
        description: "Securely access filings, briefs, and supporting records shared with your team.",
        icon: LuFileText,
        accent: "bg-violet-50 text-violet-600",
        disabled: true,
        cta: "Coming soon",
      },
      {
        id: "invoices",
        title: "Invoices",
        description: "Review statements, payment history, and upcoming retainers with clarity.",
        icon: LuReceipt,
        accent: "bg-amber-50 text-amber-600",
        action: () => navigate("/client/invoices"),
        cta: "View invoices",
      },
      {
        id: "calendar",
        title: "Calendar",
        description: "Stay ahead with synced hearings, deadlines, and key follow-ups across matters.",
        icon: LuCalendarDays,
        accent: "bg-emerald-50 text-emerald-600",
        disabled: true,
        cta: "Coming soon",
      },
      {
        id: "contact",
        title: "Reach Us",
        description: "Need help? Connect with your client success partner directly from the workspace.",
        icon: LuPhoneCall,
        accent: "bg-blue-50 text-blue-600",
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
      <section className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-600">
            <LuSparkles className="h-3.5 w-3.5" />
            Welcome back
          </div>
          <h1 className="mt-4 text-3xl font-bold text-slate-900 sm:text-4xl">
            Good to see you, {firstName}.
          </h1>
          <p className="mt-3 max-w-2xl text-base text-slate-600">
            Everything you need to stay aligned on progress, documents, and next steps lives here. Jump straight into your matters or explore what&apos;s coming next for clients.
          </p>
        </div>
        
        <div className="flex gap-3">
          <span className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600 shadow-sm">
            Client Workspace
          </span>
          <span className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600 shadow-sm">
            Secure Access
          </span>
        </div>
      </section>

      <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => handleCardClick(card)}
              className={`group relative flex h-full min-h-[200px] flex-col justify-between gap-6 overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${
                card.disabled ? "cursor-not-allowed opacity-75" : "cursor-pointer"
              }`}
            >
              <div className="flex items-start gap-4">
                <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${card.accent}`}>
                  <Icon className="h-6 w-6" />
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {card.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">
                    {card.description}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                <span className="text-sm font-medium text-indigo-600 group-hover:text-indigo-700">
                  {card.cta}
                </span>
                <LuArrowUpRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-indigo-600" />
              </div>

              {card.disabled && (
                <span className="absolute right-4 top-4 inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Soon
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