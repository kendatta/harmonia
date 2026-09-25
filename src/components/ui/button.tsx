import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)] disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4 shrink-0",
  {
    variants: {
      variant: {
        default: "bg-[var(--color-text)] text-[var(--color-bg)] hover:bg-[var(--color-text-secondary)]",
        outline:
          "border border-[var(--color-line)] bg-transparent text-[var(--color-text)] hover:bg-[var(--color-surface-raised)]",
        ghost: "bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-text)]",
        subtle: "bg-[var(--color-surface-raised)] text-[var(--color-text)] hover:bg-[var(--color-line)]",
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
