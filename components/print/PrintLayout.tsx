import type { ReactNode } from "react";

interface PrintLayoutProps {
  title?: string;
  children: ReactNode;
}

export function PrintLayout({ title, children }: PrintLayoutProps) {
  return (
    <div className="mx-auto my-4 w-full max-w-[800px] bg-white p-6 text-slate-900 shadow-sm print:m-0 print:box-border print:h-auto print:w-[210mm] print:max-w-none print:shadow-none print:[margin:0]">
      {title ? (
        <header className="mb-4 border-b border-slate-200 pb-2">
          <h1 className="text-lg font-semibold tracking-tight text-slate-900">
            {title}
          </h1>
        </header>
      ) : null}
      <div className="text-xs leading-relaxed text-slate-800">{children}</div>
    </div>
  );
}

