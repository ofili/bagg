'use client';

/*
 * Personal profile. Business details stay on /settings.
 * Email is read-only for now: changing it needs a confirmation code sent
 * to the new address, which is a separate piece of work.
 */
import { useEffect, useState } from 'react';
import { Mail, Phone, User } from 'lucide-react';

import { Avatar } from '@/components/navigation/UserMenu';
import {
  Alert,
  Button,
  FormActions,
  FormSection,
  PageContainer,
  PageHeader,
  PhoneField,
  StaticField,
  StickyFormActions,
  TextField,
} from '@/components/ui';

const API = '/api';

type Status = 'loading' | 'ready' | 'saving' | 'saved' | 'error';

export default function ProfilePage() {
  const [status, setStatus] = useState<Status>('loading');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API}/users/me`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        setEmail(d.user.email);
        setFullName(d.user.full_name ?? '');
        setPhone(d.user.phone ?? '');
        setStatus('ready');
      })
      .catch(() => {
        setError('We could not load your profile. Refresh and try again.');
        setStatus('error');
      });
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setStatus('saving');
    setError(null);
    try {
      const r = await fetch(`${API}/users/me`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName, phone }),
      });
      if (!r.ok) throw new Error();
      setStatus('saved');
    } catch {
      setError('We could not save your changes. Try again.');
      setStatus('error');
    }
  }

  const disabled = status === 'loading' || status === 'saving';

  return (
    <PageContainer width="form" className="max-w-xl">
      <PageHeader
        title="Profile"
        description="Your personal details. Your business details are in Workspace settings."
      />

      <div className="flex items-center gap-4 border-brut border-ink bg-surface p-4">
        <Avatar name={fullName} email={email} size={72} />

        <div className="min-w-0">
          <p className="truncate text-body-l font-extrabold text-text">
            {fullName || 'Your profile'}
          </p>
          <p className="mt-0.5 text-caption text-text-muted">
            Photo uploads are coming soon. Your initials show until then.
          </p>
        </div>
      </div>

      <form onSubmit={save} className="space-y-5">
        <FormSection
          icon={<User className="h-4 w-4" aria-hidden="true" />}
          title="Identity"
          description="The name shown on your account and in the app."
        >
          <TextField
            label="Full name"
            value={fullName}
            maxLength={120}
            autoComplete="name"
            disabled={disabled}
            onChange={(e) => {
              setFullName(e.target.value);
              if (status === 'saved') setStatus('ready');
            }}
          />

          <StaticField
            label="Email"
            icon={<Mail className="h-4 w-4" aria-hidden="true" />}
            value={email || 'Not set'}
            hint="You sign in with a code sent to this email. Changing it is coming soon."
          />
        </FormSection>

        <FormSection
          icon={<Phone className="h-4 w-4" aria-hidden="true" />}
          title="Contact"
          description="How we reach you about your account."
        >
          <PhoneField
            label="Phone"
            value={phone}
            maxLength={32}
            disabled={disabled}
            onChange={(e) => {
              setPhone(e.target.value);
              if (status === 'saved') setStatus('ready');
            }}
          />
        </FormSection>

        {error ? <Alert variant="error">{error}</Alert> : null}

        {status === 'saved' ? (
          <Alert variant="success" dismissible onDismiss={() => setStatus('ready')}>
            Profile saved.
          </Alert>
        ) : null}

        <StickyFormActions>
          <FormActions divider={false}>
            <Button type="submit" disabled={disabled} loading={status === 'saving'}>
              Save changes
            </Button>
          </FormActions>
        </StickyFormActions>
      </form>
    </PageContainer>
  );
}
