import React from "react";

const Progress = ({ progress, status }) => {
  const getColor = () => {
    switch (status) {
      case "In Progress":
        return "bg-gradient-to-r from-sky-500 via-cyan-500 to-blue-500";

      case "Completed":
        return "bg-gradient-to-r from-emerald-500 via-lime-400 to-green-500";

      default:
        return "bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500";
    }
  };

  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-white/60">
      <div
        className={`${getColor()} h-2 rounded-full text-center text-xs font-medium transition-all duration-500`}
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};

export default Progress;
