import type { ReactNode } from "react";

interface CardProps {
  title?: string;
  description?: string;
  children?: ReactNode;
  actions?: ReactNode;
}

export function Card({ title, description, children, actions }: CardProps) {
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      {(title || description || actions) && (
        <header className="flex items-start justify-between gap-3">
          <div>
            {title ? (
              <h2 className="text-sm font-semibold tracking-tight text-slate-900">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="mt-0.5 text-xs text-slate-500">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </header>
      )}
      {children ? <div className="text-sm text-slate-800">{children}</div> : null}
    </section>
  );
}

