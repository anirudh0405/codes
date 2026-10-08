import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border border-transparent bg-slate-900 text-white shadow hover:bg-slate-800",
        secondary:
          "border border-transparent bg-slate-100 text-slate-900 hover:bg-slate-200",
        destructive:
          "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
        warning:
          "border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100",
        success:
          "border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100",
        outline:
          "border border-slate-200 text-slate-700 bg-white",
        prototype:
          "border border-blue-200 bg-blue-50 text-blue-700 font-normal tracking-wide",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
