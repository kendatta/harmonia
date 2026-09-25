import type { ComponentProps } from "react";
import { cn } from "../../lib/utils";

function Input({ className, type, ...props }: ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-9 w-full rounded-full border border-[var(--line)] bg-[var(--bg-sunken)] px-3 text-sm text-[var(--ink)] outline-none placeholder:text-[var(--muted)] focus-visible:ring-2 focus-visible:ring-[var(--focus)]",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
