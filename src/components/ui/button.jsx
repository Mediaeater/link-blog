import React from "react"
import { cn } from "../../lib/utils"

// Pilot component for the Acme design system token layer.
// All colors resolve through CSS custom properties (--acme-*) so dark
// mode flips automatically via the .dark class on <html>. See
// src/index.css for the token definitions.

const Button = React.forwardRef(({ className, variant = "default", size = "default", ...props }, ref) => {
  const variants = {
    default:
      "bg-[rgb(var(--acme-clay))] text-[rgb(var(--acme-ivory))] hover:bg-[rgb(var(--acme-clay)/0.9)]",
    destructive:
      "bg-[rgb(var(--acme-danger))] text-[rgb(var(--acme-ivory))] hover:bg-[rgb(var(--acme-danger)/0.9)]",
    outline:
      "border border-[rgb(var(--acme-gray-300))] bg-transparent text-[rgb(var(--acme-slate))] hover:bg-[rgb(var(--acme-oat)/0.6)] hover:border-[rgb(var(--acme-gray-400))]",
    secondary:
      "bg-[rgb(var(--acme-oat))] text-[rgb(var(--acme-slate))] hover:bg-[rgb(var(--acme-oat)/0.75)]",
    ghost:
      "bg-transparent text-[rgb(var(--acme-slate))] hover:bg-[rgb(var(--acme-oat)/0.5)]",
    link:
      "bg-transparent text-[rgb(var(--acme-slate))] underline-offset-4 hover:underline"
  }

  const sizes = {
    default: "h-10 px-4 py-2",
    sm: "h-9 rounded-[var(--acme-radius-md)] px-3",
    lg: "h-11 rounded-[var(--acme-radius-md)] px-8",
    icon: "h-10 w-10"
  }

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-[var(--acme-radius-md)] text-sm font-[var(--acme-fw-medium)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--acme-clay)/0.5)] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--acme-ivory))] disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Button.displayName = "Button"

export { Button }
