export type CurrencyCode = 'NGN' | 'USD' | 'GBP' | 'EUR' | 'GHS' | 'KES' | 'ZAR';

export type InvoiceStatus =
  | 'draft'
  | 'sent'
  | 'viewed'
  | 'payment_claimed'
  | 'partially_paid'
  | 'paid'
  | 'overdue'
  | 'void';

export interface CurrencyConfig {
  code: CurrencyCode;
  name: string;
  symbol: string;
  decimals: number;
  minor_unit_factor: number;
  locale: string;
  flag: string;
}

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit_price_minor: number;
  total_minor: number;
}

export interface PaymentProfile {
  id: string;
  workspace_id: string;
  currency: CurrencyCode;
  bank_name?: string;
  account_name?: string;
  account_number?: string;
  routing_number?: string;
  payment_link?: string;
  mobile_money_number?: string;
  instructions?: string;
  is_default: boolean;
}

export interface Client {
  id: string;
  workspace_id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  country?: string;
  preferred_currency: CurrencyCode;
  default_payment_terms_days: number;
  tax_id?: string;
  created_at: string;
}

export interface Invoice {
  id: string;
  workspace_id: string;
  client_id: string;
  client?: Client;
  invoice_number: string;
  currency: CurrencyCode;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string;
  items: LineItem[];
  subtotal_minor: number;
  discount_minor: number;
  tax_rate_percent: number;
  tax_minor: number;
  total_minor: number;
  amount_paid_minor: number;
  notes?: string;
  share_token?: string;
  payment_profile?: PaymentProfile;
  created_at: string;
  updated_at: string;
}

export interface PaymentClaim {
  id: string;
  invoice_id: string;
  claimed_at: string;
  amount_minor: number;
  payment_date: string;
  reference?: string;
  proof_file_url?: string;
  status: 'pending' | 'confirmed' | 'rejected';
  rejection_note?: string;
}
