"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

type ThemeCtx = { dark: boolean; toggle: () => void };
const Ctx = createContext<ThemeCtx>({ dark: false, toggle: () => {} });

const STORAGE_KEY = "bs-theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [dark, setDark] = useState(false);

  // Restore persisted preference (the original theme reset on reload; we improve it).
  useEffect(() => {
    setDark(localStorage.getItem(STORAGE_KEY) === "dark");
  }, []);

  const toggle = useCallback(() => {
    setDark((d) => {
      const next = !d;
      localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
      return next;
    });
  }, []);

  return <Ctx.Provider value={{ dark, toggle }}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);

/**
 * Root page wrapper that reproduces the theme's dark-mode mechanism:
 * add the `_dark_wrapper` class to `_layout_main_wrapper` when dark is on.
 */
export function LayoutWrapper({
  className,
  children,
}: {
  className: string;
  children: React.ReactNode;
}) {
  const { dark } = useTheme();
  return (
    <div className={`${className}${dark ? " _dark_wrapper" : ""}`}>
      {children}
    </div>
  );
}
