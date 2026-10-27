export const siteName = 'bagg';
export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(
  /\/$/,
  '',
);
export const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'hello@bagg.app';
export const securityEmail = process.env.NEXT_PUBLIC_SECURITY_EMAIL || 'security@bagg.app';
export const siteDescription =
  'Invoicing and getting paid for African freelancers and creators. send. chase. get paid.';
export const demoInvoiceHref = '/i/token_demo_sample_ngn';

export function absoluteUrl(path = '/') {
  return `${siteUrl}${path.startsWith('/') ? path : `/${path}`}`;
}
