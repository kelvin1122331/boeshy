import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ButtonHTMLAttributes } from "react";
const styles = cva("btn", {
  variants: {
    variant: {
      default: "btn-primary",
      secondary: "btn-secondary",
      ghost: "btn-ghost",
      danger: "btn-danger",
    },
    size: { default: "", sm: "btn-sm", icon: "btn-icon" },
  },
  defaultVariants: { variant: "default", size: "default" },
});
export function Button({
  asChild = false,
  variant,
  size,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof styles> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={twMerge(clsx(styles({ variant, size }), className))}
      {...props}
    />
  );
}
