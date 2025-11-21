import React, { useEffect, useMemo, useState } from "react";
import { API_PATHS } from "../../utils/apiPaths";
import axiosInstance from "../../utils/axiosInstance";
import Modal from "../Modal";
import { LuUsers } from "react-icons/lu";
import { FaUser } from "react-icons/fa6";
import AvatarGroup from "../AvatarGroup";
import { getRoleLabel, matchesRole, normalizeRole } from "../../utils/roleUtils";

const SelectUsers = ({
  selectedUsers,
  setSelectedUsers,
  onSelectedUsersDetails = () => {},
}) => {
  const [allUsers, setAllUsers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tempSelectedUsers, setTempSelectedUsers] = useState([]);
  const [userSearchTerm, setUserSearchTerm] = useState("");

  const getAllUsers = async () => {
    try {
      const response = await axiosInstance.get(API_PATHS.USERS.GET_ALL_USERS);
      if (response.data?.length > 0) {
        const nonClientUsers = response.data.filter(
          (user) => !matchesRole(user?.role, "client")
        );

        const sortedUsers = [...nonClientUsers].sort((userA, userB) => {
          const rolePriority = {
            super_admin: 0,
            admin: 1,
            member: 2,
          };

          const normalizedRoleA = normalizeRole(userA?.role);
          const normalizedRoleB = normalizeRole(userB?.role);
          const roleDifference =
            (rolePriority[normalizedRoleA] ?? Number.MAX_SAFE_INTEGER) -
            (rolePriority[normalizedRoleB] ?? Number.MAX_SAFE_INTEGER);

          if (roleDifference !== 0) {
            return roleDifference;
          }

          return (userA?.name || "").localeCompare(userB?.name || "");
        });

        setAllUsers(sortedUsers);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const toggleUserSelection = (userId) => {
    setTempSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleAssign = () => {
    const details = tempSelectedUsers
      .map((userId) => allUsers.find((user) => user._id === userId))
      .filter(Boolean);

    setSelectedUsers(tempSelectedUsers);
    onSelectedUsersDetails(details);    
    setIsModalOpen(false);
  };

  const selectedUserDetails = useMemo(
    () =>
      selectedUsers
        .map((userId) => allUsers.find((user) => user._id === userId))
        .filter(Boolean),
    [allUsers, selectedUsers]
  );

  const selectedUserIdSet = useMemo(() => {
    const ids = new Set();
    [...selectedUsers, ...tempSelectedUsers].forEach((userId) => {
      if (["string", "number"].includes(typeof userId)) {
        ids.add(userId.toString());
      }
    });
    return ids;
  }, [selectedUsers, tempSelectedUsers]);

  const filteredUsers = useMemo(() => {
    const normalizedQuery = userSearchTerm.trim().toLowerCase();

    if (!normalizedQuery) {
      return allUsers;
    }

    const matches = allUsers.filter((user) => {
      if (!user) {
        return false;
      }

      const roleLabel = getRoleLabel(normalizeRole(user?.role));
      const searchableText = [user.name, user.email, roleLabel]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(normalizedQuery);
    });

    if (!selectedUserIdSet.size) {
      return matches;
    }

    const missingSelected = allUsers.filter((user) => {
      if (!user) {
        return false;
      }

      return (
        selectedUserIdSet.has(user._id?.toString()) &&
        !matches.some((match) => match?._id === user._id)
      );
    });

    return [...missingSelected, ...matches];
  }, [allUsers, selectedUserIdSet, userSearchTerm]);

  const selectedUserAvatars = selectedUserDetails.map((user) => ({
    profileImageUrl: user.profileImageUrl,
    name: user.name
  }));

  const selectedUserNames = selectedUserDetails
    .map((user) => user.name)
    .filter(Boolean);
  
  useEffect(() => {
    getAllUsers();
  }, []);
  
  useEffect(() => {
    if (selectedUsers.length === 0) {
      setTempSelectedUsers([]);
    }
    return () => {};
  }, [selectedUsers]);

  useEffect(() => {
    const details = selectedUsers
      .map((userId) => allUsers.find((user) => user._id === userId))
      .filter(Boolean);
    onSelectedUsersDetails(details);
  }, [allUsers, onSelectedUsersDetails, selectedUsers]);
    
  useEffect(() => {
    if (!isModalOpen) {
      setUserSearchTerm("");
    }
  }, [isModalOpen]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {selectedUserAvatars.length > 0 && (
          <>
          <AvatarGroup avatars={selectedUserAvatars} />
          {selectedUserNames.length > 0 && (
            <p className="text-sm font-medium text-slate-600">
              {selectedUserNames.join(", ")}
            </p>
          )}
        </>
        )}

        <button
          className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white px-4 py-2 text-sm font-semibold text-primary shadow-sm shadow-primary/10 transition hover:border-primary hover:bg-primary/5"
          onClick={() => {
            setTempSelectedUsers(selectedUsers);
            setIsModalOpen(true);
          }}
        >
          <LuUsers className="text-base" />
          {selectedUserAvatars.length > 0 ? "Manage Members" : "Add Members"}
        </button>  
      </div>

      {selectedUserAvatars.length === 0 && (
        <p className="text-xs font-medium text-slate-500">
          No members assigned yet.
        </p>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Select Users"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Choose the team members who will collaborate on this task.
          </p>

          <div className="space-y-3 overflow-y-auto rounded-2xl border border-slate-200/80 bg-slate-50 p-3">
            <div className="sticky top-0 z-10 rounded-xl bg-slate-50 pb-2">
              <input
                type="search"
                value={userSearchTerm}
                onChange={(event) => setUserSearchTerm(event.target.value)}
                placeholder="Search team members"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {filteredUsers.length === 0 ? (
              <p className="px-1 text-sm text-slate-500">No team members found.</p>
            ) : (
              filteredUsers.map((user) => {
                const normalizedRole = normalizeRole(user?.role);
                const roleLabel = getRoleLabel(normalizedRole);
                const normalizedGender =
                  typeof user?.gender === "string"
                    ? user.gender.trim().toLowerCase()
                    : "";

                return (
                  <div
                    key={user._id}
                    className="flex items-center gap-4 rounded-xl bg-white px-4 py-3 shadow-[0_12px_24px_rgba(15,23,42,0.08)]"
                  >
                    {user.profileImageUrl ? (
                      <img
                        src={user.profileImageUrl}
                        alt={user.name}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <span
                        className={`flex h-10 w-10 items-center justify-center rounded-full ${
                          normalizedGender === "female"
                            ? "bg-rose-50 text-rose-400"
                            : normalizedGender === "male"
                            ? "bg-blue-50 text-primary"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        <FaUser className="text-base" />
                      </span>
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-slate-800">{user.name}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                      {roleLabel && (
                        <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-slate-400">
                          {roleLabel}
                        </p>
                      )}
                    </div>

                    <input
                      type="checkbox"
                      checked={tempSelectedUsers.includes(user._id)}
                      onChange={() => toggleUserSelection(user._id)}
                      className="h-4 w-4 rounded-sm border-slate-300 text-primary focus:ring-primary"
                    />
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
            onClick={() => setIsModalOpen(false)}
          >
            Cancel
          </button>
          <button
            className="inline-flex items-center rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-sm shadow-primary/20 transition hover:bg-primary/90"
            onClick={handleAssign}
          >
            Done
          </button>
        </div>
      </Modal>
    </div>
  );  
};

export default SelectUsers;