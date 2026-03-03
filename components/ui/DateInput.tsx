import type { InputHTMLAttributes } from "react";

interface DateInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function DateInput({
  label,
  error,
  className = "",
  ...props
}: DateInputProps) {
  return (
    <div className="space-y-1.5">
      {label ? (
        <label className="block text-xs font-medium uppercase tracking-wide text-slate-600">
          {label}
        </label>
      ) : null}
      <input
        type="date"
        className={`block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none ring-0 placeholder:text-slate-400 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 ${className}`}
        {...props}
      />
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

