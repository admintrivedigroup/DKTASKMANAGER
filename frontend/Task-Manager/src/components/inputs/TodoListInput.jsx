import React, { useEffect, useMemo, useState } from "react";
import { HiMiniPlus, HiOutlineTrash } from "react-icons/hi2";

const TodoListInput = ({
  todoList,
  setTodoList,
  assignedUsers = [],
  disabled = false,
}) => {
  const [option, setOption] = useState("");
  const [selectedAssignee, setSelectedAssignee] = useState("");

  const availableAssignees = useMemo(() => {
    if (!Array.isArray(assignedUsers)) {
      return [];
    }

    return assignedUsers
      .map((user) => {
        if (!user) return null;
        const id =
          user._id || user.id || user.value || user.assignedTo || null;
        const name = user.name || user.label || user.email || "Member";

        if (!id) {
          return null;
        }

        return {
          id: id.toString(),
          name,
        };
      })
      .filter(Boolean);
  }, [assignedUsers]);

  useEffect(() => {
    if (!availableAssignees.length) {
      if (selectedAssignee) {
        setSelectedAssignee("");
      }
      return;
    }

    const isCurrentValid = availableAssignees.some(
      (assignee) => assignee.id === selectedAssignee
    );

    if (!isCurrentValid) {
      setSelectedAssignee(availableAssignees[0].id);
    }
  }, [availableAssignees, selectedAssignee]);

  const handleAddOption = () => {
    const trimmedOption = option.trim();

    if (!trimmedOption || !selectedAssignee) {
      return;
    }

    const newItem = {
      text: trimmedOption,
      assignedTo: selectedAssignee,
      completed: false,
    };

    setTodoList([...(Array.isArray(todoList) ? todoList : []), newItem]);
    setOption("");    
  };

  const handleDeleteOption = (index) => {
    const updatedArr = (Array.isArray(todoList) ? todoList : []).filter(
      (_, idx) => idx !== index
    );
    setTodoList(updatedArr);
  };

  const handleAssigneeChange = (index, value) => {
    setTodoList(
      (Array.isArray(todoList) ? todoList : []).map((item, idx) =>
        idx === index
          ? {
              ...item,
              assignedTo: value,
            }
          : item
      )
    );
  };

  const hasAssignees = availableAssignees.length > 0;
  const normalizedTodoList = Array.isArray(todoList) ? todoList : [];

  return (
    <div className="mt-4 space-y-4">
      {!hasAssignees && (
        <p className="text-xs font-medium text-rose-500">
          Assign the task to at least one member to add checklist items.
        </p>
      )}

      <div className="space-y-3">
        {normalizedTodoList.map((item, index) => {
          const itemKey = item?._id || `${item?.text || "todo"}_${index}`;
          const itemAssigned = item?.assignedTo
            ? item.assignedTo.toString()
            : "";

          return (
            <div
              key={itemKey}
              className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_12px_24px_rgba(15,23,42,0.08)]"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="flex items-center gap-3 text-sm font-medium text-slate-700">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold uppercase tracking-[0.1em] text-primary">
                    {index < 9 ? `0${index + 1}` : index + 1}
                  </span>
                  <span className="break-words text-left">{item?.text}</span>
                </p>

                <button
                  type="button"
                  className="self-start rounded-full bg-rose-50 p-2 text-rose-500 transition hover:bg-rose-100 disabled:opacity-60"
                  onClick={() => handleDeleteOption(index)}
                  disabled={disabled}
                >
                  <HiOutlineTrash className="text-lg" />
                </button>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                  Assigned to
                </p>
                <select
                  className="form-input mt-0 h-10 bg-slate-50 text-left"
                  value={itemAssigned}
                  onChange={({ target }) => handleAssigneeChange(index, target.value)}
                  disabled={disabled || !hasAssignees}
                >
                  <option value="">
                    {hasAssignees ? "Select member" : "No members available"}
                  </option>
                  {availableAssignees.map((assignee) => (
                    <option key={assignee.id} value={assignee.id}>
                      {assignee.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex w-full flex-col gap-3 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-3 sm:flex-row sm:items-center">
          <input
            type="text"
            placeholder="Enter task name"
            value={option}
            onChange={({ target }) => setOption(target.value)}
            className="w-full text-sm text-slate-700 outline-none placeholder:text-slate-400"
            disabled={disabled}
          />
          <select
            className="form-input mt-0 h-10 bg-slate-50 text-left sm:w-48"
            value={selectedAssignee}
            onChange={({ target }) => setSelectedAssignee(target.value)}
            disabled={disabled || !hasAssignees}
          >
             <option value="">
              {hasAssignees ? "Assign to member" : "No members available"}
            </option>
            {availableAssignees.map((assignee) => (
              <option key={`new_${assignee.id}`} value={assignee.id}>
                {assignee.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-primary/20 transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          onClick={handleAddOption}
          disabled={
            disabled || !hasAssignees || !option.trim() || !selectedAssignee
          }
        >
          <HiMiniPlus className="text-lg" /> Add
        </button>
      </div>
    </div>
  );
};

export default TodoListInput;