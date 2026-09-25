import type { ComponentProps } from "react";
import { cn } from "../../lib/utils";

function Input({ className, type, ...props }: ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-9 w-full rounded-full border border-[rgba(243,239,230,0.16)] bg-[#101116] px-3 text-sm text-[#f3efe6] outline-none placeholder:text-[#8d887e] focus-visible:ring-2 focus-visible:ring-[#e4c27a]",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
