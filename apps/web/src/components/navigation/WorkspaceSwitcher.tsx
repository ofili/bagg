'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Buildings,
  CaretUpDown,
  Check,
  Gear,
  Plus,
  Sparkle,
} from '@phosphor-icons/react';
import { UpgradeModal } from '@/components/billing';
import { cn } from '@/lib/cn';

const API_BASE = '/api';

interface WorkspaceSwitcherProps {
  businessName: string;
}

export function WorkspaceSwitcher({ businessName }: WorkspaceSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showPlansModal, setShowPlansModal] = useState(false);
  const [tier, setTier] = useState<string>('free');
  const containerRef = useRef<HTMLDivElement>(null);

  const displayName = businessName?.trim() || 'Your business';

  useEffect(() => {
    let live = true;
    fetch(`${API_BASE}/billing/subscription`, {
      credentials: 'include',
      cache: 'no-store',
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!live || !data) return;
        if (data.tier) setTier(data.tier);
      })
      .catch(() => {});

    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setShowUpgradeModal(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        setShowUpgradeModal(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const planLabel =
    tier === 'creator_pro'
      ? 'Creator Pro'
      : tier === 'professional'
        ? 'Professional'
        : 'Free plan';

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Current workspace: ${displayName}. Click to switch workspace.`}
        onClick={() => {
          setOpen((prev) => !prev);
          setShowUpgradeModal(false);
        }}
        className={cn(
          'flex max-w-[240px] items-center gap-2 rounded-btn border-brut-thin border-ink bg-surface px-3 py-1.5 text-left transition-colors',
          'hover:bg-surface-tint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
          open && 'bg-surface-tint shadow-brut-sm',
        )}
      >
        <Buildings
          aria-hidden
          weight="duotone"
          className="h-4 w-4 shrink-0 text-ink"
        />

        <span className="truncate text-body font-extrabold text-ink">
          {displayName}
        </span>

        <CaretUpDown
          aria-hidden
          className="h-3.5 w-3.5 shrink-0 text-text-muted"
        />
      </button>

      {open && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute left-0 top-full z-50 mt-2 w-72 border-brut border-ink bg-surface shadow-brut"
        >
          {/* Active Workspace Header */}
          <div className="border-b border-line-subtle bg-surface-tint p-3">
            <p className="text-caption font-bold uppercase tracking-wide text-text-muted">
              Current workspace
            </p>
            <div className="mt-1 flex items-center justify-between gap-2">
              <span className="truncate font-extrabold text-body text-ink">
                {displayName}
              </span>
              <span className="shrink-0 rounded-full border-brut-thin border-ink bg-surface px-2 py-0.5 text-caption font-extrabold text-text">
                {planLabel}
              </span>
            </div>
          </div>

          {/* Workspaces List */}
          <div className="p-2 space-y-1.5">
            <div className="flex items-center justify-between rounded-btn border-brut-thin border-ink bg-surface px-3 py-2 text-body font-extrabold text-ink">
              <div className="flex items-center gap-2 truncate">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-mango text-[11px] font-extrabold text-on-mango">
                  {displayName.charAt(0).toUpperCase()}
                </span>
                <span className="truncate">{displayName}</span>
              </div>
              <Check aria-hidden weight="bold" className="h-4 w-4 shrink-0 text-leaf" />
            </div>

            {/* Upgrade CTA if on Free or Creator Pro */}
            {tier !== 'professional' && (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setShowPlansModal(true);
                }}
                className="flex w-full items-center justify-between rounded-btn border-brut-thin border-ink bg-sun px-2.5 py-1.5 text-caption font-extrabold text-ink shadow-brut-sm transition-transform active:translate-x-0.5 active:translate-y-0.5"
              >
                <span className="flex items-center gap-1.5">
                  <Sparkle weight="fill" className="h-3.5 w-3.5 text-ink" />
                  {tier === 'free' ? 'Upgrade plan' : 'Upgrade to Professional'}
                </span>
                <span className="border border-ink bg-surface px-1 py-0.2 text-[9px] font-black uppercase text-ink">
                  Save 17%
                </span>
              </button>
            )}

            {/* Add Workspace Action */}
            <button
              type="button"
              onClick={() => setShowUpgradeModal((prev) => !prev)}
              className={cn(
                'flex w-full items-center justify-between rounded-btn border border-dashed border-ink/40 p-2 text-caption font-extrabold text-text-soft transition-colors',
                'hover:border-ink hover:bg-surface-tint hover:text-ink',
              )}
            >
              <span className="flex items-center gap-1.5">
                <Plus aria-hidden className="h-3.5 w-3.5" />
                Add another workspace
              </span>
              <span className="rounded-full bg-peach px-1.5 py-0.5 text-[10px] font-extrabold text-ink">
                Studio
              </span>
            </button>

            {showUpgradeModal && (
              <div className="rounded border-brut-thin border-ink bg-peach p-2.5 text-caption">
                <div className="flex items-center gap-1.5 font-extrabold text-ink">
                  <Sparkle weight="fill" className="h-3.5 w-3.5 text-mango" />
                  Multiple workspaces
                </div>
                <p className="mt-1 text-text-soft">
                  Multiple workspaces and team access are reserved for the upcoming <strong>Studio plan</strong>. Current plans (Free, Creator Pro, Professional) support one workspace.
                </p>
              </div>
            )}
          </div>

          {/* Quick Settings Action */}
          <div className="border-t border-line-subtle p-2">
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-btn px-2.5 py-2 text-caption font-extrabold text-text-soft transition-colors hover:bg-surface-tint hover:text-ink"
            >
              <Gear aria-hidden className="h-4 w-4" />
              Workspace settings
            </Link>
          </div>
        </div>
      )}

      <UpgradeModal
        open={showPlansModal}
        onClose={() => setShowPlansModal(false)}
        currentTier={tier}
        returnPath="/dashboard"
      />
    </div>
  );
}
