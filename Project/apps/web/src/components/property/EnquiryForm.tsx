'use client';

import { useState } from 'react';
import { enquiryCreateSchema, CONTACT_METHODS } from '@skyspace/shared';
import { api } from '@/lib/api';
import { ApiError } from '@/lib/api-error';
import { useAuth } from '@/features/auth/AuthProvider';
import { Button } from '@/components/ui/Button';
import { Checkbox, Input, Select, Textarea } from '@/components/ui/Field';
import { Alert } from '@/components/ui/Feedback';

interface Props {
  propertyId?: string;
  agentId?: string;
  defaultMessage?: string;
  enquiryType?: 'buy' | 'rent' | 'price_info' | 'site_visit' | 'general';
  source?: 'property_details' | 'contact_form' | 'agent_profile' | 'sell_page';
  endpoint?: '/enquiries' | '/content/contact';
  submitLabel?: string;
}

export function EnquiryForm({ propertyId, agentId, defaultMessage = '', enquiryType = 'general', source = 'property_details', endpoint = '/enquiries', submitLabel = 'Send enquiry' }: Props) {
  const { user } = useAuth();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [formError, setFormError] = useState('');

  if (status === 'sent') {
    return (
      <Alert tone="success">
        <strong>Enquiry received.</strong> The {agentId ? 'agent' : 'owner or agent'} will contact you using your preferred method. You can track it under My Enquiries once signed in.
      </Alert>
    );
  }

  return (
    <form
      noValidate
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const data = {
          propertyId, agentId, enquiryType, source,
          name: String(fd.get('name') ?? ''),
          email: String(fd.get('email') ?? ''),
          phone: String(fd.get('phone') ?? ''),
          preferredContact: String(fd.get('preferredContact') ?? 'phone'),
          message: String(fd.get('message') ?? ''),
          consent: fd.get('consent') === 'on',
          website: String(fd.get('website') ?? ''),
        };
        const schema = endpoint === '/enquiries' ? enquiryCreateSchema : enquiryCreateSchema.omit({ propertyId: true, agentId: true, enquiryType: true, source: true, preferredContact: true });
        const parsed = schema.safeParse(data);
        if (!parsed.success) {
          setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
          return;
        }
        setErrors({});
        setFormError('');
        setStatus('sending');
        try {
          const body = endpoint === '/enquiries' ? data : { name: data.name, email: data.email, phone: data.phone, message: data.message, consent: data.consent, website: data.website };
          await api(endpoint, { body });
          setStatus('sent');
        } catch (err) {
          setStatus('idle');
          if (err instanceof ApiError) {
            setErrors(err.fieldErrors());
            setFormError(err.message);
          } else setFormError('Could not send your enquiry. Please try again.');
        }
      }}
    >
      {formError && <Alert tone="error">{formError}</Alert>}
      <Input label="Your name" name="name" autoComplete="name" required defaultValue={user?.name} error={errors.name} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Mobile number" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="98765 43210" required defaultValue={user?.phone?.replace('+91', '')} error={errors.phone} />
        <Input label="Email" name="email" type="email" autoComplete="email" required defaultValue={user?.email} error={errors.email} />
      </div>
      {endpoint === '/enquiries' && (
        <Select label="Preferred contact" name="preferredContact" defaultValue="phone">
          {CONTACT_METHODS.map((m) => <option key={m} value={m}>{m === 'whatsapp' ? 'WhatsApp' : m[0]!.toUpperCase() + m.slice(1)}</option>)}
        </Select>
      )}
      <Textarea label="Message" name="message" required defaultValue={defaultMessage} error={errors.message} />
      {/* Honeypot: hidden from people and assistive tech */}
      <div aria-hidden className="absolute left-[-10000px] h-0 w-0 overflow-hidden">
        <label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>
      <Checkbox name="consent" error={errors.consent} label={<>I agree to be contacted about this enquiry and accept the <a href="/privacy" className="text-brand-700 underline">privacy policy</a>.</>} />
      <Button type="submit" className="w-full" loading={status === 'sending'}>{submitLabel}</Button>
    </form>
  );
}
