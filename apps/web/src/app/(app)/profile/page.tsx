'use client';

/*
 * Personal profile. Business details stay on /settings.
 * Email is read-only for now: changing it needs a confirmation code sent
 * to the new address, which is a separate piece of work.
 */
import { useEffect, useState } from 'react';
import { Avatar } from '@/components/navigation/UserMenu';
import {
  Alert,
  Button,
  EmailField,
  FormActions,
  FormSection,
  PageContainer,
  PageHeader,
  PhoneField,
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

      <div className="flex items-center gap-4">
        <Avatar name={fullName} email={email} size={72} />
        <p className="text-body text-text-muted">
          Photo uploads are coming soon. Your initials show until then.
        </p>
      </div>

      <form onSubmit={save}>
        <FormSection
          title="Your details"
          description="The name and phone number shown on your account."
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

          <EmailField
            label="Email"
            value={email}
            disabled
            readOnly
            hint="You sign in with a code sent to this email."
          />

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

          {error ? <Alert variant="error">{error}</Alert> : null}

          {status === 'saved' ? (
            <p role="status" className="text-body font-semibold text-text">
              Saved.
            </p>
          ) : null}

          <FormActions>
            <Button type="submit" disabled={disabled} loading={status === 'saving'}>
              Save changes
            </Button>
          </FormActions>
        </FormSection>
      </form>
    </PageContainer>
  );
}
