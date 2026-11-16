'use client';

import { use, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, CircleNotch, Trash } from '@phosphor-icons/react';

import {
  Alert,
  Button,
  Checkbox,
  EmailField,
  FormActions,
  FormGrid,
  FormSection,
  FormSubsection,
  PageContainer,
  PageHeader,
  PhoneField,
  StaticField,
  TextArea,
  TextField,
  buttonStyles,
} from '@/components/ui';
import { useCurrentBreadcrumb } from '@/components/navigation/BreadcrumbContext';

const API_BASE = '/api';

interface Client {
  id: string;
  name: string;
  client_type: 'PERSON' | 'BUSINESS';
}

interface Contact {
  id: string;
  workspace_id: string;
  client_id: string;
  name: string;
  job_title?: string | null;
  email?: string | null;
  phone?: string | null;
  is_primary: boolean;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

interface PageProps {
  params: Promise<{ contactId: string }>;
}

export default function EditContactPage({ params }: PageProps) {
  const { contactId } = use(params);
  const router = useRouter();
  const { setCurrentLabel } = useCurrentBreadcrumb();

  const [contact, setContact] = useState<Contact | null>(null);
  const [clientName, setClientName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (contact?.name) {
      setCurrentLabel(contact.name);
    }
    return () => setCurrentLabel(null);
  }, [contact?.name, setCurrentLabel]);

  const [name, setName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadContact() {
      setLoading(true);
      setLoadError('');

      try {
        const [contactsResponse, clientsResponse] = await Promise.all([
          fetch(`${API_BASE}/clients/contacts`, {
            credentials: 'include',
          }),
          fetch(`${API_BASE}/clients`, {
            credentials: 'include',
          }),
        ]);

        if (!contactsResponse.ok) {
          throw new Error('Unable to load contacts. Please try again.');
        }

        if (!clientsResponse.ok) {
          throw new Error('Unable to load client information. Please try again.');
        }

        const contacts: Contact[] = await contactsResponse.json();
        const clients: Client[] = await clientsResponse.json();

        if (!active) return;

        const found = contacts.find((item) => item.id === contactId);

        if (!found) {
          setLoadError('This contact could not be found.');
          return;
        }

        setContact(found);
        setClientName(
          clients.find((client) => client.id === found.client_id)?.name ??
            'Unknown client',
        );

        setName(found.name ?? '');
        setJobTitle(found.job_title ?? '');
        setEmail(found.email ?? '');
        setPhone(found.phone ?? '');
        setNotes(found.notes ?? '');
        setIsPrimary(Boolean(found.is_primary));
      } catch (err) {
        if (!active) return;

        setLoadError(
          err instanceof Error
            ? err.message
            : 'Unable to load this contact. Please try again.',
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadContact();

    return () => {
      active = false;
    };
  }, [contactId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Enter the contact’s name.');
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        `${API_BASE}/clients/contacts/${contactId}`,
        {
          method: 'PATCH',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: name.trim(),
            job_title: jobTitle.trim() || null,
            email: email.trim() || null,
            phone: phone.trim() || null,
            notes: notes.trim() || null,
            is_primary: isPrimary,
          }),
        },
      );

      if (!response.ok) {
        let message = 'Unable to save changes. Please try again.';

        try {
          const data = await response.json();

          if (typeof data.detail === 'string') {
            message = data.detail;
          } else if (Array.isArray(data.detail)) {
            message = data.detail
              .map((item: { msg?: string }) => item.msg)
              .filter(Boolean)
              .join(' ');
          }
        } catch {
          // Keep the fallback error message.
        }

        throw new Error(message);
      }

      router.push('/clients/contacts');
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to save changes. Please try again.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Are you sure you want to delete ${contact?.name || 'this contact'}?`)) {
      return;
    }

    setDeleting(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE}/clients/contacts/${contactId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        let message = 'Unable to delete contact. Please try again.';
        try {
          const data = await response.json();
          if (typeof data.detail === 'string') {
            message = data.detail;
          }
        } catch {
          // Keep the fallback error message.
        }
        throw new Error(message);
      }

      router.push('/clients/contacts');
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to delete contact. Please try again.',
      );
      setDeleting(false);
    }
  }

  return (
    <PageContainer width="form">
      <div className="space-y-4">
        <Link
          href="/clients/contacts"
          className={buttonStyles({ variant: 'outline', zone: 'calm' })}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to contacts
        </Link>

        <PageHeader
          title={contact?.name ? `Edit ${contact.name}` : 'Edit contact'}
          description={
            clientName && clientName !== 'Unknown client'
              ? `Update contact details for ${clientName}.`
              : 'Update this person’s contact details.'
          }
        />
      </div>

      {loading ? (
        <div
          role="status"
          className="flex min-h-52 items-center justify-center border-brut border-ink bg-surface"
        >
          <div className="flex items-center gap-3 text-body text-text-muted">
            <CircleNotch className="size-5 animate-spin" aria-hidden="true" />
            Loading contact…
          </div>
        </div>
      ) : loadError ? (
        <Alert
          variant="error"
          title="Unable to open contact"
          action={
            <div className="flex flex-wrap gap-3">
              <Link
                href="/clients/contacts"
                className={buttonStyles({ variant: 'outline', zone: 'calm' })}
              >
                Back to contacts
              </Link>

              <Button
                type="button"
                onClick={() => window.location.reload()}
              >
                Try again
              </Button>
            </div>
          }
        >
          {loadError}
        </Alert>
      ) : contact ? (
        <form onSubmit={handleSubmit} className="space-y-5">
          <FormSection
            title="Client"
            description="The client this contact belongs to."
          >
            <StaticField
              label="Associated client"
              value={clientName}
              hint="Contacts cannot be moved between clients from this form."
              action={
                <Link
                  href={`/clients/${contact.client_id}`}
                  className="text-caption font-bold text-link underline underline-offset-4"
                >
                  View client
                </Link>
              }
            />
          </FormSection>

          <FormSection
            title="Person"
            description="Keep this person’s information accurate and up to date."
          >
            <FormGrid>
              <TextField
                label="Full name"
                name="name"
                required
                autoComplete="name"
                maxLength={255}
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={saving}
              />

              <TextField
                label="Job title"
                name="job_title"
                optional
                maxLength={255}
                value={jobTitle}
                onChange={(event) => setJobTitle(event.target.value)}
                disabled={saving}
                placeholder="e.g. Finance Director"
              />
            </FormGrid>

            <FormGrid>
              <EmailField
                label="Email address"
                name="email"
                optional
                maxLength={320}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={saving}
                placeholder="name@company.com"
              />

              <PhoneField
                label="Phone number"
                name="phone"
                optional
                maxLength={50}
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                disabled={saving}
                placeholder="+234 800 000 0000"
              />
            </FormGrid>
          </FormSection>

          <FormSection
            title="Additional details"
            description="Private context and how this person appears on the client record."
          >
            <TextArea
              label="Notes"
              name="notes"
              optional
              rows={4}
              maxLength={5000}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              disabled={saving}
              placeholder="Add useful context about this contact…"
            />

            <FormSubsection divided title="Contact preferences">
              <Checkbox
                label="Primary contact"
                hint="Mark this person as the main contact for this client."
                checked={isPrimary}
                onChange={setIsPrimary}
                disabled={saving}
              />
            </FormSubsection>
          </FormSection>

          {error && <Alert variant="error">{error}</Alert>}

          <FormActions>
            <Button
              type="button"
              variant="danger"
              zone="calm"
              disabled={saving || deleting}
              onClick={() => void handleDelete()}
              className="mr-auto"
            >
              {deleting ? (
                <>
                  <CircleNotch className="mr-2 size-4 animate-spin" aria-hidden="true" />
                  Deleting…
                </>
              ) : (
                <>
                  <Trash className="mr-2 size-4" aria-hidden="true" />
                  Delete contact
                </>
              )}
            </Button>

            <Link
              href="/clients/contacts"
              className={buttonStyles({ variant: 'outline', zone: 'calm' })}
            >
              Cancel
            </Link>

            <Button type="submit" disabled={saving || deleting}>
              {saving ? (
                <>
                  <CircleNotch className="mr-2 size-4 animate-spin" aria-hidden="true" />
                  Saving changes…
                </>
              ) : (
                <>
                  <Check className="mr-2 size-4" aria-hidden="true" />
                  Save changes
                </>
              )}
            </Button>
          </FormActions>
        </form>
      ) : null}
    </PageContainer>
  );
}
