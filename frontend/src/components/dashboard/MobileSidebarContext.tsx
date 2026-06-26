import { createContext, useContext, useState, type ReactNode } from "react";

interface MobileSidebarContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const MobileSidebarContext = createContext<MobileSidebarContextValue | undefined>(undefined);

/**
 * Shares the mobile sidebar's open/closed state between Topbar (which
 * renders the hamburger trigger) and Sidebar (which renders as an
 * off-canvas drawer below the `md` breakpoint). Scoped to one
 * StudioLayout instance rather than global app state, since it's purely
 * a transient UI affordance.
 */
export function MobileSidebarProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const value: MobileSidebarContextValue = {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen((v) => !v),
  };

  return <MobileSidebarContext.Provider value={value}>{children}</MobileSidebarContext.Provider>;
}

export function useMobileSidebar(): MobileSidebarContextValue {
  const ctx = useContext(MobileSidebarContext);
  if (!ctx) {
    throw new Error("useMobileSidebar must be used within a MobileSidebarProvider");
  }
  return ctx;
}
