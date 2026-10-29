"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

export type BaggSelectOption = {
  label: string;
  value: string;
  disabled?: boolean;
};

type BaggSelectProps = {
  label: string;
  value: string;
  options: BaggSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  hideLabel?: boolean;
};

export function BaggSelect({
  label,
  value,
  options,
  onChange,
  placeholder = "Select an option",
  disabled = false,
  className = "",
  hideLabel = false,
}: BaggSelectProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);

  const id = useId();
  const labelId = `${id}-label`;
  const listboxId = `${id}-listbox`;

  const selectedOption = options.find(
    (option) => option.value === value,
  );

  const enabledOptions = options.filter(
    (option) => !option.disabled,
  );

  const selectedIndex = enabledOptions.findIndex(
    (option) => option.value === value,
  );

  function openMenu() {
    if (disabled) return;

    setActiveIndex(Math.max(selectedIndex, 0));
    setOpen(true);
  }

  function closeMenu(restoreFocus = false) {
    setOpen(false);

    if (restoreFocus) {
      requestAnimationFrame(() => triggerRef.current?.focus());
    }
  }

  function chooseOption(option: BaggSelectOption) {
    if (option.disabled) return;

    onChange(option.value);
    closeMenu(true);
  }

  function moveActive(direction: 1 | -1) {
    if (enabledOptions.length === 0) return;

    setActiveIndex((current) => {
      const next = current + direction;

      if (next < 0) return enabledOptions.length - 1;
      if (next >= enabledOptions.length) return 0;

      return next;
    });
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLButtonElement>,
  ) {
    if (disabled) return;

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();

        if (!open) {
          openMenu();
        } else {
          moveActive(1);
        }
        break;

      case "ArrowUp":
        event.preventDefault();

        if (!open) {
          openMenu();
        } else {
          moveActive(-1);
        }
        break;

      case "Enter":
      case " ":
        event.preventDefault();

        if (!open) {
          openMenu();
        } else if (enabledOptions[activeIndex]) {
          chooseOption(enabledOptions[activeIndex]);
        }
        break;

      case "Escape":
        if (open) {
          event.preventDefault();
          closeMenu(true);
        }
        break;

      case "Home":
        if (open) {
          event.preventDefault();
          setActiveIndex(0);
        }
        break;

      case "End":
        if (open) {
          event.preventDefault();
          setActiveIndex(enabledOptions.length - 1);
        }
        break;

      case "Tab":
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

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeMenu(true);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener(
        "pointerdown",
        handlePointerDown,
      );
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const activeOption = listboxRef.current?.querySelector(
      `[data-option-index="${activeIndex}"]`,
    );

    activeOption?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  return (
    <div
      ref={rootRef}
      className={`bagg-select ${className}`}
    >
      <span id={labelId} className={hideLabel ? "sr-only" : "bagg-select__label"}>
        {label}
      </span>

      <button
        ref={triggerRef}
        type="button"
        className="bagg-select__trigger"
        aria-labelledby={labelId}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        disabled={disabled}
        onClick={() => {
          if (open) {
            closeMenu();
          } else {
            openMenu();
          }
        }}
        onKeyDown={handleKeyDown}
      >
        <span
          className={
            selectedOption
              ? "bagg-select__value"
              : "bagg-select__placeholder"
          }
        >
          {selectedOption?.label ?? placeholder}
        </span>

        <svg
          className={`bagg-select__chevron ${
            open ? "bagg-select__chevron--open" : ""
          }`}
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
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

      {open && (
        <ul
          ref={listboxRef}
          id={listboxId}
          className="bagg-select__menu"
          role="listbox"
          aria-labelledby={labelId}
        >
          {options.map((option) => {
            const index = enabledOptions.findIndex(
              (item) => item.value === option.value,
            );

            const selected = option.value === value;
            const active = index === activeIndex;

            return (
              <li
                key={option.value}
                className={[
                  "bagg-select__option",
                  selected
                    ? "bagg-select__option--selected"
                    : "",
                  active ? "bagg-select__option--active" : "",
                  option.disabled
                    ? "bagg-select__option--disabled"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                role="option"
                aria-selected={selected}
                aria-disabled={option.disabled || undefined}
                data-option-index={
                  index >= 0 ? index : undefined
                }
                onMouseEnter={() => {
                  if (!option.disabled && index >= 0) {
                    setActiveIndex(index);
                  }
                }}
                onPointerDown={(event) => {
                  // Keep focus on the trigger until selection.
                  event.preventDefault();
                }}
                onClick={() => chooseOption(option)}
              >
                <span>{option.label}</span>

                {selected && (
                  <svg
                    className="bagg-select__check"
                    viewBox="0 0 20 20"
                    fill="none"
                    aria-hidden="true"
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
      )}
    </div>
  );
}