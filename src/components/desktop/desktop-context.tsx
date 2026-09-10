"use client";

import { createContext, useContext } from "react";

export type DesktopWindowControls = {
  isMinimized: boolean;
  closeWindow: () => void;
  minimizeWindow: () => void;
};

export const DesktopWindowContext = createContext<DesktopWindowControls | null>(null);

export function useDesktopWindow() {
  const controls = useContext(DesktopWindowContext);
  if (!controls) throw new Error("useDesktopWindow must be used inside PublicDesktopLayout");
  return controls;
}

