import React from "react";

const LoadingOverlay = ({
  message = "Loading...",
  fullScreen = false,
  className = "",
}) => {
  const containerClasses = fullScreen
    ? "fixed inset-0 z-[100] flex items-center justify-center bg-white/80 backdrop-blur"
    : "flex min-h-[200px] w-full items-center justify-center";

  return (
    <div className={`${containerClasses} ${className}`.trim()}>
      <div className="flex flex-col items-center gap-4 text-slate-600">
        <span className="inline-flex h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-primary" />
        <p className="text-sm font-medium tracking-wide text-slate-600">{message}</p>
      </div>
    </div>
  );
};

export default LoadingOverlay;