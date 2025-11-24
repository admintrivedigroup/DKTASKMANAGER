import React, { useState } from 'react';
import { motion, AnimatePresence } from "../utils/motionShim";
import { LuPlus, LuX } from 'react-icons/lu';

/**
 * Floating Action Button with expandable quick actions
 */
const FloatingActionButton = ({ actions = [] }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = () => setIsExpanded(!isExpanded);

  return (
    <div className="fixed bottom-8 right-8 z-40">
      <AnimatePresence>
        {isExpanded && actions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-20 right-0 flex flex-col gap-3 mb-2"
          >
            {actions.map((action, index) => (
              <motion.button
                key={index}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => {
                  action.onClick();
                  setIsExpanded(false);
                }}
                className="flex items-center gap-3 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-4 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 whitespace-nowrap group"
                title={action.label}
              >
                <span className="text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  {action.label}
                </span>
                {action.icon && <action.icon className="w-5 h-5" />}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={toggleExpand}
        className="w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-xl hover:shadow-2xl transition-all duration-200 flex items-center justify-center"
        aria-label={isExpanded ? 'Close quick actions' : 'Open quick actions'}
      >
        <motion.div
          animate={{ rotate: isExpanded ? 45 : 0 }}
          transition={{ duration: 0.2 }}
        >
          {isExpanded ? <LuX className="w-6 h-6" /> : <LuPlus className="w-6 h-6" />}
        </motion.div>
      </motion.button>
    </div>
  );
};

export default FloatingActionButton;
