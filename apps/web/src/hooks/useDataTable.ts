"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const API_BASE =
  '/api';

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
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(defaultSortOrder);
  const [filters, setFiltersRaw] = useState<Record<string, string>>({});

  const [data, setData] = useState<PaginatedData<T> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Debounce search
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setSearch = useCallback((v: string) => {
    setSearchRaw(v);
    setPageRaw(1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(v), 300);
  }, []);

  const setPage = useCallback((p: number) => setPageRaw(p), []);

  const setPerPage = useCallback((n: number) => {
    setPerPageRaw(n);
    setPageRaw(1);
  }, []);

  const setFilter = useCallback((key: string, value: string) => {
    setFiltersRaw((prev) => ({ ...prev, [key]: value }));
    setPageRaw(1);
  }, []);

  const toggleSort = useCallback((key: string) => {
    setSortBy((prev) => {
      if (prev !== key) {
        setSortOrder("desc");
        return key;
      }
      return prev;
    });
    setSortOrder((prev) => {
      if (sortBy !== key) return "desc";
      return prev === "desc" ? "asc" : "desc";
    });
    setPageRaw(1);
  }, [sortBy]);

  const fetchData = useCallback(async () => {
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
      if (debouncedSearch) params.set("search", debouncedSearch);
      Object.entries(filters).forEach(([k, v]) => {
        if (v) params.set(k, v);
      });

      const res = await fetch(`${API_BASE}${endpoint}?${params}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: PaginatedData<T> = await res.json();
      setData(json);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [endpoint, page, perPage, debouncedSearch, sortBy, sortOrder, filters, JSON.stringify(extraParams)]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return {
    // State
    page,
    perPage,
    search,
    sortBy,
    sortOrder,
    filters,
    // Setters
    setPage,
    setPerPage,
    setSearch,
    setFilter,
    toggleSort,
    // Data
    data,
    loading,
    error,
    reload: fetchData,
  };
}
