"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";

export function SubmitButton({
  children,
  pendingText,
  className = "",
  variant,
  "aria-label": ariaLabel,
}: {
  children: React.ReactNode;
  pendingText: string;
  className?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  "aria-label"?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className={className} variant={variant} aria-label={ariaLabel}>
      {pending ? pendingText : children}
    </Button>
  );
}
