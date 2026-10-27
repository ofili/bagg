'use client';

import { useState } from 'react';
import { Mail, Send } from 'lucide-react';
import { buttonStyles } from '@/components/ui/button';
import { contactEmail } from '@/lib/site';
import { fieldClassName, fieldLabelClassName } from '@/components/marketing/form-styles';

const TOPICS = ['Support', 'Billing', 'Security', 'Press', 'Something else'];

export function ContactForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [topic, setTopic] = useState(TOPICS[0]);
  const [message, setMessage] = useState('');
  const [opened, setOpened] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
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
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-name" className={fieldLabelClassName}>
            your name
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
        <div>
          <label htmlFor="contact-email" className={fieldLabelClassName}>
            email address
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

      <div>
        <label htmlFor="contact-topic" className={fieldLabelClassName}>
          what is this about?
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

      <div>
        <label htmlFor="contact-message" className={fieldLabelClassName}>
          your message
        </label>
        <textarea
          id="contact-message"
          name="message"
          rows={6}
          required
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          className={`${fieldClassName} resize-y`}
          placeholder="Tell us what happened, what you expected, and anything you have already tried."
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button type="submit" className={buttonStyles({ size: 'lg' })}>
          Open email app <Send className="h-4 w-4" aria-hidden="true" />
        </button>
        <a
          href={`mailto:${contactEmail}`}
          className="inline-flex min-h-11 items-center gap-2 text-body font-extrabold text-link hover:underline"
        >
          <Mail className="h-4 w-4" aria-hidden="true" />
          {contactEmail}
        </a>
      </div>

      <p className="text-caption text-ink-muted">
        This opens your email app with the message filled in. Nothing sends until you press send
        there.
      </p>

      {opened && (
        <p role="status" className="rounded-row bg-peach px-3 py-2 text-body text-ink-soft">
          Your email app should be opening. If it did not, email{' '}
          <a href={`mailto:${contactEmail}`} className="font-extrabold text-link hover:underline">
            {contactEmail}
          </a>
          .
        </p>
      )}
    </form>
  );
}
