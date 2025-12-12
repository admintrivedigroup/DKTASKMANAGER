import React, { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "../../utils/motionShim";
import { UserContext } from "../../context/userContext.jsx";
import { useLayoutContext } from "../../context/layoutContext.jsx";
import useKeyboardShortcuts from "../../hooks/useKeyboardShortcuts";
import useSwipe from "../../hooks/useSwipe";
import Navbar from "./Navbar";
import SideMenu from "./SideMenu";
import MobileNavigation from "./MobileNavigation";
import BirthdayModal from "../modals/BirthdayModal";
import LoadingOverlay from "../LoadingOverlay";
import ErrorBoundary from "../ErrorBoundary";
import SkipToContent from "../SkipToContent";
import Breadcrumb from "./Breadcrumb";
import CommandPalette from "../CommandPalette";
import FloatingActionButton from "../FloatingActionButton";
import { LuPlus, LuUsers } from "react-icons/lu";
import { hasPrivilegedAccess, resolvePrivilegedPath } from "../../utils/roleUtils.js";

const DashboardLayout = ({ children, activeMenu, breadcrumbs }) => {
  const { user, loading } = useContext(UserContext);
  const navigate = useNavigate();
  const {
    setActiveMenu,
    closeMobileNav,
    openMobileNav,
    isSidebarCollapsed,
    toggleSidebar,
    openCommandPalette,
  } = useLayoutContext();
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

  // Keyboard shortcuts
  useKeyboardShortcuts({
    'cmd+k': openCommandPalette,
    'cmd+b': toggleSidebar,
  });

  // Swipe gestures for mobile
  useSwipe({
    onSwipeRight: () => {
      if (window.innerWidth < 1024) {
        openMobileNav();
      }
    },
    onSwipeLeft: () => {
      if (window.innerWidth < 1024) {
        closeMobileNav();
      }
    },
  });

  // Quick actions for FAB
  const quickActions = useMemo(() => {
    if (!hasPrivilegedAccess(user?.role)) {
      return [];
    }

    const tasksPath = resolvePrivilegedPath("/admin/tasks", user?.role);
    const employeesPath = resolvePrivilegedPath("/admin/employees", user?.role);

    return [
      {
        icon: LuPlus,
        label: "New Task",
        onClick: () =>
          navigate(tasksPath, { state: { openTaskForm: true } }),
      },
      {
        icon: LuUsers,
        label: "Add User",
        onClick: () =>
          navigate(employeesPath, { state: { openCreateUser: true } }),
      },
    ];
  }, [navigate, user?.role]);

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
    <ErrorBoundary>
      <SkipToContent />
      
      <div className="relative min-h-screen bg-gradient-to-br from-[#f5f7fb] via-[#f8fbff] to-[#f0f4ff] font-sans pt-16 text-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:text-slate-50">
        {/* Animated background */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_24%,rgba(99,102,241,0.08),transparent_32%),radial-gradient(circle_at_80%_0%,rgba(56,189,248,0.08),transparent_30%),radial-gradient(circle_at_60%_110%,rgba(45,212,191,0.08),transparent_32%)] dark:bg-[radial-gradient(circle_at_20%_24%,rgba(99,102,241,0.18),transparent_32%),radial-gradient(circle_at_80%_0%,rgba(56,189,248,0.16),transparent_30%),radial-gradient(circle_at_60%_110%,rgba(15,23,42,0.32),transparent_32%)]"
        />

        <div className="relative z-20">
          <Navbar />
        </div>

        <div className="relative z-10 mx-auto flex w-full max-w-[1440px] flex-1 gap-4 px-4 py-8 sm:px-5 lg:gap-8 lg:px-8">
          {/* Sidebar with collapse animation */}
          <motion.aside
            initial={false}
            animate={{
              width: isSidebarCollapsed ? '76px' : '240px',
            }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="sticky top-20 hidden h-[calc(100vh-8rem)] shrink-0 lg:block"
          >
            <div className="h-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 shadow-[0_16px_48px_rgba(17,25,40,0.08)] backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-slate-950/40">
              <SideMenu activeMenu={activeMenu} collapsed={isSidebarCollapsed} />
            </div>
          </motion.aside>

          {/* Main content with page transitions */}
          <motion.main
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex-1 min-w-0 pb-16 lg:pb-8"
            id="main-content"
          >
            <div className="h-full rounded-2xl border border-slate-200/70 bg-white/96 px-4 py-5 shadow-[0_20px_60px_rgba(17,25,40,0.08)] backdrop-blur-sm sm:px-6 lg:px-8 dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-slate-950/45">
              {/* Breadcrumb navigation */}
              {breadcrumbs && <Breadcrumb items={breadcrumbs} />}
              
              {children}
            </div>
          </motion.main>
        </div>

        {showBirthdayModal && (
          <BirthdayModal
            name={user?.name}
            onClose={() => setShowBirthdayModal(false)}
          />
        )}

        {/* Enhanced footer */}
        <footer className="relative z-10 mt-auto border-t border-slate-200/80 bg-white/80 px-4 py-6 text-xs text-slate-500 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-400">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 text-center sm:flex-row sm:items-center sm:justify-center sm:gap-6">
            <span>&copy; 2025 Vijay Trivedi Group. All rights reserved.</span>
            <div className="flex items-center gap-4">
            <span className="hidden sm:inline">|</span>              
              <span className="text-slate-400 dark:text-slate-500">
                Developed by Hemant Ladhani (7726886835)
              </span>
              <span className="hidden sm:inline">|</span>
              <a
                href="mailto:admin@trivedigranimarmo.com"
                className="transition-colors hover:text-indigo-600 dark:hover:text-indigo-300"
              >
                Report Bug : admin@trivedigranimarmo.com
              </a>
            </div>
          </div>
        </footer>

        <div className="relative z-30">
          <MobileNavigation />
        </div>

        {/* Command Palette */}
        <CommandPalette />

        {/* Floating Action Button */}
        {quickActions.length > 0 && (
          <FloatingActionButton actions={quickActions} />
        )}
      </div>
    </ErrorBoundary>
  );
};

export default DashboardLayout;
