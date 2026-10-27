'use client';

import { useState } from 'react';
import { Mail, Send } from 'lucide-react';
import { buttonStyles } from '@/components/ui/button';
import { contactEmail } from '@/lib/site';
import { fieldClassName, fieldLabelClassName } from '@/components/marketing/form-styles';

export function EarlyAccessForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [work, setWork] = useState('');
  const [note, setNote] = useState('');
  const [opened, setOpened] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const subject = 'Early access to bagg';
    const body = [
      `Name: ${name}`,
      `Email: ${email}`,
      `What I do: ${work}`,
      '',
      note ? `A note: ${note}` : '',
    ].join('\n');

    window.location.href = `mailto:${contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setOpened(true);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="early-name" className={fieldLabelClassName}>
            your name
          </label>
          <input
            id="early-name"
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
          <label htmlFor="early-email" className={fieldLabelClassName}>
            email address
          </label>
          <input
            id="early-email"
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
        <label htmlFor="early-work" className={fieldLabelClassName}>
          what do you do?
        </label>
        <input
          id="early-work"
          name="work"
          type="text"
          required
          value={work}
          onChange={(event) => setWork(event.target.value)}
          className={fieldClassName}
          placeholder="Designer, developer, writer, photographer, consultant, creator…"
        />
      </div>

      <div>
        <label htmlFor="early-note" className={fieldLabelClassName}>
          anything we should know? (optional)
        </label>
        <textarea
          id="early-note"
          name="note"
          rows={4}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          className={`${fieldClassName} resize-y`}
          placeholder="The kinds of clients you work with, the currencies you invoice in, or what you want to fix first."
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button type="submit" className={buttonStyles({ size: 'lg' })}>
          Join early access <Send className="h-4 w-4" aria-hidden="true" />
        </button>
        <a
          href={`mailto:${contactEmail}?subject=${encodeURIComponent('Early access to bagg')}`}
          className="inline-flex min-h-11 items-center gap-2 text-body font-extrabold text-link hover:underline"
        >
          <Mail className="h-4 w-4" aria-hidden="true" />
          {contactEmail}
        </a>
      </div>

      <p className="text-caption text-ink-muted">
        This opens your email app with the note filled in. Nothing sends until you press send
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
