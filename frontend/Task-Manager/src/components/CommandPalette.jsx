import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLayoutContext } from '../context/layoutContext';
import {
  LuSearch,
  LuHome,
  LuUsers,
  LuFileText,
  LuSettings,
  LuMoon,
  LuSun,
  LuLogOut,
} from 'react-icons/lu';

/**
 * Simplified Command Palette (Cmd+K) for quick navigation and actions
 * Built without cmdk to avoid module resolution issues
 */
const CommandPalette = () => {
  const navigate = useNavigate();
  const {
    isCommandPaletteOpen,
    closeCommandPalette,
    isDarkMode,
    toggleDarkMode,
  } = useLayoutContext();
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  // Command items
  const commands = [
    // Navigation
    { icon: LuHome, label: 'Dashboard', action: () => navigate('/admin/dashboard'), group: 'Navigation' },
    { icon: LuUsers, label: 'Users', action: () => navigate('/admin/users'), group: 'Navigation' },
    { icon: LuFileText, label: 'Tasks', action: () => navigate('/admin/tasks'), group: 'Navigation' },
    { icon: LuSettings, label: 'Settings', action: () => navigate('/admin/settings'), group: 'Navigation' },
    // Actions
    { icon: isDarkMode ? LuSun : LuMoon, label: isDarkMode ? 'Light Mode' : 'Dark Mode', action: toggleDarkMode, group: 'Actions' },
    { icon: LuLogOut, label: 'Logout', action: () => navigate('/login'), group: 'Actions' },
  ];

  // Filter commands based on search
  const filteredCommands = commands.filter(cmd =>
    cmd.label.toLowerCase().includes(search.toLowerCase())
  );

  // Group commands
  const groupedCommands = filteredCommands.reduce((acc, cmd) => {
    if (!acc[cmd.group]) acc[cmd.group] = [];
    acc[cmd.group].push(cmd);
    return acc;
  }, {});

  // Handle keyboard navigation
  useEffect(() => {
    if (!isCommandPaletteOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeCommandPalette();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && filteredCommands[selectedIndex]) {
        e.preventDefault();
        handleSelect(filteredCommands[selectedIndex].action);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen, selectedIndex, filteredCommands, closeCommandPalette]);

  // Focus input when opened
  useEffect(() => {
    if (isCommandPaletteOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isCommandPaletteOpen]);

  // Reset state when closed
  useEffect(() => {
    if (!isCommandPaletteOpen) {
      setSearch('');
      setSelectedIndex(0);
    }
  }, [isCommandPaletteOpen]);

  const handleSelect = useCallback((action) => {
    action();
    closeCommandPalette();
  }, [closeCommandPalette]);

  if (!isCommandPaletteOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
      onClick={closeCommandPalette}
    >
      <div 
        className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-2xl px-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          {/* Search Input */}
          <div className="flex items-center border-b border-slate-200 dark:border-slate-800 px-4">
            <LuSearch className="w-5 h-5 text-slate-400 mr-3" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSelectedIndex(0);
              }}
              placeholder="Type a command or search..."
              className="w-full py-4 bg-transparent border-none outline-none text-slate-900 dark:text-slate-50 placeholder-slate-400"
            />
          </div>

          {/* Command List */}
          <div className="max-h-96 overflow-y-auto p-2">
            {filteredCommands.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-500">
                No results found.
              </div>
            ) : (
              Object.entries(groupedCommands).map(([group, items], groupIndex) => (
                <div key={group}>
                  {groupIndex > 0 && <div className="h-px bg-slate-200 dark:bg-slate-800 my-2" />}
                  <div className="text-xs font-semibold text-slate-500 px-2 py-2">{group}</div>
                  {items.map((cmd, index) => {
                    const globalIndex = filteredCommands.indexOf(cmd);
                    const isSelected = globalIndex === selectedIndex;
                    const Icon = cmd.icon;

                    return (
                      <button
                        key={index}
                        onClick={() => handleSelect(cmd.action)}
                        onMouseEnter={() => setSelectedIndex(globalIndex)}
                        className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {Icon && <Icon className="w-5 h-5" />}
                          <span className="text-sm font-medium">{cmd.label}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-200 dark:border-slate-800 px-4 py-3 text-xs text-slate-500 flex items-center justify-between">
            <span>Press <kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded">ESC</kbd> to close</span>
            <span>Navigate with <kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded">↑↓</kbd></span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
