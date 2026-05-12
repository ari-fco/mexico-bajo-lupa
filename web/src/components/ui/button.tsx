import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

type Variant = "primary" | "ghost" | "subtle";
type Size = "md" | "sm" | "lg";

type CommonProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
};

type AnchorProps = CommonProps & {
  href: string;
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "className" | "children">;

type ButtonProps = CommonProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">;

const baseClass =
  "inline-flex items-center justify-center gap-2 rounded-pill font-medium tracking-tight transition-all duration-200 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cloud-whisper/30 focus-visible:ring-offset-2 focus-visible:ring-offset-midnight-void disabled:opacity-40 disabled:cursor-not-allowed";

const sizeClass: Record<Size, string> = {
  sm: "h-8 px-4 text-[12px]",
  md: "h-10 px-6 text-[13px]",
  lg: "h-12 px-7 text-[14px]",
};

const variantClass: Record<Variant, string> = {
  primary:
    "bg-slate-dust text-midnight-void hover:bg-cloud-whisper hover:shadow-elev-lg",
  ghost:
    "bg-transparent text-cloud-whisper border border-cloud-whisper/80 hover:border-cloud-whisper hover:bg-cloud-whisper/5",
  subtle:
    "bg-cloud-whisper/5 text-cloud-whisper border border-cloud-whisper/10 hover:bg-cloud-whisper/10 hover:border-cloud-whisper/20",
};

function classes({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: Variant;
  size?: Size;
  className?: string;
}) {
  return cn(baseClass, sizeClass[size], variantClass[variant], className);
}

export function Button({
  variant,
  size,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button className={classes({ variant, size, className })} {...rest}>
      {children}
    </button>
  );
}

export function ButtonLink({
  variant,
  size,
  className,
  children,
  href,
  ...rest
}: AnchorProps) {
  const isInternal = href.startsWith("/");
  if (isInternal) {
    return (
      <Link
        {...(rest as React.ComponentProps<typeof Link>)}
        href={href}
        className={classes({ variant, size, className })}
      >
        {children}
      </Link>
    );
  }
  return (
    <a
      href={href}
      className={classes({ variant, size, className })}
      target="_blank"
      rel="noopener noreferrer"
      {...rest}
    >
      {children}
    </a>
  );
}
