'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { AlertCircle, Loader2, MessageSquare, Send } from 'lucide-react';
import { Button, Card, Field, Input, inputStyles } from '@/components/ui';
import { formatDate } from '@/lib/date';
import { cn } from '@/lib/cn';

const API_BASE = '/api';

export interface CommentData {
  id: string;
  invoice_id?: string;
  quote_id?: string;
  line_item_id?: string | null;
  author_name: string;
  message: string;
  is_from_client: boolean;
  created_at: string;
}

interface DocumentCommentsProps {
  documentType: 'invoice' | 'quote';
  documentId: string;
  isPublicView?: boolean;
  shareToken?: string;
  documentNumber?: string;
  className?: string;
}

export function DocumentComments({
  documentType,
  documentId,
  isPublicView = false,
  shareToken,
  documentNumber,
  className,
}: DocumentCommentsProps) {
  const [comments, setComments] = useState<CommentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [authorName, setAuthorName] = useState('');
  const [message, setMessage] = useState('');

  const getCommentsEndpoint = () => {
    if (isPublicView && shareToken) {
      return documentType === 'quote'
        ? `${API_BASE}/quotes/share/${shareToken}/comments`
        : `${API_BASE}/sharing/${shareToken}/comments`;
    }
    return documentType === 'quote'
      ? `${API_BASE}/quotes/${documentId}/comments`
      : `${API_BASE}/invoices/${documentId}/comments`;
  };

  const loadComments = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(getCommentsEndpoint(), {
        credentials: isPublicView ? 'omit' : 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setComments(Array.isArray(data) ? data : []);
      }
    } catch {
      setError('Could not load discussion trail.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (documentId || shareToken) {
      loadComments();
    }
  }, [documentId, shareToken, documentType]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    if (isPublicView && !authorName.trim()) {
      setError('Please provide your name.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const endpoint = getCommentsEndpoint();
      const payload = isPublicView
        ? { author_name: authorName.trim(), message: message.trim() }
        : { author_name: authorName.trim() || undefined, message: message.trim() };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: isPublicView ? 'omit' : 'include',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to post message.');
      }

      const newComment = await res.json();
      setComments((prev) => [...prev, newComment]);
      setMessage('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit message.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      id="comments"
      aria-labelledby="comments-heading"
      className={cn('space-y-5 rounded-card border border-line-subtle bg-surface p-5 sm:p-6', className)}
    >
      <div className="flex items-center justify-between border-b border-line-subtle pb-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-ink-muted" aria-hidden="true" />
          <h2 id="comments-heading" className="text-heading text-ink">
            Questions & comments
          </h2>
        </div>
        {documentNumber && (
          <span className="rounded-pill border border-line-subtle bg-surface-sunken px-2.5 py-0.5 text-caption font-bold text-ink-muted">
            {documentNumber}
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8 text-ink-muted">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : comments.length === 0 ? (
        <div className="rounded-row bg-surface-sunken p-5 text-center text-body text-ink-soft">
          <p className="font-medium text-ink">No questions or comments yet.</p>
          <p className="mt-1 text-caption text-ink-muted">
            {isPublicView
              ? 'Have questions about pricing, scope or terms? Ask your freelancer below.'
              : 'Messages between you and your client on this document will appear here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => {
            const isClient = comment.is_from_client;
            return (
              <div
                key={comment.id}
                className={cn(
                  'space-y-1.5 rounded-row p-4 transition-colors',
                  isClient
                    ? 'border border-line-subtle bg-surface-sunken'
                    : 'border border-mango/30 bg-amber-50/50 dark:bg-amber-950/20'
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-ink">{comment.author_name}</span>
                    <span
                      className={cn(
                        'rounded-pill px-2 py-0.5 text-[11px] font-extrabold',
                        isClient
                          ? 'bg-tint text-ink-muted'
                          : 'bg-mango text-on-mango'
                      )}
                    >
                      {isClient ? 'Client' : 'Business'}
                    </span>
                  </div>
                  <time className="text-caption text-ink-muted">
                    {formatDate(comment.created_at)}
                  </time>
                </div>
                <p className="whitespace-pre-wrap text-body text-ink">{comment.message}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Composer form */}
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {isPublicView && (
          <Field label="Your name">
            {(a) => (
              <Input
                type="text"
                required
                placeholder="e.g. Tunde or Acme Studio"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                {...a}
              />
            )}
          </Field>
        )}

        <Field label={isPublicView ? 'Your question or note' : 'Reply to client'}>
          {(a) => (
            <textarea
              rows={3}
              required
              placeholder={
                isPublicView
                  ? 'Ask about deliverables, timelines, or commercial terms...'
                  : 'Write a response to your client. It will appear on their document link...'
              }
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className={cn(inputStyles, 'min-h-24 py-2.5')}
              {...a}
            />
          )}
        </Field>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-row border border-red-300 bg-red-50 p-3 text-body text-red-950 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200"
          >
            <AlertCircle aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-end">
          <Button type="submit" zone="calm" loading={submitting} disabled={!message.trim()}>
            <Send className="h-4 w-4" aria-hidden="true" />
            {isPublicView ? 'Send message' : 'Post reply'}
          </Button>
        </div>
      </form>
    </section>
  );
}
