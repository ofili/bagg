export type AcquisitionAttribution = {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
  referral_code?: string;
  referrer?: string;
  landing_path?: string;
};

const STORAGE_KEY = 'bagg:first-touch-attribution';

const PARAMETER_MAP: Record<string, keyof AcquisitionAttribution> = {
  utm_source: 'source',
  utm_medium: 'medium',
  utm_campaign: 'campaign',
  utm_content: 'content',
  utm_term: 'term',
  referral_code: 'referral_code',
};

export function captureFirstTouchAttribution(): void {
  if (typeof window === 'undefined') return;

  try {
    if (window.sessionStorage.getItem(STORAGE_KEY)) return;

    const params = new URLSearchParams(window.location.search);
    const attribution: AcquisitionAttribution = {};

    for (const [parameter, field] of Object.entries(PARAMETER_MAP)) {
      const value = params.get(parameter)?.trim();
      if (value) attribution[field] = value.slice(0, 500);
    }

    if (document.referrer) {
      attribution.referrer = document.referrer.slice(0, 500);
    }

    attribution.landing_path = (
      window.location.pathname + window.location.search
    ).slice(0, 300);

    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(attribution),
    );
  } catch {
    // Attribution must never block authentication.
  }
}

export function readFirstTouchAttribution(): AcquisitionAttribution | null {
  if (typeof window === 'undefined') return null;

  try {
    const value = window.sessionStorage.getItem(STORAGE_KEY);
    return value ? JSON.parse(value) as AcquisitionAttribution : null;
  } catch {
    return null;
  }
}