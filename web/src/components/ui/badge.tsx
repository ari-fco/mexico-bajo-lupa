import * as React from "react";
import { cn } from "@/lib/cn";

type Variant = "lozenge" | "subtle" | "outline" | "alert" | "warn" | "good";

const variantClass: Record<Variant, string> = {
  lozenge: "bg-[rgba(200,200,200,0.10)] text-cloud-whisper",
  subtle: "bg-transparent text-cloud-whisper",
  outline: "bg-transparent text-cloud-whisper border border-cloud-whisper/30",
  alert: "bg-signal-alert/10 text-signal-alert border border-signal-alert/30",
  warn: "bg-signal-warn/10 text-signal-warn border border-signal-warn/30",
  good: "bg-signal-good/10 text-signal-good border border-signal-good/30",
};

export function Badge({
  variant = "lozenge",
  className,
  children,
}: {
  variant?: Variant;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill px-4 py-1 text-[11px] font-medium tracking-tight",
        variantClass[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
