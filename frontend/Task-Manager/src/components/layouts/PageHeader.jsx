import React from "react";

const PageHeader = ({
  tone = "neutral",
  eyebrow,
  title,
  description,
  meta,
  actions,
  children,
  className = "",
}) => {
  const isPrimary = tone === "primary";
  const shellClass = isPrimary ? "page-hero" : "page-surface";
  const metaItems = Array.isArray(meta)
    ? meta.filter(Boolean)
    : meta
    ? [meta]
    : [];
  const metaClass = isPrimary ? "meta-pill-dark" : "meta-pill";

  return (
    <section className={`${shellClass} ${className}`}>
      {isPrimary && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-70 mix-blend-overlay bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.18),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(255,255,255,0.18),transparent_30%),radial-gradient(circle_at_50%_100%,rgba(255,255,255,0.14),transparent_32%)]"
        />
      )}

      <div className="relative z-10 flex flex-col gap-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between lg:gap-10">
          <div className="space-y-3">
            {eyebrow && (
              <p
                className={`text-[11px] font-semibold uppercase tracking-[0.36em] ${
                  isPrimary ? "text-white/80" : "text-slate-500"
                }`}
              >
                {eyebrow}
              </p>
            )}

            <div className="space-y-2">
              {typeof title === "string" ? (
                <h1
                  className={`text-3xl font-semibold leading-tight sm:text-4xl ${
                    isPrimary ? "text-white" : "text-slate-900"
                  }`}
                >
                  {title}
                </h1>
              ) : (
                title
              )}
              {description && (
                <p
                  className={`text-sm leading-relaxed ${
                    isPrimary ? "text-white/80" : "text-slate-600"
                  }`}
                >
                  {description}
                </p>
              )}
            </div>

            {metaItems.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {metaItems.map((item, index) => (
                  <div key={`meta-${index}`} className={metaClass}>
                    {item}
                  </div>
                ))}
              </div>
            )}
          </div>

          {actions && (
            <div className="w-full max-w-xl space-y-3 sm:w-auto">{actions}</div>
          )}
        </div>

        {children}
      </div>
    </section>
  );
};

export default PageHeader;
