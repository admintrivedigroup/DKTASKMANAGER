import React, { useState } from 'react'
import { HiMiniPlus, HiOutlineTrash } from "react-icons/hi2";
import { LuPaperclip } from "react-icons/lu";

const AddAttachmentsInput = ({ attachments = [], setAttachments }) => {
  const [option, setOption] = useState("");

  const handleAddOption = () => {
    if (option.trim()) {
      setAttachments([...attachments, option.trim()]);
      setOption("");
    }
  };

  const handleDeleteOption = (index) => {
    const updatedArr = attachments.filter((_, idx) => idx !== index);
    setAttachments(updatedArr);
  };

  return (
    <div className="mt-4 space-y-4">
      <div className="space-y-3">
        {attachments.map((item, index) => (
          <div
            key={item}
            className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-[0_12px_24px_rgba(15,23,42,0.08)]"
          >
            <div className="flex flex-1 items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                <LuPaperclip />
              </span>
              <p className="break-all text-sm font-medium text-slate-700">{item}</p>
            </div>

            <button
              className="rounded-full bg-rose-50 p-2 text-rose-500 transition hover:bg-rose-100"
              onClick={() => handleDeleteOption(index)}
            >
              <HiOutlineTrash className="text-lg" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-3">
          <LuPaperclip className="text-lg text-slate-400" />

          <input
            type="text"
            placeholder="Add file link"
            value={option}
            onChange={({ target }) => setOption(target.value)}
            className="w-full text-sm text-slate-700 outline-none placeholder:text-slate-400"
          />
        </div>

        <button
          className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-primary/20 transition hover:bg-primary/90"
          onClick={handleAddOption}
        >
          <HiMiniPlus className="text-lg" /> Add
        </button>
      </div>
    </div>
  )
}

export default AddAttachmentsInput