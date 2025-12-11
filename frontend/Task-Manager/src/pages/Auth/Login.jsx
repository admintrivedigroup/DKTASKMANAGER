import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import AuthLayout from "../../components/layouts/AuthLayout";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import { UserContext } from "../../context/userContext.jsx";
import Input from "../../components/inputs/input";
import { getStoredTokenPreference, getToken } from "../../utils/tokenStorage";
import { getDefaultRouteForRole } from "../../utils/roleUtils";
import {
  LuArrowRight,
  LuEye,
  LuEyeOff,
  LuLock,
  LuMail,
  LuShieldCheck,
} from "react-icons/lu";

const FOCUSABLE_SELECTORS =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const useModalAccessibility = (isOpen, dialogRef, onClose) => {
  useEffect(() => {
    if (!isOpen || typeof document === "undefined") {
      return undefined;
    }

    const dialogNode = dialogRef.current;

    if (!dialogNode) {
      return undefined;
    }

    const previouslyFocusedElement = document.activeElement;

    const getFocusableElements = () => {
      if (!dialogRef.current) {
        return [];
      }

      return Array.from(
        dialogRef.current.querySelectorAll(FOCUSABLE_SELECTORS)
      ).filter((element) => !element.hasAttribute("disabled"));
    };

    const focusableElements = getFocusableElements();
    const firstFocusableElement = focusableElements[0];

    if (firstFocusableElement && typeof firstFocusableElement.focus === "function") {
      firstFocusableElement.focus({ preventScroll: true });
    } else if (typeof dialogNode.focus === "function") {
      dialogNode.focus({ preventScroll: true });
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && typeof onClose === "function") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusable = getFocusableElements();

      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const isShiftPressed = event.shiftKey;
      const activeElement = document.activeElement;

      if (isShiftPressed) {
        if (activeElement === first || !dialogNode.contains(activeElement)) {
          event.preventDefault();
          last.focus({ preventScroll: true });
        }
      } else if (activeElement === last) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      }
    };

    dialogNode.addEventListener("keydown", handleKeyDown);

    return () => {
      dialogNode.removeEventListener("keydown", handleKeyDown);
      if (
        previouslyFocusedElement &&
        typeof previouslyFocusedElement.focus === "function"
      ) {
        previouslyFocusedElement.focus({ preventScroll: true });
      }
    };
  }, [dialogRef, isOpen, onClose]);
};

const createInitialAdminTokenResetForm = () => ({
  email: "",
  adminInviteToken: "",
  newPassword: "",
  confirmPassword: "",
});

const FloatingField = ({
  id,
  label,
  type = "text",
  value,
  onChange,
  icon: Icon,
  autoComplete,
  ...props
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const isPassword = type === "password";
  const resolvedType = isPassword && isVisible ? "text" : type;

  return (
    <div className="group relative">
      <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition duration-200 group-focus-within:text-indigo-500">
        {Icon ? <Icon className="h-5 w-5" /> : null}
      </div>

      <input
        id={id}
        name={id}
        type={resolvedType}
        value={value}
        onChange={onChange}
        placeholder=" "
        autoComplete={autoComplete}
        className="peer w-full rounded-2xl border border-slate-200/70 bg-white/90 px-12 pt-4 pb-2 text-sm font-semibold text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_12px_36px_rgba(15,23,42,0.08)] outline-none transition-all duration-200 hover:border-indigo-400/80 focus:border-transparent focus:bg-white focus:shadow-[inset_0_-2px_0_rgba(79,70,229,0.55),0_14px_36px_rgba(79,70,229,0.12),0_0_0_6px_rgba(79,70,229,0.08)] focus:ring-0 focus:animate-[focus-soft_0.6s_ease-out]"
        {...props}
      />

      <label
        htmlFor={id}
        className="pointer-events-none absolute left-12 top-3 text-sm font-semibold text-slate-500 transition-all duration-200 ease-out peer-placeholder-shown:top-3 peer-placeholder-shown:text-sm peer-placeholder-shown:font-medium peer-focus:-top-2 peer-focus:text-xs peer-focus:font-semibold peer-focus:text-indigo-600 peer-[&:not(:placeholder-shown)]:-top-2 peer-[&:not(:placeholder-shown)]:text-xs peer-[&:not(:placeholder-shown)]:font-semibold peer-[&:not(:placeholder-shown)]:text-indigo-700"
      >
        {label}
      </label>

      {isPassword && (
        <button
          type="button"
          onClick={() => setIsVisible((prev) => !prev)}
          className={`absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-slate-400 shadow-sm ring-1 ring-slate-200 transition duration-200 hover:scale-105 hover:text-indigo-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 ${
            isVisible ? "scale-105 text-indigo-600" : ""
          }`}
          aria-label={isVisible ? "Hide password" : "Show password"}
        >
          {isVisible ? <LuEye className="h-4 w-4" /> : <LuEyeOff className="h-4 w-4" />}
        </button>
      )}
    </div>
  );
};

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(() => getStoredTokenPreference() === "local");
  const [error, setError] = useState(null);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [changePasswordForm, setChangePasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [changePasswordError, setChangePasswordError] = useState(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);  
  const [pendingRoleRedirect, setPendingRoleRedirect] = useState(null);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [showAdminTokenResetForm, setShowAdminTokenResetForm] = useState(false);
  const [adminTokenResetForm, setAdminTokenResetForm] = useState(() => createInitialAdminTokenResetForm());
  const [adminTokenResetError, setAdminTokenResetError] = useState(null);
  const [adminTokenResetSuccess, setAdminTokenResetSuccess] = useState(null);
  const [isResettingPasswordWithToken, setIsResettingPasswordWithToken] = useState(false);  
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const forgotPasswordDialogRef = useRef(null);
  const changePasswordDialogRef = useRef(null);  

  const { updateUser, clearUser } = useContext(UserContext);
  const navigate = useNavigate();

  const handleCloseForgotPasswordModal = useCallback(() => {
    setShowForgotPasswordModal(false);
    setShowAdminTokenResetForm(false);
    setAdminTokenResetForm(createInitialAdminTokenResetForm());
    setAdminTokenResetError(null);
    setAdminTokenResetSuccess(null);
    setIsResettingPasswordWithToken(false);    
  }, []);

  const handleCloseChangePasswordModal = useCallback(() => {
    setShowChangePasswordModal(false);
    setChangePasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    setPendingRoleRedirect(null);
    clearUser();
  }, [clearUser]);

  const handleOpenAdminTokenResetForm = () => {
    setShowAdminTokenResetForm(true);
    setAdminTokenResetError(null);
    setAdminTokenResetSuccess(null);
    setAdminTokenResetForm((prev) => ({
      ...prev,
      email: prev.email || email,
    }));
  };

  const handleBackToForgotPasswordOptions = () => {
    setShowAdminTokenResetForm(false);
    setAdminTokenResetError(null);
    setAdminTokenResetSuccess(null);
    setIsResettingPasswordWithToken(false);
    setAdminTokenResetForm((prev) => ({
      ...prev,
      adminInviteToken: "",
      newPassword: "",
      confirmPassword: "",
    }));
  };

  useModalAccessibility(showForgotPasswordModal, forgotPasswordDialogRef, handleCloseForgotPasswordModal);
  useModalAccessibility(showChangePasswordModal, changePasswordDialogRef, handleCloseChangePasswordModal);

  // Email validation function
  const isValidEmail = (email) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  };

  const handleAdminTokenResetInput = ({ target: { name, value } }) => {
    setAdminTokenResetForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAdminTokenPasswordReset = async (event) => {
    event.preventDefault();

    if (isResettingPasswordWithToken) {
      return;
    }

    setAdminTokenResetError(null);
    setAdminTokenResetSuccess(null);

    const trimmedEmail = adminTokenResetForm.email.trim();
    const trimmedToken = adminTokenResetForm.adminInviteToken.trim();

    if (!trimmedEmail) {
      setAdminTokenResetError("Please enter the email address associated with your account.");
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      setAdminTokenResetError("Please enter a valid email address.");
      return;
    }

    if (!trimmedToken) {
      setAdminTokenResetError("Please enter the admin invite token provided by your administrator.");
      return;
    }

    if (!adminTokenResetForm.newPassword.trim()) {
      setAdminTokenResetError("Please provide a new password.");
      return;
    }

    if (adminTokenResetForm.newPassword !== adminTokenResetForm.confirmPassword) {
      setAdminTokenResetError("New password and confirm password do not match.");
      return;
    }

    try {
      setIsResettingPasswordWithToken(true);
      await axiosInstance.post(API_PATHS.AUTH.RESET_WITH_ADMIN_TOKEN, {
        email: trimmedEmail,
        newPassword: adminTokenResetForm.newPassword,
        adminInviteToken: trimmedToken,
      });

      setAdminTokenResetSuccess("Your password has been reset. You can now sign in with your new password.");
      setAdminTokenResetForm((prev) => ({
        ...prev,
        adminInviteToken: "",
        newPassword: "",
        confirmPassword: "",
      }));
    } catch (error) {
      if (error.response?.data?.message) {
        setAdminTokenResetError(error.response.data.message);
      } else {
        setAdminTokenResetError("Failed to reset password. Please try again.");
      }
    } finally {
      setIsResettingPasswordWithToken(false);
    }
  };

  // Handle Login Form Submit
  const handleLogin = async (e) => {
    e.preventDefault();

    if (isLoggingIn) {
      return;
    }

    // Clear previous errors
    setError(null);
    
    // Validate email
    if (!email.trim()) {
      setError("Please enter an email address.");
      return;
    }
    
    if (!isValidEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    
    // Validate password
    if (!password.trim()) {
      setError("Please enter a password.");
      return;
    }
    
    
    try {
      setIsLoggingIn(true);
      const response = await axiosInstance.post(API_PATHS.AUTH.LOGIN, {
        email,
        password,
      });

      const { token, role, mustChangePassword } = response.data;

      if (token) {
        updateUser(response.data, { rememberMe });
      
     if (mustChangePassword) {
          setPendingRoleRedirect(role);
          setShowChangePasswordModal(true);
        } else {
          // Redirect based on role
          const destination = getDefaultRouteForRole(role);
          navigate(destination);
        }
      }
    } catch (error) {
      if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setIsLoggingIn(false);      
    }
  };

  const handleChangePasswordInput = ({ target: { name, value } }) => {
    setChangePasswordForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleForcePasswordChange = async (event) => {
    event.preventDefault();
    if (isChangingPassword) return;

    setChangePasswordError(null);

    if (!changePasswordForm.currentPassword || !changePasswordForm.newPassword || !changePasswordForm.confirmPassword) {
      setChangePasswordError("Please complete all fields.");
      return;
    }

    if (changePasswordForm.newPassword !== changePasswordForm.confirmPassword) {
      setChangePasswordError("New password and confirm password do not match.");
      return;
    }

    try {
      setIsChangingPassword(true);
      await axiosInstance.put(API_PATHS.PROFILE.CHANGE_PASSWORD, {
        currentPassword: changePasswordForm.currentPassword,
        newPassword: changePasswordForm.newPassword,
      });

      const profileResponse = await axiosInstance.get(API_PATHS.AUTH.GET_PROFILE);
      const token = getToken();
      updateUser({ ...profileResponse.data, token });

      setShowChangePasswordModal(false);
      setChangePasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });

      const role = pendingRoleRedirect || profileResponse?.data?.role;
      setPendingRoleRedirect(null);
      const destination = getDefaultRouteForRole(role);
      navigate(destination);
    } catch (error) {
      if (error.response && error.response.data?.message) {
        setChangePasswordError(error.response.data.message);
      } else {
        setChangePasswordError("Failed to update password. Please try again.");
      }
    } finally {
      setIsChangingPassword(false);      
    }
  };

  return (
    <AuthLayout>
      <>
      <div className="relative space-y-6 overflow-hidden rounded-3xl">
        <div className="pointer-events-none absolute -left-16 top-6 h-40 w-40 rounded-full bg-indigo-200/60 blur-3xl opacity-50 animate-[gentle-float_9s_ease-in-out_infinite]" />
        <div className="pointer-events-none absolute -right-10 bottom-0 h-36 w-36 rounded-full bg-cyan-200/50 blur-3xl opacity-50 animate-[gentle-float_12s_ease-in-out_infinite]" />

        <div className="space-y-3 relative z-10 motion-safe:animate-[rise-up_0.8s_ease-out]">
          <div className="relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-gradient-to-r from-indigo-500/70 via-primary-500/70 to-cyan-400/70 p-[1px] shadow-[0_10px_26px_rgba(79,70,229,0.24)] ring-1 ring-white/70 backdrop-blur">
            <div className="flex items-center gap-2 rounded-full bg-white/75 px-4 py-2 text-xs font-semibold text-indigo-800 shadow-inner ring-1 ring-white/80 backdrop-blur">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-cyan-400 text-white shadow-md ring-1 ring-white/50 motion-safe:animate-[lock-bounce_2.2s_ease-in-out_infinite]">
                <LuLock className="h-3.5 w-3.5" />
              </span>
              Secured workspace sign in
            </div>
          </div>
          <div className="space-y-3">
            <h3 className="text-3xl font-bold tracking-tight text-slate-900 leading-tight">
              Welcome back
            </h3>
            <div className="h-[6px] w-28 rounded-full bg-gradient-to-r from-indigo-500 via-primary-500 to-cyan-400 shadow-[0_8px_30px_rgba(79,70,229,0.35)]" />
            <p className="max-w-xl text-sm leading-relaxed text-slate-500">
              It&apos;s great to see you. Sign in to keep projects synchronized, approvals on track, and teams moving.
            </p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="relative z-10 mt-6 space-y-5 motion-safe:animate-[rise-up_0.9s_ease-out]">
          <FloatingField
            id="email"
            label="Work email"
            type="email"
            value={email}
            onChange={({ target }) => setEmail(target.value)}
            autoComplete="email"
            icon={LuMail}
          />

          <FloatingField
            id="password"
            label="Password"
            type="password"
            value={password}
            onChange={({ target }) => setPassword(target.value)}
            autoComplete="current-password"
            icon={LuLock}
          />

          <div className="flex flex-col gap-3 rounded-2xl border border-slate-100/80 bg-slate-50/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={({ target }) => setRememberMe(target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-200"
              />
              Remember this device
            </label>
            <button
              type="button"
              onClick={() => setShowForgotPasswordModal(true)}
              className="text-sm font-semibold text-indigo-600 transition hover:text-indigo-500"
            >
              Forgot password?
            </button>
          </div>

          {error && (
            <div
              className="rounded-2xl border border-rose-200 bg-rose-50/90 px-4 py-3 text-sm text-rose-600 shadow-sm backdrop-blur"
              role="alert"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            className="group relative inline-flex w-full items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-primary-500 to-cyan-400 px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(79,70,229,0.35)] transition duration-200 hover:scale-[1.01] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isLoggingIn}
            aria-busy={isLoggingIn}
          >
            <span className="absolute inset-0 opacity-0 transition duration-300 group-hover:opacity-20 bg-gradient-to-r from-white/20 via-transparent to-white/5" />
            {isLoggingIn ? (
              <>
                <svg
                  className="h-4 w-4 animate-spin text-white"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-30"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-70"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  />
                </svg>
                <span className="ml-2">Signing in...</span>
              </>
            ) : (
              <>
                Sign in
                <LuArrowRight className="ml-2 h-4 w-4 transition duration-150 group-hover:translate-x-1" />
              </>
            )}
          </button>
        </form>

        <div className="relative z-10 space-y-2 text-center text-xs text-slate-500 motion-safe:animate-[rise-up_1s_ease-out]">
          <p>By continuing you agree to workspace security policies and data use standards.</p>
          <p className="font-semibold text-slate-600">
            Need access? Contact your admin for an invitation.
          </p>
        </div>
      </div>
        {showForgotPasswordModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4">
             <div
              ref={forgotPasswordDialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="forgot-password-title"
              aria-describedby="forgot-password-description"
              tabIndex={-1}
              className="w-full max-w-sm rounded-3xl bg-white p-6 text-left shadow-xl"
            >
              <h3 id="forgot-password-title" className="text-lg font-semibold text-slate-900">
                {showAdminTokenResetForm ? "Reset your password" : "Need a password reset?"}
              </h3>
              <p id="forgot-password-description" className="mt-2 text-sm text-slate-600">
                {showAdminTokenResetForm
                  ? "Enter the email tied to your account along with the admin invite token (IF PROVIDED) to create a new password."
                  : "Please contact your administrator to update or reset your password, or use an admin invite token if you have one."}
              </p>

              {showAdminTokenResetForm ? (
                <>
                  {adminTokenResetError && (
                    <div
                      className="mt-4 rounded-2xl border border-rose-200 bg-rose-50/80 px-4 py-3 text-sm text-rose-600 shadow-sm"
                      role="alert"
                    >
                      {adminTokenResetError}
                    </div>
                  )}

                  {adminTokenResetSuccess && (
                    <div
                      className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-600 shadow-sm"
                      role="status"
                    >
                      {adminTokenResetSuccess}
                    </div>
                  )}

                  <form className="mt-6 space-y-4" onSubmit={handleAdminTokenPasswordReset}>
                    <Input
                      id="resetEmail"
                      name="email"
                      value={adminTokenResetForm.email}
                      onChange={handleAdminTokenResetInput}
                      label="Email Address"
                      placeholder="you@company.com"
                      type="email"
                      autoComplete="email"
                    />

                    <Input
                      id="adminInviteToken"
                      name="adminInviteToken"
                      value={adminTokenResetForm.adminInviteToken}
                      onChange={handleAdminTokenResetInput}
                      label="Admin Invite Token"
                      placeholder="Enter the admin invite token"
                      autoComplete="one-time-code"
                    />

                    <Input
                      id="resetNewPassword"
                      name="newPassword"
                      value={adminTokenResetForm.newPassword}
                      onChange={handleAdminTokenResetInput}
                      label="New Password"
                      placeholder="Create a new password"
                      type="password"
                      autoComplete="new-password"
                    />

                    <Input
                      id="resetConfirmPassword"
                      name="confirmPassword"
                      value={adminTokenResetForm.confirmPassword}
                      onChange={handleAdminTokenResetInput}
                      label="Confirm Password"
                      placeholder="Re-enter the new password"
                      type="password"
                      autoComplete="new-password"
                    />

                    <div className="mt-6 flex flex-col gap-3">
                      <button
                        type="submit"
                        className="auth-submit flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-70"
                        disabled={isResettingPasswordWithToken}
                        aria-busy={isResettingPasswordWithToken}
                      >
                        {isResettingPasswordWithToken ? (
                          <>
                            <svg
                              className="h-4 w-4 animate-spin text-white"
                              viewBox="0 0 24 24"
                              aria-hidden="true"
                            >
                              <circle
                                className="opacity-30"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                                fill="none"
                              />
                              <path
                                className="opacity-70"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                              />
                            </svg>
                            Resetting password...
                          </>
                        ) : (
                          "Reset password"
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleBackToForgotPasswordOptions}
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-700"
                        disabled={isResettingPasswordWithToken}
                      >
                        Back
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <div className="mt-6 space-y-3 text-center">
                  <button
                    type="button"
                    onClick={handleOpenAdminTokenResetForm}
                    className="w-full rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-600 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-100 hover:text-indigo-700"
                  >
                    I have an admin invite token
                  </button>

                  <button
                    type="button"
                    onClick={handleCloseForgotPasswordModal}
                    className="w-full rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_25px_rgba(79,70,229,0.35)] transition hover:bg-indigo-500"
                  >
                    Got it
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
        {showChangePasswordModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4">
            <div
              ref={changePasswordDialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="change-password-title"
              aria-describedby="change-password-description"
              tabIndex={-1}
              className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl"
            >
              <h3 id="change-password-title" className="text-lg font-semibold text-slate-900">
                Update your password
              </h3>
              <p id="change-password-description" className="mt-1 text-sm text-slate-500">
                For security, please replace the temporary password provided by your admin with one of your own.
              </p>

              <form className="mt-6 space-y-4" onSubmit={handleForcePasswordChange}>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500" htmlFor="currentPassword">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      id="currentPassword"
                      name="currentPassword"
                      type={showCurrentPassword ? "text" : "password"}
                      value={changePasswordForm.currentPassword}
                      onChange={handleChangePasswordInput}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 pr-14 text-sm text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-4 flex items-center text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600 transition hover:text-indigo-500"
                    >
                      {showCurrentPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500" htmlFor="newPassword">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      id="newPassword"
                      name="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      value={changePasswordForm.newPassword}
                      onChange={handleChangePasswordInput}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 pr-14 text-sm text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-4 flex items-center text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600 transition hover:text-indigo-500"
                    >
                      {showNewPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500" htmlFor="confirmPassword">
                    Confirm Password
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={changePasswordForm.confirmPassword}
                    onChange={handleChangePasswordInput}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                    autoComplete="new-password"
                  />
                </div>

                {changePasswordError && (
                  <div
                    className="rounded-2xl border border-rose-200 bg-rose-50/80 px-4 py-3 text-sm text-rose-600 shadow-sm"
                    role="alert"
                  >
                    {changePasswordError}
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
                    onClick={handleCloseChangePasswordModal}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-2xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-[0_10px_25px_rgba(79,70,229,0.35)] transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-300"
                    disabled={isChangingPassword}
                  >
                    {isChangingPassword ? "Updating..." : "Save Password"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </>
    </AuthLayout>
  );
};

export default Login;
