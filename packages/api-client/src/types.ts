import type { components } from "./schema";

export type {
  components,
  operations,
  paths,
} from "./schema";

export type CurrencyCode =
  | "NGN"
  | "USD"
  | "GBP"
  | "EUR"
  | "GHS"
  | "KES"
  | "ZAR";

export interface CurrencyConfig {
  code: CurrencyCode;
  name: string;
  symbol: string;
  decimals: number;
  minor_unit_factor: number;
  locale: string;
  flag: string;
}

export type Workspace =
  components["schemas"]["WorkspaceResponse"];

export type Invoice =
  components["schemas"]["InvoiceResponse"];

export type Quote =
  components["schemas"]["QuoteResponse"];

export type PaymentClaim =
  components["schemas"]["PaymentClaimResponse"];

export type PaymentProfile =
  components["schemas"]["PaymentProfileResponse"];

export type Receipt =
  components["schemas"]["ReceiptResponse"];

export type RecurringSchedule =
  components["schemas"]["RecurringScheduleResponse"];

export type RecurringScheduleList =
  components["schemas"]["RecurringScheduleListResponse"];

export type RecurringOccurrence =
  components["schemas"]["RecurringOccurrenceResponse"];

export type RecurringOccurrenceList =
  components["schemas"]["RecurringOccurrenceListResponse"];
