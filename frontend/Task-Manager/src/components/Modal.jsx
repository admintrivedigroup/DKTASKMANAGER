import React from "react";

const Modal = ({
  children,
  isOpen,
  onClose,
  title,
  maxWidthClass = "max-w-2xl",
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed top-0 right-0 left-0 z-50 flex h-[calc(100%-1rem)] w-full max-h-full items-center justify-center overflow-x-hidden overflow-y-auto bg-black/20 bg-opacity-50">
      <div className={`relative max-h-full w-full p-4 ${maxWidthClass}`}>
      {/* Modal content */}
        <div className="relative rounded-lg bg-white shadow-sm dark:bg-gray-700">
        {/* Modal header */}
          <div className="flex items-center justify-between rounded-t border-b border-grey-200 p-4 md:p-5 dark:border-gray-600">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {title}
            </h3>

            <button
              type="button"
              className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg bg-transparent text-sm text-gray-400 hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-600 dark:hover:text-white"
              onClick={onClose}
            >
              <svg
                className="h-3 w-3"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 14 14"
              >
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="m1 1 6 6m0 0 6-6M7 7l6 6"
                />
              </svg>
            </button>
          </div>

          {/* Modal Body */}
          <div className="space-y-4 p-4 md:p-5">{children}</div>
        </div>
      </div>
    </div>
  );
};

export default Modal;