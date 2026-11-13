export const siteName = 'Bagg';

export const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL || 'https://bagg.app'
).replace(/\/+$/, '');

export const contactEmail =
    process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'hello@bagg.app';

export const securityEmail =
    process.env.NEXT_PUBLIC_SECURITY_EMAIL || 'security@bagg.app';

export const siteDescription =
    'Create professional invoices, collect payments and manage client engagements in one workspace. Built for African freelancers and creators.';

export const demoInvoiceHref = '/i/token_demo_sample_ngn';

export function absoluteUrl(path = '/') {
  return new URL(
      path.startsWith('/') ? path : `/${path}`,
      `${siteUrl}/`,
  ).toString();
}