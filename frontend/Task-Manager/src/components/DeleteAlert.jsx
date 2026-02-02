import React from 'react';

const DeleteAlert = ({ content, onDelete }) => {
  return (
    <div>
      <p className="text-sm">{content}</p>

      <div className="flex justify-end mt-6">
        <button
          type="button"
          className="inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold whitespace-nowrap md:text-sm btn-danger"
          onClick={onDelete}
        >
          Delete
        </button>
      </div>
    </div>
  );
};

export default DeleteAlert;
