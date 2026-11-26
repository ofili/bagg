'use client';

import { useState } from 'react';
import {
  ArrowSquareOut,
  Check,
  Copy,
  X,
} from '@phosphor-icons/react';
import { Button, buttonStyles, Card } from '@/components/ui';
import { formatDate } from '@/lib/date';

export interface ApprovalLinkPanelProps {
  title: string;
  description: string;
  url: string;
  expiresAt?: string | null;
  onDismiss: () => void;
}

/**
 * Shows a client approval link immediately after it is created or regenerated.
 *
 * The backend stores only a hash, so this is the only time the raw link can be
 * displayed. The provider can copy it or open the client page directly.
 */
export function ApprovalLinkPanel({
  title,
  description,
  url,
  expiresAt,
  onDismiss,
}: ApprovalLinkPanelProps) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setCopyError(null);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyError(
        'Could not copy the link. Select the URL and copy it manually.',
      );
    }
  }

  return (
    <Card className="mb-6 border-ink bg-mango/20 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-h3 font-bold text-text">{title}</h2>
          <p className="mt-1 text-body text-text-muted">{description}</p>

          <code className="mt-3 block break-all rounded-btn border-brut-thin border-ink bg-surface px-3 py-2 text-caption text-text">
            {url}
          </code>

          {expiresAt && (
            <p className="mt-2 text-caption text-text-muted">
              Expires {formatDate(expiresAt)}.
            </p>
          )}

          {copyError && (
            <p className="mt-2 text-caption font-semibold text-danger">
              {copyError}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={handleCopy}>
            {copied ? (
              <Check aria-hidden className="h-4 w-4" />
            ) : (
              <Copy aria-hidden className="h-4 w-4" />
            )}
            {copied ? 'Copied' : 'Copy link'}
          </Button>

          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonStyles({ variant: 'outline', zone: 'calm' })}
          >
            <ArrowSquareOut aria-hidden className="h-4 w-4" />
            Open
          </a>

          <Button
            variant="ghost"
            onClick={onDismiss}
            aria-label="Dismiss approval link"
          >
            <X aria-hidden className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
