"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Clock3, LoaderCircle, Plus } from "lucide-react";

import { BagCharacter } from "@/components/brand";
import { DocTabs } from "@/components/mobile/DocTabs";
import { Money } from "@/components/money/Money";
import { formatDate } from "@/lib/date";
import { cn } from "@/lib/cn";
import {
  Alert,
  PageContainer,
  PageHeader,
  buttonStyles,
} from "@/components/ui";

const API_BASE = "/api";

export interface RecurringLineItem {
  description: string;
  quantity: number;
  unit_price_minor: number;
}

export interface RecurringSchedule {
  id: string;
  workspace_id: string;
  client_id: string;
  name: string;
  currency: string;
  frequency: "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
  interval: number;
  start_date: string;
  next_run_date: string;
  anchor_day: number;
  anchor_month: number;
  end_rule: "never" | "after_count" | "on_date";
  end_after_count?: number | null;
  end_date?: string | null;
  issue_mode: "draft" | "auto_issue";
  draft_lead_days: number;
  due_date_offset_days: number;
  review_reminder_days: number;
  items: RecurringLineItem[];
  discount_minor: number;
  tax_rate_percent: number;
  wht_rate_percent: number;
  deposit_percentage?: number | null;
  deposit_amount_minor?: number | null;
  payment_profile_id?: string | null;
  direct_checkout_enabled: boolean;
  notes?: string | null;
  pause_if_previous_overdue_days?: number | null;
  timezone: string;
  status: "active" | "paused" | "cancelled" | "completed";
  generated_count: number;
  paused_at?: string | null;
  pause_started_on?: string | null;
  resume_policy?: string | null;
  cancelled_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
}

interface Client {
  id: string;
  name: string;
}

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

function statusColor(status: string) {
  switch (status) {
    case "active":
      return "bg-leaf text-on-leaf border-ink";
    case "paused":
      return "bg-sun text-on-sun border-ink";
    case "completed":
      return "bg-status-void text-status-void-fg border-line";
    case "cancelled":
      return "bg-status-late text-status-late-fg border-line";
    default:
      return "bg-surface-tint text-text-soft border-line";
  }
}

function getScheduleNetPayable(schedule: RecurringSchedule): number {
  const subtotal = schedule.items.reduce(
    (sum, item) => sum + item.quantity * item.unit_price_minor,
    0,
  );

  const discountedSubtotal = Math.max(0, subtotal - schedule.discount_minor);

  const tax = Math.round(
    (discountedSubtotal * schedule.tax_rate_percent) / 100,
  );

  const withholdingTax = Math.round(
    (discountedSubtotal * schedule.wht_rate_percent) / 100,
  );

  return Math.max(0, discountedSubtotal + tax - withholdingTax);
}

export default function RecurringInvoicesPage() {
  const [schedules, setSchedules] = useState<RecurringSchedule[]>([]);
  const [clients, setClients] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState("");

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        const queryParams = new URLSearchParams();
        if (selectedStatus) queryParams.set("status", selectedStatus);
        queryParams.set("limit", "50");

        const [schedulesRes, clientsRes] = await Promise.all([
          fetch(`${API_BASE}/recurring-invoices?${queryParams.toString()}`, {
            credentials: "include",
          }),
          fetch(`${API_BASE}/clients`, {
            credentials: "include",
          }),
        ]);

        if (!schedulesRes.ok) {
          throw new Error("Failed to load recurring invoice schedules");
        }

        const schedulesPayload = await schedulesRes.json();
        const schedulesData: RecurringSchedule[] = await schedulesPayload.items;

        if (!Array.isArray(schedulesData)) {
          throw new Error("Failed to load recurring invoice schedules");
        }

        let clientMap: Record<string, string> = {};
        if (clientsRes.ok) {
          const clientsData = await clientsRes.json();
          const items: Client[] = Array.isArray(clientsData)
            ? clientsData
            : clientsData.items || [];
          clientMap = items.reduce(
            (acc, c) => {
              acc[c.id] = c.name;
              return acc;
            },
            {} as Record<string, string>,
          );
        }

        if (!cancelled) {
          setSchedules(schedulesData);
          setClients(clientMap);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "An unexpected error occurred",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [selectedStatus, reloadKey]);

  return (
    <PageContainer width="list">
      {/* Header */}
      <PageHeader
        eyebrow="Documents"
        title="Recurring invoices"
        description="Automate ongoing invoices with scheduled generation and draft lead times."
        actions={
          <Link
            href="/recurring-invoices/new"
            className={cn(
              buttonStyles({ variant: "accent" }),
              "hidden sm:inline-flex",
            )}
          >
            <Plus aria-hidden className="h-4 w-4" />
            New schedule
          </Link>
        }
      />

      {/* Mobile document navigation */}
      <DocTabs className="mt-5" />

      {/* Filters */}
      <div className="mt-5 flex flex-wrap items-center gap-2 border-b border-line pb-4">
        {STATUS_FILTERS.map((f) => {
          const active = selectedStatus === f.value;
          return (
            <button
              key={f.value}
              type="button"
              aria-pressed={active}
              onClick={() => setSelectedStatus(f.value)}
              className={cn(
                "min-h-10 rounded-full border-brut-thin border-ink px-3.5 py-1.5 text-caption font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mango",
                active
                  ? "bg-sun text-on-sun shadow-brut-sm"
                  : "bg-surface text-text-soft hover:bg-surface-tint",
              )}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Error state */}
      {error && (
        <Alert
          variant="error"
          action={
            <button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
              className="font-bold underline underline-offset-4"
            >
              Retry
            </button>
          }
        >
          {error}
        </Alert>
      )}

      {/* Content */}
      {loading ? (
        <div
          role="status"
          className="flex min-h-[300px] items-center justify-center gap-3 text-text-muted"
        >
          <LoaderCircle className="h-6 w-6 animate-spin motion-reduce:animate-none" />
          <span>Loading recurring schedules...</span>
        </div>
      ) : error ? null : schedules.length === 0 ? (
        <div className="border border-dashed border-line bg-surface p-12 text-center">
          <BagCharacter
            size={80}
            mood="happy"
            className="mx-auto mb-4"
            decorative
          />
          <h3 className="text-heading font-black text-ink">
            no recurring schedules yet
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-body text-text-soft">
            Set up a recurring schedule once and Bagg will create drafts ready
            for your review before each invoice date.
          </p>
          <div className="mt-6">
            <Link
              href="/recurring-invoices/new"
              className={buttonStyles({ variant: "accent" })}
            >
              <Plus className="h-4 w-4" /> Create first schedule
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {schedules.map((schedule) => {
            const clientName = clients[schedule.client_id] || "Client";
            const netPayableMinor = getScheduleNetPayable(schedule);

            return (
              <Link
                key={schedule.id}
                href={`/recurring-invoices/${schedule.id}`}
                className="group flex flex-col justify-between gap-4 border-brut bg-surface p-5 shadow-brut-sm transition-transform hover:-translate-y-0.5 hover:shadow-brut sm:flex-row sm:items-center"
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-black text-ink group-hover:text-mango">
                      {schedule.name}
                    </span>
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[11px] font-black uppercase tracking-wider",
                        statusColor(schedule.status),
                      )}
                    >
                      {schedule.status}
                    </span>
                    <span className="rounded-full bg-surface-tint px-2 py-0.5 text-[11px] font-bold text-text-soft">
                      {schedule.frequency}
                    </span>
                  </div>

                  <p className="text-body text-text-soft">
                    Client:{" "}
                    <span className="font-bold text-ink">{clientName}</span>
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-caption text-text-muted">
                    <span className="inline-flex items-center gap-1">
                      <Clock3 className="h-3.5 w-3.5" />
                      Next run: {formatDate(schedule.next_run_date)}
                    </span>
                    <span>•</span>
                    <span>Generated: {schedule.generated_count} invoices</span>
                    <span>•</span>
                    <span>
                      Mode:{" "}
                      {schedule.issue_mode === "auto_issue"
                        ? "Auto-issue"
                        : "Draft for review"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-line pt-3 sm:border-0 sm:pt-0 sm:text-right">
                  <span className="text-caption text-text-soft sm:hidden">
                    Schedule value
                  </span>
                  <div>
                    <Money
                      amountMinor={netPayableMinor}
                      currency={schedule.currency}
                      className="text-title font-black text-ink"
                    />
                    <p className="text-[12px] text-text-muted">
                      net payable per cycle
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}
