import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LuChevronRight, LuHouse } from 'react-icons/lu';

/**
 * Breadcrumb navigation component
 * Automatically generates breadcrumbs from current route
 */
const Breadcrumb = ({ items }) => {
  const location = useLocation();

  // Auto-generate breadcrumbs from path if items not provided
  const breadcrumbs = items || generateBreadcrumbsFromPath(location.pathname);

  if (!breadcrumbs || breadcrumbs.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm mb-6">
      <Link
        to="/"
        className="flex items-center gap-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50 transition-colors"
        aria-label="Home"
      >
        <LuHouse className="w-4 h-4" />
      </Link>

      {breadcrumbs.map((crumb, index) => {
        const isLast = index === breadcrumbs.length - 1;

        return (
          <React.Fragment key={crumb.path || index}>
            <LuChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-700" />
            
            {isLast ? (
              <span
                className="font-medium text-slate-900 dark:text-slate-50"
                aria-current="page"
              >
                {crumb.label}
              </span>
            ) : (
              <Link
                to={crumb.path}
                className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50 transition-colors"
              >
                {crumb.label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

/**
 * Generate breadcrumbs from URL path
 */
function generateBreadcrumbsFromPath(pathname) {
  const segments = pathname.split('/').filter(Boolean);
  
  if (segments.length === 0) {
    return [];
  }

  const breadcrumbs = [];
  let currentPath = '';

  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    
    // Format label: remove hyphens, capitalize words
    const label = segment
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    breadcrumbs.push({
      label,
      path: currentPath,
    });
  });

  return breadcrumbs;
}

export default Breadcrumb;
