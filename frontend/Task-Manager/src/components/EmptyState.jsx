import React from 'react';

/**
 * Empty state component with illustration, message, and CTA
 */
const EmptyState = ({
  icon: Icon,
  title = 'No data found',
  description = 'Get started by creating your first item.',
  action,
  actionLabel = 'Get Started',
  illustration,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {illustration ? (
        <div className="mb-6">{illustration}</div>
      ) : Icon ? (
        <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-6">
          <Icon className="w-12 h-12 text-slate-400 dark:text-slate-600" />
        </div>
      ) : null}

      <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-50 mb-2">
        {title}
      </h3>

      <p className="text-slate-600 dark:text-slate-400 max-w-md mb-6">
        {description}
      </p>

      {action && (
        <button onClick={action} className="btn btn-primary">
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
