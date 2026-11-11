
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const API_BASE = "/api";

export type PaginatedData<T> = {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
};

type UseDataTableConfig = {
  endpoint: string;
  defaultSortBy?: string;
  defaultSortOrder?: "asc" | "desc";
  defaultPerPage?: number;
  extraParams?: Record<string, string>;
};

export function useDataTable<T>(config: UseDataTableConfig) {
  const {
    endpoint,
    defaultSortBy = "created_at",
    defaultSortOrder = "desc",
    defaultPerPage = 20,
    extraParams = {},
  } = config;

  const [page, setPageRaw] = useState(1);
  const [perPage, setPerPageRaw] = useState(defaultPerPage);
  const [search, setSearchRaw] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState(defaultSortBy);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(
    defaultSortOrder,
  );
  const [filters, setFiltersRaw] = useState<Record<string, string>>({});

  const [data, setData] = useState<PaginatedData<T> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  const setSearch = useCallback((value: string) => {
    setSearchRaw(value);
    setPageRaw(1);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(value);
      debounceRef.current = null;
    }, 300);
  }, []);

  const setPage = useCallback((value: number) => {
    setPageRaw(value);
  }, []);

  const setPerPage = useCallback((value: number) => {
    setPerPageRaw(value);
    setPageRaw(1);
  }, []);

  const setFilter = useCallback((key: string, value: string) => {
    setFiltersRaw((previous) => ({
      ...previous,
      [key]: value,
    }));
    setPageRaw(1);
  }, []);

  const toggleSort = useCallback(
    (key: string) => {
      setSortBy((previous) => {
        if (previous !== key) {
          setSortOrder("desc");
          return key;
        }

        setSortOrder((order) =>
          order === "desc" ? "asc" : "desc",
        );

        return previous;
      });

      setPageRaw(1);
    },
    [],
  );

  const extraParamsKey = JSON.stringify(extraParams);

  const fetchData = useCallback(async () => {
    abortRef.current?.abort();

    const controller = new AbortController();
    abortRef.current = controller;

    const requestId = ++requestIdRef.current;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: String(page),
        per_page: String(perPage),
        sort_by: sortBy,
        sort_order: sortOrder,
        ...extraParams,
      });

      if (debouncedSearch) {
        params.set("search", debouncedSearch);
      }

      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          params.set(key, value);
        }
      });

      const response = await fetch(
        `${API_BASE}${endpoint}?${params}`,
        {
          credentials: "include",
          signal: controller.signal,
          headers: {
            Accept: "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const json: PaginatedData<T> = await response.json();

      if (
        !controller.signal.aborted &&
        requestId === requestIdRef.current
      ) {
        setData(json);
      }
    } catch (cause: unknown) {
      if (
        controller.signal.aborted ||
        requestId !== requestIdRef.current
      ) {
        return;
      }

      setError(
        cause instanceof Error
          ? cause.message
          : "Failed to load data",
      );
    } finally {
      if (
        !controller.signal.aborted &&
        requestId === requestIdRef.current
      ) {
        setLoading(false);
      }
    }
  }, [
    endpoint,
    page,
    perPage,
    debouncedSearch,
    sortBy,
    sortOrder,
    filters,
    extraParamsKey,
  ]);

  useEffect(() => {
    void fetchData();

    return () => {
      abortRef.current?.abort();
    };
  }, [fetchData]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return {
    page,
    perPage,
    search,
    sortBy,
    sortOrder,
    filters,

    setPage,
    setPerPage,
    setSearch,
    setFilter,
    toggleSort,

    data,
    loading,
    error,
    reload: fetchData,
  };
}
