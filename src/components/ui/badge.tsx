import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-sm border-2 border-border px-2.5 py-0.5 text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 shadow-neo-sm", // Neobrutalist: rounded-sm, border-2, font-bold, shadow-neo-sm
  {
    variants: {
      variant: {
        default:
          "border-border bg-primary text-primary-foreground hover:bg-primary/80", // Kept border-border for contrast
        secondary:
          "border-border bg-secondary text-secondary-foreground hover:bg-secondary/80", // Kept border-border
        destructive:
          "border-border bg-destructive text-destructive-foreground hover:bg-destructive/80", // Kept border-border
        outline: "text-foreground", // Outline variant keeps text color, border is already applied
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
