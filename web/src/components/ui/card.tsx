import * as React from "react";
import { cn } from "@/lib/cn";

export function Card({
  featured = false,
  className,
  children,
}: {
  featured?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "bg-transparent",
        featured && "rounded-card border border-cloud-whisper/8",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  trend,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  trend?: "up" | "down" | "flat";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-t border-cloud-whisper/10 pt-5 pb-7 px-1 flex flex-col gap-3",
        className,
      )}
    >
      <div className="eyebrow">{label}</div>
      <div className="display text-[42px] tabular leading-none">{value}</div>
      {hint && (
        <div className="text-[12px] text-ash-accent flex items-center gap-2">
          {trend === "up" && <span aria-hidden>↑</span>}
          {trend === "down" && <span aria-hidden>↓</span>}
          {trend === "flat" && <span aria-hidden>→</span>}
          <span>{hint}</span>
        </div>
      )}
    </div>
  );
}
