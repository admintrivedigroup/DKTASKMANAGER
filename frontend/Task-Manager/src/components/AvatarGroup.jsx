import React from 'react'
import { LuUser } from 'react-icons/lu';

const AvatarGroup = ({ avatars = [], maxVisible = 3 }) => {
  const normalizedAvatars = avatars.map((avatar) => {
    if (typeof avatar === "string") {
      return { src: avatar, name: "" };
    }

    if (avatar && typeof avatar === "object") {
      return {
        src: avatar.profileImageUrl || avatar.src || avatar.avatar || "",
        name: avatar.name || avatar.fullName || ""
      };
    }

    return { src: "", name: "" };
  });

  return (
    <div className="flex items-center">
       {normalizedAvatars.slice(0, maxVisible).map((avatar, index) => {
        const hasImage = Boolean(avatar.src);
        const fallbackInitial = avatar.name ? avatar.name.charAt(0).toUpperCase() : null;

        return hasImage ? (
          <img
            key={index}
            src={avatar.src}
            alt={avatar.name || `Avatar ${index + 1}`}
            className="w-9 h-9 rounded-full border-2 border-white object-cover -ml-3 first:ml-0"
          />
        ) : (
          <div
            key={index}
            className="w-9 h-9 -ml-3 first:ml-0 flex items-center justify-center rounded-full border-2 border-white bg-slate-200 text-xs font-semibold text-slate-600"
          >
            {fallbackInitial ? fallbackInitial : <LuUser className="text-slate-500" />}
          </div>
        );
      })}
      {normalizedAvatars.length > maxVisible && (
        <div className="w-9 h-9 flex items-center justify-center bg-blue-50 text-sm font-medium rounded-full border-2 border-white -ml-3">
          +{normalizedAvatars.length - maxVisible}
        </div>
      )}
    </div>
  )
}

export default AvatarGroup
