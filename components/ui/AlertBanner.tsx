import type { ReactNode } from "react";

interface AlertBannerProps {
  variant?: "info" | "warning" | "error";
  title?: string;
  children?: ReactNode;
}

const variantStyles: Record<
  NonNullable<AlertBannerProps["variant"]>,
  string
> = {
  info: "border-sky-100 bg-sky-50 text-sky-800",
  warning: "border-amber-100 bg-amber-50 text-amber-800",
  error: "border-red-100 bg-red-50 text-red-800",
};

export function AlertBanner({
  variant = "info",
  title,
  children,
}: AlertBannerProps) {
  return (
    <div
      className={`flex items-start gap-3 rounded-md border px-3 py-2 text-xs ${variantStyles[variant]}`}
    >
      <div className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
      <div className="space-y-1">
        {title ? (
          <p className="font-semibold tracking-tight">{title}</p>
        ) : null}
        {children ? <div className="text-[11px] leading-snug">{children}</div> : null}
      </div>
    </div>
  );
}

