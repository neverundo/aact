"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

const COLLAPSED_KEY = "aact.shell.collapsed";

export type DrawerState = {
  id: string;
  title: string;
  description?: string;
  content: ReactNode;
} | null;

type ShellContextValue = {
  collapsed: boolean;
  mobileOpen: boolean;
  drawer: DrawerState;
  setCollapsed: (value: boolean) => void;
  toggleCollapsed: () => void;
  setMobileOpen: (value: boolean) => void;
  openDrawer: (drawer: NonNullable<DrawerState>) => void;
  closeDrawer: () => void;
};

const ShellContext = createContext<ShellContextValue | null>(null);

function subscribeCollapsed(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}

function getCollapsedSnapshot() {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

function getCollapsedServerSnapshot() {
  return false;
}

function writeCollapsed(value: boolean) {
  try {
    localStorage.setItem(COLLAPSED_KEY, value ? "1" : "0");
    window.dispatchEvent(new Event("storage"));
  } catch {
    /* ignore */
  }
}

export function ShellProvider({ children }: { children: ReactNode }) {
  const collapsed = useSyncExternalStore(
    subscribeCollapsed,
    getCollapsedSnapshot,
    getCollapsedServerSnapshot,
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const [drawer, setDrawer] = useState<DrawerState>(null);

  const setCollapsed = useCallback((value: boolean) => {
    writeCollapsed(value);
  }, []);

  const toggleCollapsed = useCallback(() => {
    writeCollapsed(!getCollapsedSnapshot());
  }, []);

  const openDrawer = useCallback((next: NonNullable<DrawerState>) => {
    setDrawer(next);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawer(null);
  }, []);

  const value = useMemo(
    () => ({
      collapsed,
      mobileOpen,
      drawer,
      setCollapsed,
      toggleCollapsed,
      setMobileOpen,
      openDrawer,
      closeDrawer,
    }),
    [
      collapsed,
      mobileOpen,
      drawer,
      setCollapsed,
      toggleCollapsed,
      openDrawer,
      closeDrawer,
    ],
  );

  return (
    <ShellContext.Provider value={value}>{children}</ShellContext.Provider>
  );
}

export function useShell(): ShellContextValue {
  const ctx = useContext(ShellContext);
  if (!ctx) {
    throw new Error("useShell must be used within ShellProvider");
  }
  return ctx;
}
