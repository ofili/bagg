
'use client';

import { useCallback, useEffect, useState } from 'react';

type DocumentType = 'invoice' | 'quote' | 'receipt';

type GenerationStatus =
  | 'pending'
  | 'processing'
  | 'succeeded'
  | 'failed';

interface DocumentGenerationStatus {
  job_id: string;
  document_type: DocumentType;
  source_id: string;
  source_version: number;
  issuance_generation: number;
  artifact_kind: string;
  status: GenerationStatus;
  attempts: number;
  artifact_id?: string | null;
  last_error_code?: string | null;
  available_at?: string | null;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
  pdf_url?: string | null;
}

interface DocumentPdfActionProps {
  documentType: DocumentType;
  sourceId: string;
  issued: boolean;
  className?: string;
}

const API_BASE = '/api';
const POLL_INTERVAL_MS = 2000;

const RESOURCE_PATH: Record<DocumentType, string> = {
  invoice: 'invoices',
  quote: 'quotes',
  receipt: 'receipts',
};

function messageForStatus(status: GenerationStatus): string {
  switch (status) {
    case 'pending':
      return 'PDF queued for generation';
    case 'processing':
      return 'Preparing PDF…';
    case 'succeeded':
      return 'PDF ready';
    case 'failed':
      return 'PDF generation failed';
  }
}

export function DocumentPdfAction({
  documentType,
  sourceId,
  issued,
  className = '',
}: DocumentPdfActionProps) {
  const [generation, setGeneration] =
    useState<DocumentGenerationStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  const statusUrl =
    `${API_BASE}/documents/${documentType}/` +
    `${encodeURIComponent(sourceId)}/status`;

  const pdfUrl =
    `${API_BASE}/${RESOURCE_PATH[documentType]}/` +
    `${encodeURIComponent(sourceId)}/pdf`;

  const loadStatus = useCallback(async (signal?: AbortSignal) => {
    if (!issued || !sourceId) return;

    setLoading(true);

    try {
      const response = await fetch(statusUrl, {
        credentials: 'include',
        cache: 'no-store',
        signal,
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(
          body.detail ||
            body.message ||
            'Could not retrieve PDF generation status.',
        );
      }

      const result =
        (await response.json()) as DocumentGenerationStatus;

      setGeneration(result);
      setRequestError(null);
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }

      setRequestError(
        error instanceof Error
          ? error.message
          : 'Could not retrieve PDF generation status.',
      );
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, [issued, sourceId, statusUrl]);

  useEffect(() => {
    if (!issued || !sourceId) {
      setGeneration(null);
      setRequestError(null);
      return;
    }

    const controller = new AbortController();

    void loadStatus(controller.signal);

    const interval = window.setInterval(() => {
      void loadStatus(controller.signal);
    }, POLL_INTERVAL_MS);

    return () => {
      controller.abort();
      window.clearInterval(interval);
    };
  }, [issued, sourceId, loadStatus]);

  if (!issued) return null;

  const terminal =
    generation?.status === 'succeeded' ||
    generation?.status === 'failed';

  const ready =
    generation?.status === 'succeeded' &&
    Boolean(generation.artifact_id);

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {ready ? (
        <a
          href={pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-10 items-center justify-center gap-2 border-brut border-ink bg-surface px-4 py-2 text-body font-bold text-ink shadow-brut transition hover:-translate-y-0.5 hover:shadow-brut-lg"
        >
          <span aria-hidden="true">↓</span>
          Download PDF
        </a>
      ) : (
        <span
          className="inline-flex min-h-10 items-center gap-2 border-brut-thin border-line-subtle bg-surface-tint px-3 py-2 text-caption font-semibold text-text-soft"
          role="status"
          aria-live="polite"
        >
          {generation
            ? messageForStatus(generation.status)
            : loading
              ? 'Checking PDF status…'
              : 'PDF status unavailable'}
        </span>
      )}

      {requestError && (
        <span className="text-caption text-danger" role="alert">
          {requestError}
        </span>
      )}

      {generation?.status === 'failed' && (
        <span className="text-caption text-danger" role="alert">
          The PDF could not be generated. Contact support if this continues.
        </span>
      )}

      {(requestError || terminal) && (
        <button
          type="button"
          onClick={() => void loadStatus()}
          disabled={loading}
          className="min-h-10 px-2 text-caption font-bold underline underline-offset-4 disabled:opacity-50"
        >
          {loading ? 'Refreshing…' : 'Refresh status'}
        </button>
      )}
    </div>
  );
}
