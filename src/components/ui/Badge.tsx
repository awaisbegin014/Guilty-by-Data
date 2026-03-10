import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[0.7rem] font-bold uppercase tracking-[0.06em] border",
  {
    variants: {
      variant: {
        default:
          "bg-muted text-muted-foreground border-border",
        success:
          "bg-success-bg text-success-text border-success-border",
        warning:
          "bg-warning-bg text-warning-text border-warning-border",
        info:
          "bg-info-bg text-info-text border-info-border",
        error:
          "bg-error-bg text-error-text border-error-border",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
)
Badge.displayName = "Badge"

export { Badge, badgeVariants }
