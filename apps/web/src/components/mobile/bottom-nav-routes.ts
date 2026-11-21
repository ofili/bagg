const FULL_SCREEN_ROUTES = [
  // Invoice, quote, receipt and recurring invoice create/detail pages.
  /^\/(invoices|quotes|receipts|recurring-invoices)\/[^/]+(?:\/.*)?$/,

  // Client creation and client detail pages.
  /^\/clients\/new(?:\/.*)?$/,
  /^\/clients\/(?!contacts(?:\/|$))[^/]+(?:\/.*)?$/,

  // Contact creation and contact editing.
  /^\/clients\/contacts\/(?:new|[^/]+\/edit)(?:\/.*)?$/,
];

export function shouldShowBottomNav(pathname: string): boolean {
  return !FULL_SCREEN_ROUTES.some((pattern) => pattern.test(pathname));
}