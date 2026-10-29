'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Check,
  CheckCircle2,
  CreditCard,
  Eye,
  Loader2,
  MessageSquare,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import { formatDate } from '@/lib/date';
import { cn } from '@/lib/cn';

const API_BASE = '/api';

export interface NotificationItem {
  id: string;
  workspace_id: string;
  recipient_user_id: string;
  type: string;
  title: string;
  body: string;
  document_type: 'invoice' | 'quote';
  document_id: string;
  document_number: string;
  comment_id?: string | null;
  link_url: string;
  read_at?: string | null;
  created_at: string;
}

function getNotificationIcon(type: string) {
  switch (type) {
    case 'quote_accepted':
      return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />;
    case 'quote_declined':
      return <XCircle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />;
    case 'quote_review_requested':
      return <RotateCcw className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />;
    case 'payment_claimed':
    case 'payment_received':
    case 'invoice_paid':
      return <CreditCard className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />;
    case 'quote_viewed':
    case 'invoice_viewed':
      return <Eye className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />;
    case 'client_comment':
    case 'business_comment':
    default:
      return <MessageSquare className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />;
  }
}

export function NotificationCenter() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchUnreadCount = async () => {
    try {
      const res = await fetch(`${API_BASE}/notifications/unread-count`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.unread_count || 0);
      }
    } catch {
      // Soft fail
    }
  };

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/notifications?limit=25`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch {
      // Soft fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (open) {
      fetchNotifications();
    }
  }, [open]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  const handleMarkAsRead = async (notification: NotificationItem) => {
    if (!notification.read_at) {
      try {
        await fetch(`${API_BASE}/notifications/${notification.id}/read`, {
          method: 'PATCH',
          credentials: 'include',
        });
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, read_at: new Date().toISOString() } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch {
        // Soft fail
      }
    }
    setOpen(false);
    router.push(notification.link_url);
  };

  const handleMarkAllAsRead = async () => {
    try {
      await fetch(`${API_BASE}/notifications/read-all`, {
        method: 'POST',
        credentials: 'include',
      });
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch {
      // Soft fail
    }
  };

  return (
    <div className="relative inline-block" ref={containerRef}>
      {/* Bell Trigger */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={`Notifications (${unreadCount} unread)`}
        aria-expanded={open}
        className={cn(
          'relative flex h-10 w-10 items-center justify-center rounded-btn border border-ink bg-surface text-ink transition-colors hover:bg-surface-tint focus:outline-none focus:ring-2 focus:ring-mango',
          open && 'bg-surface-tint'
        )}
      >
        <Bell className="h-4 w-4" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex min-h-5 min-w-5 items-center justify-center rounded-full border border-ink bg-mango px-1 text-[11px] font-extrabold leading-none text-on-mango shadow-sm">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Panel */}
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 sm:w-96 rounded-card border-brut border-ink bg-surface shadow-brut animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center justify-between border-b border-line-subtle px-4 py-3">
            <div className="flex items-center gap-2">
              <h2 className="text-body-l font-extrabold text-ink">notifications</h2>
              {unreadCount > 0 && (
                <span className="rounded-full bg-mango px-2 py-0.5 text-caption font-extrabold text-on-mango">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="text-caption font-bold text-ink-soft hover:text-ink hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 divide-y divide-line-subtle overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="flex items-center justify-center py-10 text-ink-muted">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center text-ink-soft">
                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-tint text-leaf">
                  <Check className="h-5 w-5" />
                </div>
                <p className="text-body font-bold text-ink">All caught up</p>
                <p className="mt-0.5 text-caption text-ink-soft">
                  New client questions, quote acceptances, and payment claims will appear here.
                </p>
              </div>
            ) : (
              notifications.map((item) => {
                const isUnread = !item.read_at;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleMarkAsRead(item)}
                    className={cn(
                      'flex w-full items-start gap-3 p-3.5 text-left transition-colors hover:bg-surface-tint',
                      isUnread ? 'bg-amber-50/60 dark:bg-amber-950/20' : 'bg-surface'
                    )}
                  >
                    <div className="mt-0.5 flex shrink-0 items-center justify-center">
                      {isUnread ? (
                        <span className="h-2.5 w-2.5 rounded-full bg-mango ring-2 ring-mango/30" aria-label="Unread" />
                      ) : (
                        <span className="h-2.5 w-2.5 rounded-full bg-transparent" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {getNotificationIcon(item.type)}
                          <span className="inline-block truncate rounded-pill border border-line-subtle bg-surface px-1.5 py-0.5 text-[11px] font-bold text-ink">
                            {item.document_number}
                          </span>
                        </div>
                        <time className="shrink-0 text-caption text-ink-muted">
                          {formatDate(item.created_at)}
                        </time>
                      </div>

                      <p className="text-body font-bold text-ink line-clamp-1">{item.title}</p>
                      <p className="text-caption text-ink-soft line-clamp-2">{item.body}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
