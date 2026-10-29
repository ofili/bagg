"use client";

import { Search } from "lucide-react";
import { inputStyles } from "./Input";
import { cn } from "@/lib/cn";

type SearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
};

export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  className,
  id,
}: SearchInputProps) {
  return (
    <label className={cn("relative flex items-center", className)}>
      <Search
        aria-hidden
        className="pointer-events-none absolute left-3 h-4 w-4 text-text-muted"
      />
      <input
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(inputStyles, "pl-9 w-full")}
      />
    </label>
  );
}
