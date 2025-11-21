import React from "react";
import { LuPartyPopper, LuX } from "react-icons/lu";

const BirthdayModal = ({ name, onClose }) => {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 px-4 backdrop-blur-sm">
      <div className="relative w-full max-w-xl overflow-hidden rounded-[32px] border border-white/40 bg-gradient-to-br from-pink-500 via-fuchsia-500 to-indigo-500 p-[1px] shadow-[0_30px_80px_rgba(168,85,247,0.45)]">
        <div className="rounded-[30px] bg-white/95 p-8 text-center sm:p-10">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-slate-500 shadow hover:text-slate-700"
            aria-label="Close birthday message"
          >
            <LuX className="text-lg" />
          </button>

          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-400 via-pink-400 to-purple-500 text-white shadow-lg shadow-pink-200">
            <LuPartyPopper className="text-3xl" />
          </div>

          <h2 className="mt-6 text-3xl font-semibold text-slate-900 sm:text-4xl">
            Happy Birthday{ name ? `, ${name.split(" ")[0]}!` : "!" }
          </h2>

          <p className="mt-4 text-base leading-relaxed text-slate-600 sm:text-lg">
            Wishing you a day filled with joy, laughter, and all of your favourite things. May the year ahead be packed with inspiring moments and countless wins. Enjoy every second of your special day!
          </p>

          <button
            type="button"
            onClick={onClose}
            className="mt-8 inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500 px-6 py-2.5 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(236,72,153,0.45)] transition hover:opacity-90"
          >
            Thank you!
          </button>
        </div>
      </div>
    </div>
  );
};

export default BirthdayModal;