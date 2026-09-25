import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4 shrink-0",
  {
    variants: {
      variant: {
        default: "bg-[var(--ink)] text-[var(--bg)] hover:bg-[#f4f2ec]",
        outline:
          "border border-[var(--line)] bg-transparent text-[var(--ink)] hover:bg-[rgba(230,228,223,0.06)]",
        ghost: "bg-transparent text-[var(--muted)] hover:bg-[rgba(230,228,223,0.06)] hover:text-[var(--ink)]",
        subtle: "bg-[rgba(230,228,223,0.1)] text-[var(--ink)] hover:bg-[rgba(230,228,223,0.16)]",
      },
      size: {
        default: "h-9 px-4",
        sm: "h-8 px-3 text-xs",
        chip: "h-8 min-w-8 px-1.5 text-[13px] font-mono",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button };
