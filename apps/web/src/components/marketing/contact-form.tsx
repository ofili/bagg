
'use client';

import React, { useState } from 'react';
import { Mail, Send } from 'lucide-react';
import { contactEmail } from '@/lib/site';

const TOPICS = [
  'Support',
  'Billing',
  'Security',
  'Press',
  'Something else',
];

const labelClassName =
    'text-label font-extrabold text-ink';

const fieldClassName = [
  'mt-2 min-h-12 w-full min-w-0 border-2 border-ink',
  'bg-cream px-3 py-3 text-body text-ink',
  'outline-none transition-shadow placeholder:text-text-muted',
  'focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2',
  'disabled:cursor-not-allowed disabled:opacity-60',
].join(' ');

export function ContactForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [topic, setTopic] = useState(TOPICS[0]);
  const [message, setMessage] = useState('');
  const [opened, setOpened] = useState(false);

  function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();

    const subject = `[${topic}] message from ${name}`;
    const body = [
      `Name: ${name}`,
      `Email: ${email}`,
      `Topic: ${topic}`,
      '',
      message,
    ].join('\n');

    window.location.href = `mailto:${contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setOpened(true);
  }

  return (
      <form onSubmit={handleSubmit} className="min-w-0 space-y-6">
        <div className="grid min-w-0 gap-5 sm:grid-cols-2">
          <div className="min-w-0">
            <label htmlFor="contact-name" className={labelClassName}>
              Your name
            </label>
            <input
                id="contact-name"
                name="name"
                type="text"
                required
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className={fieldClassName}
                placeholder="Ada Okafor"
            />
          </div>

          <div className="min-w-0">
            <label htmlFor="contact-email" className={labelClassName}>
              Email address
            </label>
            <input
                id="contact-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={fieldClassName}
                placeholder="you@example.com"
            />
          </div>
        </div>

        <div className="min-w-0">
          <label htmlFor="contact-topic" className={labelClassName}>
            What is this about?
          </label>
          <select
              id="contact-topic"
              name="topic"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              className={fieldClassName}
          >
            {TOPICS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
            ))}
          </select>
        </div>

        <div className="min-w-0">
          <label htmlFor="contact-message" className={labelClassName}>
            Your message
          </label>
          <textarea
              id="contact-message"
              name="message"
              rows={6}
              required
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              className={`${fieldClassName} min-h-40 resize-y`}
              placeholder="Tell us what happened, what you expected, and anything you have already tried."
          />
        </div>

        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
          <button
              type="submit"
              className="inline-flex min-h-12 items-center justify-center gap-3 border-2 border-ink bg-ink px-6 text-label font-extrabold text-surface shadow-brut transition-transform hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-4"
          >
            Open email app
            <Send className="h-4 w-4" aria-hidden="true" />
          </button>

          <a
              href={`mailto:${contactEmail}`}
              className="inline-flex min-h-11 min-w-0 items-center gap-2 break-all text-body font-extrabold text-link hover:underline"
          >
            <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
            {contactEmail}
          </a>
        </div>

        <p className="border-l-4 border-mango pl-3 text-caption text-text-soft">
          Your email app opens with the message filled in. Nothing is sent until
          you review and press Send there.
        </p>

        {opened && (
            <p
                role="status"
                className="border-2 border-ink bg-mango p-4 text-body font-semibold text-ink"
            >
              Your email app should be opening. If it did not, email{' '}
              <a
                  href={`mailto:${contactEmail}`}
                  className="font-extrabold underline"
              >
                {contactEmail}
              </a>
              .
            </p>
        )}
      </form>
  );
}
