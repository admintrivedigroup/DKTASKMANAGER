import React, { useContext, useEffect, useMemo, useState } from "react";
import { UserContext } from "../../context/userContext.jsx";
import { useLayoutContext } from "../../context/layoutContext.jsx";
import Navbar from "./Navbar";
import SideMenu from "./SideMenu";
import MobileNavigation from "./MobileNavigation";
import BirthdayModal from "../modals/BirthdayModal";
import LoadingOverlay from "../LoadingOverlay";

const DashboardLayout = ({ children, activeMenu }) => {
  const { user, loading } = useContext(UserContext);
  const { setActiveMenu, closeMobileNav } = useLayoutContext();
  const [showBirthdayModal, setShowBirthdayModal] = useState(false);

  const shouldShowBirthday = useMemo(() => {
    if (!user?.birthdate) {
      return false;
    }

    const birthDate = new Date(user.birthdate);
    if (Number.isNaN(birthDate.getTime())) {
      return false;
    }

    const today = new Date();
    return (
      birthDate.getDate() === today.getDate() &&
      birthDate.getMonth() === today.getMonth()
    );
  }, [user?.birthdate]);

  useEffect(() => {
    if (!shouldShowBirthday || !user?._id) {
      setShowBirthdayModal(false);
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    const storageKey = `birthdayShown:${user._id}`;
    const todayKey = new Date().toISOString().slice(0, 10);
    const alreadyShown = window.localStorage.getItem(storageKey);

    if (alreadyShown === todayKey) {
      setShowBirthdayModal(false);
      return;
    }

    window.localStorage.setItem(storageKey, todayKey);
    setShowBirthdayModal(true);
  }, [shouldShowBirthday, user?._id]);

  useEffect(() => {
    setActiveMenu(activeMenu || "");
  }, [activeMenu, setActiveMenu]);

  useEffect(() => {
    closeMobileNav();
  }, [closeMobileNav]);

  if (loading) {
    return (
      <LoadingOverlay fullScreen message="Preparing your workspace..." />
    );
  }

  if (!user) {
    return (
      <LoadingOverlay fullScreen message="Redirecting to sign in..." />
    );
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-100 font-sans pt-20 text-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:text-slate-50">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(79,70,229,0.06),transparent_32%),radial-gradient(circle_at_80%_0%,rgba(14,165,233,0.05),transparent_28%),radial-gradient(circle_at_50%_100%,rgba(15,23,42,0.06),transparent_30%)] dark:bg-[radial-gradient(circle_at_20%_20%,rgba(79,70,229,0.12),transparent_30%),radial-gradient(circle_at_80%_0%,rgba(14,165,233,0.1),transparent_26%),radial-gradient(circle_at_50%_100%,rgba(15,23,42,0.25),transparent_34%)]"
      />

      <div className="relative z-20">
        <Navbar />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-[1920px] flex-1 gap-6 px-4 py-10 sm:px-6 lg:gap-8 lg:px-10">
        <aside className="sticky top-24 hidden h-[calc(100vh-9rem)] w-72 shrink-0 lg:block">
          <div className="h-full rounded-2xl border border-slate-200 bg-white/85 shadow-sm shadow-slate-200/70 backdrop-blur dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-slate-950/40">
            <SideMenu activeMenu={activeMenu} />
          </div>
        </aside>

        <main className="flex-1 min-w-0 pb-20 lg:pb-8">
          <div className="h-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-6 shadow-md shadow-slate-200/60 backdrop-blur-sm sm:px-6 lg:px-8 dark:border-slate-800 dark:bg-slate-900/75 dark:shadow-slate-950/40">
            {children}
          </div>
        </main>
      </div>

      {showBirthdayModal && (
        <BirthdayModal
          name={user?.name}
          onClose={() => setShowBirthdayModal(false)}
        />
      )}

      <footer className="relative z-10 mt-auto border-t border-slate-200 bg-white/70 px-4 py-6 text-xs text-slate-500 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-400">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <span>© 2025 Raval & Trivedi Associates. All rights reserved.</span>
          <span className="text-slate-400 dark:text-slate-500">
            Developed by Hemant Ladhani (7726886835) | Report Bug: admin@trivedigranimarmo.com
          </span>
        </div>
      </footer>

      <div className="relative z-30">
        <MobileNavigation />
      </div>
    </div>
  );
};

export default DashboardLayout;
