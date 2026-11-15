'use client';

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';

import { cn } from '@/lib/cn';

export type BaggSelectOption = {
  label: string;
  value: string;
  disabled?: boolean;
};

export interface BaggSelectProps {
  label: string;
  value: string;
  options: BaggSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  optional?: boolean;
  error?: string;
  hint?: string;
  className?: string;
  hideLabel?: boolean;
  name?: string;
  id?: string;
  /** Adds a filter field to the menu. Use it for lists longer than about 8 options. */
  searchable?: boolean;
  /** full fills its container (default). auto sizes to the selected label. */
  width?: 'full' | 'auto';
}

export function BaggSelect({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select an option',
  disabled = false,
  readOnly = false,
  required = false,
  optional = false,
  error,
  hint,
  className,
  hideLabel = false,
  name,
  id: suppliedId,
  searchable = false,
  width = 'full',
}: BaggSelectProps) {
  const generatedId = useId();
  const id = suppliedId ?? generatedId;

  const labelId = `${id}-label`;
  const listboxId = `${id}-listbox`;
  const searchId = `${id}-search`;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [query, setQuery] = useState('');

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);
  const typeaheadRef = useRef('');
  const typeaheadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleOptions =
    searchable && normalizedQuery
      ? options.filter((option) =>
          option.label.toLocaleLowerCase().includes(normalizedQuery),
        )
      : options;

  const enabledOptions = visibleOptions
    .map((option, originalIndex) => ({
      option,
      originalIndex,
    }))
    .filter(({ option }) => !option.disabled);

  const selectedOption = options.find(
    (option) => option.value === value,
  );

  const selectedEnabledIndex = enabledOptions.findIndex(
    ({ option }) => option.value === value,
  );

  const activeOption = enabledOptions[activeIndex]?.option;
  const activeOptionEntry = enabledOptions[activeIndex];

  const describedBy = [
    hint ? hintId : undefined,
    error ? errorId : undefined,
  ]
    .filter(Boolean)
    .join(' ') || undefined;

  const isDisabled = disabled || readOnly;

  function openMenu(position: 'selected' | 'first' | 'last' = 'selected') {
    if (isDisabled || enabledOptions.length === 0) return;

    const nextIndex =
      position === 'first'
        ? 0
        : position === 'last'
          ? enabledOptions.length - 1
          : selectedEnabledIndex >= 0
            ? selectedEnabledIndex
            : 0;

    setActiveIndex(nextIndex);
    setOpen(true);
  }

  function closeMenu(restoreFocus = false) {
    setOpen(false);
    setQuery('');
    typeaheadRef.current = '';

    if (typeaheadTimerRef.current) {
      clearTimeout(typeaheadTimerRef.current);
      typeaheadTimerRef.current = null;
    }

    if (restoreFocus) {
      requestAnimationFrame(() => triggerRef.current?.focus());
    }
  }

  function chooseOption(option: BaggSelectOption) {
    if (isDisabled || option.disabled) return;

    onChange(option.value);
    closeMenu(true);
  }

  function moveActive(direction: 1 | -1) {
    if (enabledOptions.length === 0) return;

    setActiveIndex((current) => {
      if (current < 0) {
        return direction === 1 ? 0 : enabledOptions.length - 1;
      }

      return (
        current + direction + enabledOptions.length
      ) % enabledOptions.length;
    });
  }

  function findTypeaheadMatch(character: string) {
    const normalizedCharacter = character.toLocaleLowerCase();
    const currentQuery = typeaheadRef.current + normalizedCharacter;

    typeaheadRef.current = currentQuery;

    if (typeaheadTimerRef.current) {
      clearTimeout(typeaheadTimerRef.current);
    }

    typeaheadTimerRef.current = setTimeout(() => {
      typeaheadRef.current = '';
      typeaheadTimerRef.current = null;
    }, 700);

    const search = (needle: string, startIndex: number) => {
      for (let offset = 0; offset < enabledOptions.length; offset += 1) {
        const index = (startIndex + offset) % enabledOptions.length;
        const label = enabledOptions[index].option.label.toLocaleLowerCase();

        if (label.startsWith(needle)) return index;
      }

      return -1;
    };

    const startIndex = open
      ? Math.max(activeIndex, 0)
      : Math.max(selectedEnabledIndex, 0);

    // Repeated single-character input cycles through matching options.
    const needle = [...currentQuery].every(
      (item) => item === currentQuery[0],
    )
      ? currentQuery[0]
      : currentQuery;

    let match = search(needle, startIndex);

    // If a multi-character query has no match, retry using the latest key.
    if (match < 0 && needle.length > 1) {
      typeaheadRef.current = normalizedCharacter;
      match = search(normalizedCharacter, startIndex);
    }

    if (match >= 0) {
      setActiveIndex(match);
      setOpen(true);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (isDisabled) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();

        if (!open) {
          openMenu('selected');
        } else {
          moveActive(1);
        }
        break;

      case 'ArrowUp':
        event.preventDefault();

        if (!open) {
          openMenu('selected');
        } else {
          moveActive(-1);
        }
        break;

      case 'Home':
        event.preventDefault();

        if (!open) {
          openMenu('first');
        } else if (enabledOptions.length > 0) {
          setActiveIndex(0);
        }
        break;

      case 'End':
        event.preventDefault();

        if (!open) {
          openMenu('last');
        } else if (enabledOptions.length > 0) {
          setActiveIndex(enabledOptions.length - 1);
        }
        break;

      case 'Enter':
      case ' ':
        event.preventDefault();

        if (!open) {
          openMenu('selected');
        } else if (activeOption) {
          chooseOption(activeOption);
        }
        break;

      case 'Escape':
        if (open) {
          event.preventDefault();
          closeMenu(true);
        }
        break;

      case 'Tab':
        closeMenu();
        break;

      default:
        if (
          event.key.length === 1 &&
          !event.ctrlKey &&
          !event.metaKey &&
          !event.altKey
        ) {
          event.preventDefault();

          if (searchable) {
            setQuery(event.key);
            setActiveIndex(0);
            setOpen(true);
            return;
          }

          if (!open) {
            openMenu('selected');
          }

          findTypeaheadMatch(event.key);
        }
        break;
    }
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        moveActive(1);
        break;

      case 'ArrowUp':
        event.preventDefault();
        moveActive(-1);
        break;

      case 'Home':
        event.preventDefault();
        if (enabledOptions.length > 0) setActiveIndex(0);
        break;

      case 'End':
        event.preventDefault();
        if (enabledOptions.length > 0) {
          setActiveIndex(enabledOptions.length - 1);
        }
        break;

      case 'Enter':
        event.preventDefault();

        if (activeOption) {
          chooseOption(activeOption);
        } else if (enabledOptions.length === 1) {
          chooseOption(enabledOptions[0].option);
        }
        break;

      case 'Escape':
        event.preventDefault();
        closeMenu(true);
        break;

      case 'Tab':
        closeMenu();
        break;

      default:
        break;
    }
  }

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (
        rootRef.current &&
        !rootRef.current.contains(event.target as Node)
      ) {
        closeMenu();
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open || activeIndex < 0) return;

    const activeElement = listboxRef.current?.querySelector(
      `[data-option-index="${activeIndex}"]`,
    );

    activeElement?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  useEffect(() => {
    if (!open || !searchable) return;

    const frame = requestAnimationFrame(() => searchRef.current?.focus());

    return () => cancelAnimationFrame(frame);
  }, [open, searchable]);

  useEffect(() => {
    return () => {
      if (typeaheadTimerRef.current) {
        clearTimeout(typeaheadTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (open && enabledOptions.length === 0 && !searchable) {
      closeMenu();
    }

    if (activeIndex >= enabledOptions.length) {
      setActiveIndex(Math.max(enabledOptions.length - 1, -1));
    }
  }, [options, open, activeIndex, enabledOptions.length, searchable]);

  return (
    <div
      ref={rootRef}
      className={cn(
        'relative min-w-0',
        width === 'full' ? 'w-full' : 'w-auto',
        className,
      )}
    >
      <label
        id={labelId}
        htmlFor={`${id}-trigger`}
        className={cn(
          'block text-label font-medium text-text',
          hideLabel ? 'sr-only' : 'mb-1.5',
        )}
      >
        {label}

        {required && (
          <span className="ml-1 text-danger" aria-hidden="true">
            *
          </span>
        )}

        {optional && !required && (
          <span className="ml-1 text-caption font-normal text-text-muted">
            (optional)
          </span>
        )}
      </label>

      <button
        ref={triggerRef}
        id={`${id}-trigger`}
        type="button"
        role="combobox"
        className={cn(
          'flex min-h-11 w-full items-center justify-between gap-3',
          'rounded-input border-brut-thin border-ink bg-surface px-3',
          'text-left text-body-l text-text',
          'transition-colors hover:bg-surface-tint',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-danger',
          readOnly && 'cursor-default opacity-80 hover:bg-surface',
        )}
        aria-labelledby={labelId}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={
          open && !searchable && activeOptionEntry
            ? `${id}-option-${activeOptionEntry.originalIndex}`
            : undefined
        }
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        aria-readonly={readOnly || undefined}
        disabled={disabled}
        onClick={() => {
          if (isDisabled) return;

          if (open) {
            closeMenu();
          } else {
            setQuery('');
            openMenu('selected');
          }
        }}
        onKeyDown={handleKeyDown}
      >
        <span
          className={cn(
            'truncate',
            selectedOption ? 'font-medium' : 'font-normal text-text-muted',
          )}
        >
          {selectedOption?.label ?? placeholder}
        </span>

        <svg
          aria-hidden="true"
          className={cn(
            'h-[18px] w-[18px] shrink-0 text-text-soft transition-transform duration-150',
            open && 'rotate-180',
          )}
          viewBox="0 0 20 20"
          fill="none"
        >
          <path
            d="m5 7.5 5 5 5-5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {name && (
        <input
          type="hidden"
          name={name}
          value={value}
          disabled={disabled}
        />
      )}

      {open && (
        <div
          className={cn(
            'absolute left-0 top-[calc(100%+0.375rem)] z-50 w-full',
            'border-brut border-ink bg-surface shadow-brut',
          )}
        >
          {searchable && (
            <div className="border-b border-line-subtle p-2">
              <input
                ref={searchRef}
                id={searchId}
                type="text"
                role="combobox"
                aria-label={`Search ${label.toLocaleLowerCase()}`}
                aria-autocomplete="list"
                aria-expanded="true"
                aria-controls={listboxId}
                aria-activedescendant={
                  activeOptionEntry
                    ? `${id}-option-${activeOptionEntry.originalIndex}`
                    : undefined
                }
                autoComplete="off"
                spellCheck={false}
                value={query}
                placeholder="Search…"
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={handleSearchKeyDown}
                className={cn(
                  'block min-h-10 w-full rounded-input border-brut-thin border-ink',
                  'bg-surface px-3 text-body-l text-text',
                  'placeholder:text-text-muted',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
                )}
              />
            </div>
          )}

          <ul
            ref={listboxRef}
            id={listboxId}
            className="max-h-72 overflow-y-auto p-1"
            role="listbox"
            aria-labelledby={labelId}
            aria-required={required || undefined}
          >
            {visibleOptions.length === 0 && (
              <li className="px-3 py-4 text-center text-body text-text-muted">
                No matches.
              </li>
            )}

            {visibleOptions.map((option, index) => {
              const enabledIndex = enabledOptions.findIndex(
                ({ option: enabledOption }) =>
                  enabledOption.value === option.value,
              );

              const selected = option.value === value;
              const active = enabledIndex === activeIndex;

              return (
                <li
                  key={option.value}
                  id={`${id}-option-${index}`}
                  className={cn(
                    'flex min-h-11 cursor-pointer items-center justify-between gap-4',
                    'px-3 py-2 text-body',
                    selected ? 'font-extrabold' : 'font-medium',
                    active && 'bg-peach',
                    option.disabled &&
                      'cursor-not-allowed opacity-45 hover:bg-transparent',
                  )}
                  role="option"
                  aria-selected={selected}
                  aria-disabled={option.disabled || undefined}
                  data-option-index={
                    enabledIndex >= 0 ? enabledIndex : undefined
                  }
                  onMouseEnter={() => {
                    if (!option.disabled && enabledIndex >= 0) {
                      setActiveIndex(enabledIndex);
                    }
                  }}
                  onPointerDown={(event) => {
                    // Keep DOM focus on the search field or combobox trigger.
                    event.preventDefault();
                  }}
                  onClick={() => chooseOption(option)}
                >
                  <span className="min-w-0 truncate">{option.label}</span>

                  {selected && (
                    <svg
                      aria-hidden="true"
                      className="h-[18px] w-[18px] shrink-0 text-mango"
                      viewBox="0 0 20 20"
                      fill="none"
                    >
                      <path
                        d="m4 10 4 4 8-8"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {hint && (
        <p id={hintId} className="mt-1.5 text-caption text-text-muted">
          {hint}
        </p>
      )}

      {error && (
        <p
          id={errorId}
          role="alert"
          className="mt-1.5 text-caption font-medium text-danger"
        >
          {error}
        </p>
      )}
    </div>
  );
}
