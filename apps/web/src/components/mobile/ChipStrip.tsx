'use client';

import { cn } from '@/lib/utils';
import { useState, useCallback, useRef } from 'react';

interface Chip {
  value: string;
  label: string;
  count?: number;
}

interface ChipStripProps {
  chips: Chip[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function ChipStrip({ chips, value, onChange, className }: ChipStripProps) {
  const [scrollLeft, setScrollLeft] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const scrollBy = useCallback((amount: number) => {
    if (containerRef.current) {
      containerRef.current.scrollBy({ left: amount, behavior: 'smooth' });
      setScrollLeft((prev) => prev + amount);
    }
  }, []);

  const handleSelect = (chipValue: string) => {
    if (chipValue !== value) {
      onChange(chipValue);
    }
  };

  return (
    <div className={cn('relative', className)}>
      <div
        ref={containerRef}
        className="flex gap-2 overflow-x-auto scroll-snap-none pb-2 sm:pb-0 scrollbar-hide"
        onScroll={(e) => setScrollLeft(e.currentTarget.scrollLeft)}
      >
        {chips.map((chip) => {
          const isActive = chip.value === value;
          return (
            <button
              key={chip.value}
              onClick={() => handleSelect(chip.value)}
              aria-pressed={isActive}
              className={`snap-start shrink-0 whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                isActive
                  ? 'bg-neutral-900 text-white border-neutral-900'
                  : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50 hover:text-neutral-800'
              }`}
            >
              {chip.label}
              {chip.count !== undefined && (
                <span className="ml-1 text-[10px] font-normal opacity-70">{chip.count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Scroll indicators */}
      <div className="flex justify-between px-2 py-1 text-[10px] text-neutral-400">
        {scrollLeft > 0 ? (
          <button
            onClick={() => scrollBy(-120)}
            className="p-1.5 hover:bg-neutral-100 rounded-full transition"
            aria-label="Scroll left"
          >
            <span className="sr-only">Scroll left</span>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        ) : null}
        {scrollLeft < 100 ? (
          <button
            onClick={() => scrollBy(120)}
            className="p-1.5 hover:bg-neutral-100 rounded-full transition"
            aria-label="Scroll right"
          >
            <span className="sr-only">Scroll right</span>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ) : null}
      </div>
    </div>
  );
}
