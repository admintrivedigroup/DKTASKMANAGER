import React from 'react';

/**
 * Skeleton loader components for different content types
 */

// Generic skeleton element
export const Skeleton = ({ className = '', ...props }) => (
  <div
    className={`skeleton ${className}`}
    {...props}
  />
);

// Skeleton for card layout
export const SkeletonCard = () => (
  <div className="card animate-pulse">
    <div className="flex items-start gap-4 mb-4">
      <Skeleton className="w-12 h-12 rounded-lg" />
      <div className="flex-1">
        <Skeleton className="h-5 w-3/4 mb-2" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
    <Skeleton className="h-4 w-full mb-2" />
    <Skeleton className="h-4 w-5/6" />
  </div>
);

// Skeleton for table row
export const SkeletonTableRow = ({ columns = 4 }) => (
  <tr className="animate-pulse">
    {Array.from({ length: columns }).map((_, i) => (
      <td key={i} className="px-4 py-3">
        <Skeleton className="h-4 w-full" />
      </td>
    ))}
  </tr>
);

// Skeleton for table
export const SkeletonTable = ({ rows = 5, columns = 4 }) => (
  <div className="card">
    <table className="w-full">
      <thead>
        <tr className="border-b border-slate-200 dark:border-slate-800">
          {Array.from({ length: columns }).map((_, i) => (
            <th key={i} className="px-4 py-3 text-left">
              <Skeleton className="h-4 w-24" />
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, i) => (
          <SkeletonTableRow key={i} columns={columns} />
        ))}
      </tbody>
    </table>
  </div>
);

// Skeleton for list items
export const SkeletonList = ({ items = 5 }) => (
  <div className="space-y-3">
    {Array.from({ length: items }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 animate-pulse">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-4 w-3/4 mb-2" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    ))}
  </div>
);

// Skeleton for dashboard stats
export const SkeletonStats = ({ count = 4 }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="card animate-pulse">
        <div className="flex items-start gap-4">
          <Skeleton className="w-12 h-12 rounded-lg" />
          <div className="flex-1">
            <Skeleton className="h-8 w-20 mb-2" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

// Full page skeleton matching dashboard layout
export const PageSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    {/* Header */}
    <div className="flex items-center justify-between">
      <div>
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Skeleton className="h-10 w-32 rounded-lg" />
    </div>

    {/* Stats */}
    <SkeletonStats />

    {/* Content */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <SkeletonTable rows={8} />
      </div>
      <div className="space-y-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  </div>
);

const SkeletonLoader = {
  Skeleton,
  Card: SkeletonCard,
  Table: SkeletonTable,
  TableRow: SkeletonTableRow,
  List: SkeletonList,
  Stats: SkeletonStats,
  Page: PageSkeleton,
};

export default SkeletonLoader;
