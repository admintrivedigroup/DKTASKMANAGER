import React from "react";
import { LuArrowUpDown, LuCheck } from "react-icons/lu";

import Modal from "./Modal";
import { TASK_SORT_OPTIONS } from "../utils/taskHelpers";

const TaskSortDialog = ({
  isOpen,
  onClose,
  sortMode,
  onApply,
  onReset,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Sort Tasks"
      maxWidthClass="max-w-xl"
      bodyClass="pt-5"
    >
      <div className="space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-600">
          <div className="flex items-center gap-2 font-semibold text-slate-900">
            <LuArrowUpDown className="text-base text-indigo-600" />
            Choose one global sort order
          </div>
          <p className="mt-1 text-sm text-slate-500">
            This updates the full task list, including cards, table rows, and pagination.
          </p>
        </div>

        <div className="space-y-3">
          {TASK_SORT_OPTIONS.filter((option) => option.value !== "default").map((option) => {
            const isActive = sortMode === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onApply(option.value)}
                className={`flex w-full items-start justify-between rounded-2xl border px-4 py-4 text-left transition ${
                  isActive
                    ? "border-indigo-300 bg-indigo-50 shadow-sm"
                    : "border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50"
                }`}
              >
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    {option.label}
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{option.description}</p>
                </div>
                <span
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-full border ${
                    isActive
                      ? "border-indigo-500 bg-indigo-600 text-white"
                      : "border-slate-200 bg-white text-transparent"
                  }`}
                  aria-hidden="true"
                >
                  <LuCheck className="text-sm" />
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onReset}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:text-indigo-700"
          >
            Clear sort
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default TaskSortDialog;
