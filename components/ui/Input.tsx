import type { InputHTMLAttributes, ReactNode } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: ReactNode;
  error?: string;
}

export function Input({ label, hint, error, className = "", ...props }: InputProps) {
  return (
    <div className="space-y-1.5">
      {label ? (
        <label className="block text-xs font-medium uppercase tracking-wide text-slate-600">
          {label}
        </label>
      ) : null}
      <input
        className={`block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none ring-0 placeholder:text-slate-400 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 ${className}`}
        {...props}
      />
      {hint && !error ? (
        <p className="text-xs text-slate-500">{hint}</p>
      ) : null}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

