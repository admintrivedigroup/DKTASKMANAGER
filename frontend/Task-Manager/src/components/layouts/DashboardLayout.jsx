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
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar />

      <div className="flex flex-1 w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-8 gap-8">
        <aside className="hidden lg:block w-72 shrink-0 sticky top-24 h-[calc(100vh-8rem)]">
          <SideMenu activeMenu={activeMenu} />
        </aside>

        <main className="flex-1 min-w-0 pb-20 lg:pb-0">
          {children}
        </main>
      </div>
      
      {showBirthdayModal && (
        <BirthdayModal
          name={user?.name}
          onClose={() => setShowBirthdayModal(false)}
        />
      )}
      
      <footer className="py-6 text-center text-xs text-slate-500 border-t border-slate-200 mt-auto bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4">
          © 2025 Raval & Trivedi Associates. All rights reserved | Developed by Hemant Ladhani (7726886835) | Report Bug: admin@trivedigranimarmo.com
        </div>
      </footer>

      <MobileNavigation />
    </div>
  );
};

export default DashboardLayout;
