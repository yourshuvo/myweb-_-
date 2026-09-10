import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function RetroButton({ className, type = "button", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type={type} className={cn("retro-button", className)} {...props} />;
}
