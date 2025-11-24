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
      <LoadingOverlay
        fullScreen
        message="Preparing your workspace..."
      />
    );
  }

  if (!user) {
    return (
      <LoadingOverlay
        fullScreen
        message="Redirecting to sign in..."
      />
    );
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-100 flex flex-col font-sans">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(79,70,229,0.06),transparent_32%),radial-gradient(circle_at_80%_0%,rgba(14,165,233,0.05),transparent_28%),radial-gradient(circle_at_50%_100%,rgba(15,23,42,0.06),transparent_30%)]"
      />

      <div className="relative z-10">
        <Navbar />
      </div>

      <div className="relative z-10 flex flex-1 w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-10 py-10 gap-6 lg:gap-8">
        <aside className="hidden lg:block w-72 shrink-0 sticky top-24 h-[calc(100vh-9rem)]">
          <div className="h-full rounded-2xl border border-slate-200 bg-white/85 shadow-sm shadow-slate-200/70 backdrop-blur">
            <SideMenu activeMenu={activeMenu} />
          </div>
        </aside>

        <main className="flex-1 min-w-0 pb-20 lg:pb-8">
          <div className="h-full rounded-2xl border border-slate-200 bg-white/90 shadow-md shadow-slate-200/60 backdrop-blur-sm px-4 sm:px-6 lg:px-8 py-6">
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

      <footer className="relative z-10 mt-auto bg-white/70 backdrop-blur-sm border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col gap-2 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left text-xs text-slate-500">
          <span>© 2025 Raval & Trivedi Associates. All rights reserved.</span>
          <span className="text-slate-400">Developed by Hemant Ladhani (7726886835) | Report Bug: admin@trivedigranimarmo.com</span>
        </div>
      </footer>

      <div className="relative z-20">
        <MobileNavigation />
      </div>
    </div>
  );
};

export default DashboardLayout;
