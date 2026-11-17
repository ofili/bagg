'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { usePathname } from 'next/navigation';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'bagg-theme';

export function isLightOnlyPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  if (pathname === '/') return true;
  return /^\/(about|pricing|contact|freelancers|creatives|consultants|studios|help|security|legal|features|login|signup|onboarding)(\/|$)/.test(
    pathname,
  );
}

export const isMarketingPath = isLightOnlyPath;

type ThemeContextValue = {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference === 'light' || preference === 'dark') {
    return preference;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function applyTheme(theme: ResolvedTheme) {
  document.documentElement.dataset.theme = theme;
}

export function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isMarketing = isMarketingPath(pathname);

  const [preference, setPreferenceState] =
    useState<ThemePreference>('system');

  const [resolvedTheme, setResolvedTheme] =
    useState<ResolvedTheme>('light');

  const preferenceRef = useRef<ThemePreference>('system');

  const updatePreference = useCallback(
    (nextPreference: ThemePreference) => {
      preferenceRef.current = nextPreference;
      setPreferenceState(nextPreference);

      try {
        window.localStorage.setItem(STORAGE_KEY, nextPreference);
      } catch {
        // The current session still works if storage is unavailable.
      }

      const nextTheme = resolveTheme(nextPreference);

      if (!isMarketingPath(window.location.pathname)) {
        applyTheme(nextTheme);
      } else {
        applyTheme('light');
      }
      setResolvedTheme(nextTheme);
    },
    [],
  );

  useEffect(() => {
    if (isMarketing) {
      applyTheme('light');
    } else {
      const nextTheme = resolveTheme(preferenceRef.current);
      applyTheme(nextTheme);
      setResolvedTheme(nextTheme);
    }
  }, [isMarketing, pathname]);

  useEffect(() => {
    const mediaQuery = window.matchMedia(
      '(prefers-color-scheme: dark)',
    );

    function loadStoredPreference(): ThemePreference {
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY);

        return isThemePreference(stored) ? stored : 'system';
      } catch {
        return 'system';
      }
    }

    const initialPreference = loadStoredPreference();
    const initialTheme =
      initialPreference === 'system'
        ? mediaQuery.matches
          ? 'dark'
          : 'light'
        : initialPreference;

    preferenceRef.current = initialPreference;
    setPreferenceState(initialPreference);
    setResolvedTheme(initialTheme);

    if (isMarketingPath(window.location.pathname)) {
      applyTheme('light');
    } else {
      applyTheme(initialTheme);
    }

    function handleSystemChange(event: MediaQueryListEvent) {
      if (preferenceRef.current !== 'system') {
        return;
      }

      const nextTheme: ResolvedTheme = event.matches
        ? 'dark'
        : 'light';

      if (!isMarketingPath(window.location.pathname)) {
        applyTheme(nextTheme);
      }
      setResolvedTheme(nextTheme);
    }

    function handleStorage(event: StorageEvent) {
      if (event.key !== STORAGE_KEY && event.key !== null) {
        return;
      }

      const nextPreference = isThemePreference(event.newValue)
        ? event.newValue
        : 'system';

      preferenceRef.current = nextPreference;
      setPreferenceState(nextPreference);

      const nextTheme =
        nextPreference === 'system'
          ? mediaQuery.matches
            ? 'dark'
            : 'light'
          : nextPreference;

      if (!isMarketingPath(window.location.pathname)) {
        applyTheme(nextTheme);
      }
      setResolvedTheme(nextTheme);
    }

    mediaQuery.addEventListener('change', handleSystemChange);
    window.addEventListener('storage', handleStorage);

    return () => {
      mediaQuery.removeEventListener('change', handleSystemChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const value = useMemo(
    () => ({
      preference,
      resolvedTheme,
      setPreference: updatePreference,
    }),
    [preference, resolvedTheme, updatePreference],
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error(
      'useTheme must be used within a ThemeProvider.',
    );
  }

  return context;
}
