import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        success: "border-transparent bg-green-500 text-white hover:bg-green-600",
        warning: "border-transparent bg-yellow-500 text-white hover:bg-yellow-600",
        info: "border-transparent bg-blue-500 text-white hover:bg-blue-600",
        pending: "border-transparent bg-orange-500 text-white hover:bg-orange-600",
        completed: "border-transparent bg-purple-500 text-white hover:bg-purple-600",
        cancelled: "border-transparent bg-gray-500 text-white hover:bg-gray-600",
      },
      size: {
        default: "text-xs px-2.5 py-0.5",
        sm: "text-xs px-2 py-0",
        lg: "text-sm px-3 py-1",
        xl: "text-base px-4 py-1.5",
      },
      dot: {
        true: "pl-1.5",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      dot: false,
    },
  }
)

type BadgeVariantProps = VariantProps<typeof badgeVariants>

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    BadgeVariantProps {
  dotColor?: string
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, size, dot, dotColor, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(badgeVariants({ variant, size, dot }), className)}
        {...props}
      >
        {dot && (
          <span
            className={cn(
              "mr-1.5 h-1.5 w-1.5 rounded-full",
              dotColor || "bg-current"
            )}
          />
        )}
        {children}
      </div>
    )
  }
)
Badge.displayName = "Badge"

export { Badge, badgeVariants }
