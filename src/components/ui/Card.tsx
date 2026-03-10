import * as React from "react"
import { cn } from "@/lib/utils"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { hoverEffect?: boolean }
>(({ className, hoverEffect, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-[14px] border border-border bg-card text-card-foreground shadow-sm overflow-hidden",
      hoverEffect && "transition-[transform,box-shadow] duration-[0.18s] ease-out hover:-translate-y-0.5 hover:shadow-md",
      className
    )}
    {...props}
  />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("px-6 pt-5", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardBody = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6", className)} {...props} />
))
CardBody.displayName = "CardBody"

const CardContent = CardBody

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("px-6 py-4 bg-muted border-t border-muted", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardBody, CardContent, CardFooter }
