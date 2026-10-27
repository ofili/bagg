import { demoInvoiceHref } from '@/lib/site';

export const marketingNav = [
  { label: 'Features', href: '/features' },
  { label: 'For creatives', href: '/creatives' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Security', href: '/security' },
];

export const footerGroups = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '/features' },
      { label: 'For creatives', href: '/creatives' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Security', href: '/security' },
      { label: 'Client invoice demo', href: demoInvoiceHref },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Help', href: '/help' },
      { label: 'Contact', href: '/contact' },
      { label: 'Early access', href: '/early-access' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Terms', href: '/legal/terms' },
      { label: 'Privacy', href: '/legal/privacy' },
      { label: 'Cookies', href: '/legal/cookies' },
    ],
  },
];

export const currencies = ['NGN', 'USD', 'GBP', 'EUR', 'GHS', 'KES', 'ZAR'];

export const homeFaqs = [
  {
    question: 'What does bagg actually do?',
    answer:
      'bagg helps you make an invoice, send it as one link, keep track of whether it has been opened or paid, and send polite reminders when it is late. Every payment gets a receipt you can share.',
  },
  {
    question: 'Does my client need an account?',
    answer:
      'No. Your client opens the link, sees the amount, your payment details and one clear next step. They never have to create a password or download an app.',
  },
  {
    question: 'Can I invoice in more than one currency?',
    answer:
      'Yes. You can keep payment details for each currency you use and attach the right ones to each invoice. bagg supports NGN, USD, GBP, EUR, GHS, KES and ZAR.',
  },
  {
    question: 'When does bagg send reminders?',
    answer:
      'bagg sends a friendly heads-up before the due date, a nudge on the day and clear follow-ups after it. Reminders stop as soon as the invoice is paid.',
  },
  {
    question: 'Does bagg hold my client’s money?',
    answer:
      'No. bagg helps you ask, record and receipt a payment. Your client pays you directly using the bank, mobile money or payment link you provide.',
  },
  {
    question: 'Is there a free way to start?',
    answer:
      'Yes. You can start without a card and use three free PDF or email sends. Paid plans and fees are being finalised, and they will be shown clearly before you are charged.',
  },
];

export const helpCategories = [
  {
    id: 'getting-started',
    title: 'getting started',
    copy: 'Set up your workspace, add your business details and send your first invoice.',
  },
  {
    id: 'invoices',
    title: 'invoices',
    copy: 'Draft, send, share and follow an invoice. Understand every status.',
  },
  {
    id: 'quotes',
    title: 'quotes',
    copy: 'Send an offer, let a client accept it and turn the accepted work into an invoice.',
  },
  {
    id: 'payments',
    title: 'payments and receipts',
    copy: 'Add payment details, record a payment claim and share a receipt.',
  },
  {
    id: 'reminders',
    title: 'reminders',
    copy: 'See the reminder schedule, what triggers it and what makes it stop.',
  },
  {
    id: 'account',
    title: 'account and security',
    copy: 'Sign in, manage your workspace, understand share links and report abuse.',
  },
];

export const helpFaqs = [
  {
    category: 'getting-started',
    question: 'How do I create my first invoice?',
    answer:
      'Sign in, add your business name and payment details, then choose New invoice. Add your client, line items and due date. Preview the invoice before you send it.',
  },
  {
    category: 'getting-started',
    question: 'What details should I add before sending?',
    answer:
      'Add the name your client knows you by, a logo or initials if you have one, and the payment details for the invoice currency. The more complete the page, the fewer questions your client has.',
  },
  {
    category: 'invoices',
    question: 'How do I share an invoice?',
    answer:
      'Copy the invoice link and send it by WhatsApp, email or any other channel. You can also download the PDF or send it through bagg when you have credits available.',
  },
  {
    category: 'invoices',
    question: 'What do the invoice statuses mean?',
    answer:
      'Draft means it is not sent. Sent means the link is live. Viewed means your client opened it. Part paid and paid refer to the money received. Late means the due date has passed and the balance is still open.',
  },
  {
    category: 'invoices',
    question: 'Can I edit an invoice after sending it?',
    answer:
      'Sent invoices stay locked so the client’s copy and your record agree. If the amount or line items need to change, make a new invoice and share that one instead.',
  },
  {
    category: 'quotes',
    question: 'How does a client accept a quote?',
    answer:
      'The client opens the quote link and chooses Accept quote. You can then turn the accepted quote into an invoice without copying every line item again.',
  },
  {
    category: 'payments',
    question: 'How does my client pay?',
    answer:
      'Your invoice shows the bank, mobile money or payment link details you saved for that currency. bagg does not hold the money; your client pays you directly.',
  },
  {
    category: 'payments',
    question: 'What happens when a client says they have paid?',
    answer:
      'They can mark the invoice as paid and add a payment reference. You decide whether to confirm the claim. Once confirmed, the invoice updates and a receipt is ready.',
  },
  {
    category: 'payments',
    question: 'Can I record a part payment?',
    answer:
      'Yes. A payment can cover part of the balance. The invoice stays open with the remaining amount until the full balance is settled.',
  },
  {
    category: 'reminders',
    question: 'Will reminders keep sending after payment?',
    answer:
      'No. Reminders stop when the invoice is paid. They also stop once a client marks the invoice as paid while you review the claim.',
  },
  {
    category: 'reminders',
    question: 'When will bagg send reminders?',
    answer:
      'bagg schedules four reminders: three days before the due date, on the due date, three days after and seven days after. Reminders stop if the invoice is paid or a payment is claimed.',
  },
  {
    category: 'account',
    question: 'How do I sign in without a password?',
    answer:
      'Enter your email address and bagg sends a one-time code. Enter the code to open your workspace. There is no password to remember or reset.',
  },
  {
    category: 'account',
    question: 'How do I report a suspicious invoice?',
    answer:
      'Open the invoice and use the report abuse action. Tell us what looked wrong and, if you can, include the invoice link. Do not send money until you have verified the request with the business directly.',
  },
];

export const creativeRoles = [
  {
    title: 'designers',
    copy: 'Brand systems, packaging, social kits and the endless round of small revisions.',
  },
  {
    title: 'developers',
    copy: 'Builds, retainers, retainers that should have been builds, and the occasional emergency fix.',
  },
  {
    title: 'writers',
    copy: 'Launch copy, long-form work, scripts and retainer articles with very different deadlines.',
  },
  {
    title: 'photographers',
    copy: 'Shoots, edits, licensing and the deposit that needs to arrive before the date is held.',
  },
  {
    title: 'consultants',
    copy: 'Strategy, audits, workshops and follow-up work that deserves a clean paper trail.',
  },
  {
    title: 'creators',
    copy: 'Brand deals, sponsored work, usage rights and invoices that need to look as good as the work.',
  },
];

export const freePlanFeatures = [
  'Unlimited drafts and clients',
  'Shareable invoice and quote links',
  'PDF invoices with your business details',
  'Three free PDF or email sends',
  'Payment status, claims and receipts',
  'Polite reminders before and after the due date',
];
