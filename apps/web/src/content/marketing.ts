import { demoInvoiceHref } from "@/lib/site";

export const marketingNav = [
  { label: "Features", href: "/features" },
  { label: "Who it's for", href: "/audiences" },
  { label: "Pricing", href: "/pricing" },
  { label: "Is it safe?", href: "/security" },
];

export const footerGroups = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/features" },
      { label: "Who it's for", href: "/audiences" },
      { label: "Pricing", href: "/pricing" },
      { label: "Security", href: "/security" },
      { label: "See what your client sees", href: demoInvoiceHref },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Help", href: "/help" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms", href: "/legal/terms" },
      { label: "Privacy", href: "/legal/privacy" },
      { label: "Cookies", href: "/legal/cookies" },
    ],
  },
];

export const currencies = ["NGN", "USD", "GBP", "EUR", "GHS", "KES", "ZAR"];

export const homeFaqs = [
  {
    question: "What does Bagg actually do?",
    answer:
      "Bagg helps you make an invoice, send it as one link, see whether it's been opened or paid, and send polite reminders when it's late. Every payment gets a receipt you can share.",
  },
  {
    question: "Does my client need an account?",
    answer:
      "Nope. They open your link and see the amount, how to pay and what happens next. No password, no app.",
  },
  {
    question: "Can I invoice in more than one currency?",
    answer:
      "Yes. Save payment details for each currency you use and attach the right ones to each invoice. Bagg supports NGN, USD, GBP, EUR, GHS, KES and ZAR.",
  },
  {
    question: "When does Bagg send reminders?",
    answer:
      "Four friendly emails: three days before the due date, on the day, three days after and seven days after. They stop the moment the invoice is paid or your client claims payment.",
  },
  {
    question: "Does Bagg hold my client’s money?",
    answer:
      "No. Bagg helps you ask for payment, record it and send a receipt. Your client pays you directly, using the bank, mobile money or payment link you provide.",
  },
  {
    question: "Is there a free way to start?",
    answer:
      "Yes. Free gives you three PDF or email sends a month, no card needed. When you need more, Creator Pro is ₦3,500 a month or ₦35,000 a year, and Professional is ₦8,500 a month or ₦85,000 a year.",
  },
];

export const helpCategories = [
  {
    id: "getting-started",
    title: "Getting started",
    copy: "Set up your business, add your details and send your first invoice.",
  },
  {
    id: "invoices",
    title: "Invoices",
    copy: "Draft, send, share and follow an invoice, and what every status means.",
  },
  {
    id: "quotes",
    title: "Quotes",
    copy: "Send an offer, let your client accept it and turn it into an invoice.",
  },
  {
    id: "payments",
    title: "Payments and receipts",
    copy: "Add payment details, review payment claims and share receipts.",
  },
  {
    id: "reminders",
    title: "Reminders",
    copy: "When reminders go out, what triggers them and what stops them.",
  },
  {
    id: "account",
    title: "Account and security",
    copy: "Signing in, share links and reporting something suspicious.",
  },
];

export const helpFaqs = [
  {
    category: "getting-started",
    question: "How do I create my first invoice?",
    answer:
      "Sign in, add your business name and payment details, then choose New invoice. Add your client, line items and due date, and preview it before you send.",
  },
  {
    category: "getting-started",
    question: "What details should I add before sending?",
    answer:
      "The name your clients know you by, a logo or initials if you have them, and payment details for the invoice currency. The more complete the page, the fewer questions your client has.",
  },
  {
    category: "invoices",
    question: "How do I share an invoice?",
    answer:
      "Copy the invoice link and send it on WhatsApp, by email or anywhere else. You can also download the PDF, or send it through Bagg if you have sends or credits available.",
  },
  {
    category: "invoices",
    question: "What do the invoice statuses mean?",
    answer:
      "Draft: not sent yet. Sent: the link is live. Viewed: your client opened it. Part paid and paid: money has come in. Late: the due date has passed and there's still a balance.",
  },
  {
    category: "invoices",
    question: "Can I edit an invoice after sending it?",
    answer:
      "Once an invoice is sent it's locked, so your copy and your client's copy always match. On Professional, you can recall an eligible invoice, edit it and send it again as a new version. On other plans, make a new invoice with the changes and share that one.",
  },
  {
    category: "quotes",
    question: "How does a client accept a quote?",
    answer:
      "They open the quote link and choose Accept quote. Then you can turn it into an invoice without retyping the line items.",
  },
  {
    category: "payments",
    question: "How does my client pay?",
    answer:
      "Your invoice shows the bank, mobile money or payment link details you saved for that currency. Bagg doesn't hold the money. Your client pays you directly.",
  },
  {
    category: "payments",
    question: "What happens when a client says they have paid?",
    answer:
      "They mark the invoice as paid and can add a payment reference. That's a claim, not confirmation. You check your account and confirm it, and then the invoice updates and a receipt is ready.",
  },
  {
    category: "payments",
    question: "Can I record a part payment?",
    answer:
      "Yes. A payment can cover part of the balance. The invoice stays open with the remaining amount until it's fully paid.",
  },
  {
    category: "reminders",
    question: "Will reminders keep sending after payment?",
    answer:
      "No. Reminders stop when the invoice is paid, and also as soon as your client claims payment.",
  },
  {
    category: "reminders",
    question: "When will Bagg send reminders?",
    answer:
      "Four of them: three days before the due date, on the due date, three days after and seven days after. They stop when the invoice is paid or a payment is claimed.",
  },
  {
    category: "account",
    question: "How do I sign in without a password?",
    answer:
      "Enter your email and Bagg sends a one-time code. Type the code and you're in. There's no password to remember or reset.",
  },
  {
    category: "account",
    question: "How do I report a suspicious invoice?",
    answer:
      "Open the invoice and choose report abuse. Tell us what looked wrong and include the invoice link if you can. Don't send money until you've checked the request with the business directly.",
  },
];

export const creativeRoles = [
  {
    title: "Designers",
    copy: "Brand identity, packaging, digital design, social content and creative services.",
  },
  {
    title: "Developers",
    copy: "Websites, apps, integrations, maintenance and technical support.",
  },
  {
    title: "Writers",
    copy: "Brand copy, articles, scripts, editorial projects and ongoing content.",
  },
  {
    title: "Photographers",
    copy: "Shoots, event coverage, editing, licensing and commissions.",
  },
  {
    title: "Consultants",
    copy: "Strategy, assessments, workshops, advice and specialist services.",
  },
  {
    title: "Creators",
    copy: "Brand partnerships, sponsored content, campaigns and usage rights.",
  },
];

export const freePlanFeatures = [
  "Unlimited drafts and clients",
  "A shareable link for every invoice and quote",
  "PDF invoices with your business details",
  "Three free sends a month (PDF or email)",
  "Payment status, claims and receipts",
  "Friendly reminders before and after the due date",
];
