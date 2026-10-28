
'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

type BreadcrumbContextValue = {
  currentLabel: string | null;
  setCurrentLabel: (label: string | null) => void;
};

const BreadcrumbContext = createContext<BreadcrumbContextValue | null>(null);

export function BreadcrumbProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [currentLabel, setCurrentLabelState] = useState<string | null>(null);

  const setCurrentLabel = useCallback((label: string | null) => {
    setCurrentLabelState(label?.trim() || null);
  }, []);

  const value = useMemo(
    () => ({ currentLabel, setCurrentLabel }),
    [currentLabel, setCurrentLabel],
  );

  return (
    <BreadcrumbContext.Provider value={value}>
      {children}
    </BreadcrumbContext.Provider>
  );
}

export function useCurrentBreadcrumb() {
  const context = useContext(BreadcrumbContext);

  if (!context) {
    throw new Error(
      'useCurrentBreadcrumb must be used inside BreadcrumbProvider',
    );
  }

  return context;
}
