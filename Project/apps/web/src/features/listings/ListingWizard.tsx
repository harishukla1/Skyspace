'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  AMENITIES, DEFAULT_PROPERTY_TYPES, FURNISHING_LABELS, FURNISHING_STATUSES, INDIAN_STATES, MAX_IMAGES_PER_PROPERTY, amenityLabel, formatINR,
  isPlotType, type CategoryDTO, type ManagedPropertyDTO, type PropertyImageDTO,
} from '@skyspace/shared';
import { api } from '@/lib/api';
import { ApiError } from '@/lib/api-error';
import { Button } from '@/components/ui/Button';
import { Checkbox, Input, Select, Textarea } from '@/components/ui/Field';
import { Alert } from '@/components/ui/Feedback';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/labels';

const STEPS = ['Type', 'Location', 'Details', 'Pricing', 'Photos', 'Review'] as const;
type Form = Record<string, unknown>;

const NUMERIC = new Set(['price', 'monthlyRent', 'securityDeposit', 'maintenanceCharges', 'bedrooms', 'bathrooms', 'balconies', 'coveredParking', 'openParking', 'carpetArea', 'builtUpArea', 'plotArea', 'floorNumber', 'totalFloors', 'propertyAgeYears', 'leaseTermMonths', 'lockInMonths']);

/** Strip empty strings and convert numeric inputs before sending to the API. */
function clean(f: Form): Form {
  const out: Form = {};
  for (const [k, v] of Object.entries(f)) {
    if (v === '' || v === undefined || v === null) continue;
    out[k] = NUMERIC.has(k) ? Number(v) : v;
  }
  if (f.lat !== undefined && f.lng !== undefined && f.lat !== '' && f.lng !== '') out.location = { lat: Number(f.lat), lng: Number(f.lng) };
  delete out.lat;
  delete out.lng;
  return out;
}

function fromProperty(p: ManagedPropertyDTO): Form {
  const { images: _i, stats: _s, contact: _c, location, ...rest } = p;
  return { ...rest, lat: location?.lat ?? '', lng: location?.lng ?? '' };
}

export function ListingWizard({ propertyId, basePath }: { propertyId?: string; basePath: string }) {
  const router = useRouter();
  const toast = useToast();
  const [id, setId] = useState(propertyId);
  const [step, setStep] = useState(0);
  const [f, setF] = useState<Form>({ transactionType: 'sale', propertyCategory: 'residential', propertyType: 'apartment', areaUnit: 'sqft', amenities: [], listedBy: 'owner', showContactDetails: false, hideExactLocation: false });
  const [images, setImages] = useState<PropertyImageDTO[]>([]);
  const [status, setStatus] = useState<string>('draft');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [types, setTypes] = useState<{ slug: string; name: string; category: string }[]>(DEFAULT_PROPERTY_TYPES);

  useEffect(() => {
    api<{ items: CategoryDTO[] }>('/categories').then((r) => r.items.length && setTypes(r.items)).catch(() => undefined);
  }, []);
  useEffect(() => {
    if (!propertyId) return;
    api<{ property: ManagedPropertyDTO }>(`/owner/properties/${propertyId}`).then((r) => {
      setF(fromProperty(r.property));
      setImages(r.property.images);
      setStatus(r.property.status);
    }).catch((e) => setFormError(e.message));
  }, [propertyId]);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF((p) => ({ ...p, [k]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value }));
  const v = (k: string) => (f[k] ?? '') as string;
  const plot = isPlotType(v('propertyType'));
  const residential = f.propertyCategory === 'residential';
  const rent = f.transactionType === 'rent';

  async function persist(): Promise<string | null> {
    setBusy(true);
    setFormError('');
    setErrors({});
    try {
      const body = clean(f);
      for (const k of ['id', 'propertyId', 'slug', 'status', 'verificationStatus', 'featured', 'ownerId', 'agentId', 'moderationComment', 'createdAt', 'updatedAt', 'publishedAt', 'imageCount', 'coverImage', 'nearby']) delete body[k];
      if (!id) {
        const r = await api<{ property: ManagedPropertyDTO }>('/properties', { body });
        setId(r.property.id);
        window.history.replaceState(null, '', `${basePath}/${r.property.id}/edit`);
        return r.property.id;
      }
      const r = await api<{ property: ManagedPropertyDTO; reapprovalRequired: boolean }>(`/properties/${id}`, { method: 'PATCH', body });
      setStatus(r.property.status);
      if (r.reapprovalRequired) toast('Changes saved. The listing will be re-reviewed before it goes live again.', 'info');
      return id;
    } catch (e) {
      if (e instanceof ApiError) {
        setErrors(e.fieldErrors());
        setFormError(e.message);
      } else setFormError('Could not save');
      return null;
    } finally {
      setBusy(false);
    }
  }

  const next = async () => {
    if (await persist()) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  async function upload(files: FileList | null) {
    if (!files?.length || !id) return;
    const fd = new FormData();
    Array.from(files).slice(0, 10).forEach((file) => fd.append('images', file));
    setBusy(true);
    try {
      const r = await api<{ images: PropertyImageDTO[] }>(`/properties/${id}/images`, { form: fd });
      setImages(r.images);
      toast(`${files.length} photo(s) uploaded`);
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (!(await persist())) return;
    setBusy(true);
    try {
      await api(`/properties/${id}/submit`, { method: 'POST' });
      toast('Submitted for approval. We will notify you once it is reviewed.');
      router.push(`${basePath}/${id}`);
    } catch (e) {
      if (e instanceof ApiError) {
        setErrors(e.fieldErrors());
        setFormError(e.message);
      }
    } finally {
      setBusy(false);
    }
  }

  const err = (k: string) => errors[k];
  const typeOptions = types.filter((t) => t.category === f.propertyCategory);

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      <ol className="flex gap-2 overflow-x-auto lg:flex-col" aria-label="Steps">
        {STEPS.map((s, i) => (
          <li key={s}>
            <button
              type="button"
              disabled={!id && i > 0}
              onClick={() => setStep(i)}
              aria-current={step === i ? 'step' : undefined}
              className={cn('flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm whitespace-nowrap disabled:opacity-40', step === i ? 'bg-brand-600 text-white' : 'hover:bg-white')}
            >
              <span className={cn('flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold', step === i ? 'bg-white text-brand-700' : 'bg-white ring-1 ring-line')}>{i + 1}</span>
              {s}
            </button>
          </li>
        ))}
      </ol>

      <div className="card p-6">
        {formError && <div className="mb-4"><Alert tone="error">{formError}{Object.keys(errors).length > 0 && <ul className="mt-1 list-disc pl-5">{Object.entries(errors).map(([k, m]) => <li key={k}>{k}: {m}</li>)}</ul>}</Alert></div>}
        {status === 'published' && <div className="mb-4"><Alert tone="info">This listing is live. Changing title, price, location, area, bedrooms or photos sends it back for review.</Alert></div>}

        {step === 0 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold">What are you listing?</h2>
            <fieldset>
              <legend className="label">I want to</legend>
              <div className="flex gap-2">
                {[['sale', 'Sell'], ['rent', 'Rent out']].map(([val, l]) => <button key={val} type="button" className="chip" aria-pressed={f.transactionType === val} onClick={() => setF((p) => ({ ...p, transactionType: val }))}>{l}</button>)}
              </div>
            </fieldset>
            <fieldset>
              <legend className="label">Category</legend>
              <div className="flex gap-2">
                {[['residential', 'Residential'], ['commercial', 'Commercial']].map(([val, l]) => (
                  <button key={val} type="button" className="chip" aria-pressed={f.propertyCategory === val} onClick={() => setF((p) => ({ ...p, propertyCategory: val, propertyType: types.find((t) => t.category === val)?.slug }))}>{l}</button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="label">Property type</legend>
              <div className="flex flex-wrap gap-2">
                {typeOptions.map((t) => <button key={t.slug} type="button" className="chip" aria-pressed={f.propertyType === t.slug} onClick={() => setF((p) => ({ ...p, propertyType: t.slug }))}>{t.name}</button>)}
              </div>
            </fieldset>
            <Select label="Listed by" value={v('listedBy')} onChange={set('listedBy')} wrapClassName="max-w-xs">
              <option value="owner">Owner</option><option value="agent">Agent</option><option value="builder">Builder</option>
            </Select>
          </div>
        )}

        {step === 1 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <h2 className="text-lg font-semibold sm:col-span-2">Where is it?</h2>
            <Input label="Project / society name" value={v('projectName')} onChange={set('projectName')} error={err('projectName')} wrapClassName="sm:col-span-2" />
            <Input label="Address" required value={v('address')} onChange={set('address')} error={err('address')} wrapClassName="sm:col-span-2" hint="Building, street. Hidden publicly if you choose approximate location." />
            <Input label="Locality" required value={v('locality')} onChange={set('locality')} error={err('locality')} />
            <Input label="City" required value={v('city')} onChange={set('city')} error={err('city')} />
            <Select label="State" required value={v('state')} onChange={set('state')} error={err('state')}>
              <option value="">Select state</option>
              {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
            <Input label="PIN code" required inputMode="numeric" maxLength={6} value={v('pinCode')} onChange={set('pinCode')} error={err('pinCode')} />
            <Input label="Latitude (optional)" type="number" step="any" value={v('lat')} onChange={set('lat')} error={err('location.lat')} />
            <Input label="Longitude (optional)" type="number" step="any" value={v('lng')} onChange={set('lng')} error={err('location.lng')} />
            <Checkbox className="sm:col-span-2" checked={!!f.hideExactLocation} onChange={set('hideExactLocation')} label="Show only an approximate location publicly (hides street address and exact pin)" />
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <h2 className="text-lg font-semibold sm:col-span-2 lg:col-span-3">Property details</h2>
            <Input label="Listing title" required value={v('title')} onChange={set('title')} error={err('title')} wrapClassName="sm:col-span-2 lg:col-span-3" placeholder="e.g. Spacious 3 BHK with lake view in Powai" />
            <Textarea label="Description" required value={v('description')} onChange={set('description')} error={err('description')} wrapClassName="sm:col-span-2 lg:col-span-3" rows={6} />
            {residential && !plot && <Input label="Bedrooms" type="number" min={0} required value={v('bedrooms')} onChange={set('bedrooms')} error={err('bedrooms')} />}
            {!plot && <Input label="Bathrooms" type="number" min={0} value={v('bathrooms')} onChange={set('bathrooms')} error={err('bathrooms')} />}
            {residential && !plot && <Input label="Balconies" type="number" min={0} value={v('balconies')} onChange={set('balconies')} />}
            <Select label="Area unit" value={v('areaUnit')} onChange={set('areaUnit')}><option value="sqft">Square feet (sq.ft)</option><option value="sqm">Square metres (sq.m)</option></Select>
            {plot ? (
              <Input label="Plot area" type="number" min={1} required value={v('plotArea')} onChange={set('plotArea')} error={err('plotArea')} />
            ) : (
              <>
                <Input label="Carpet area" type="number" min={1} value={v('carpetArea')} onChange={set('carpetArea')} error={err('carpetArea')} />
                <Input label="Built-up area" type="number" min={1} value={v('builtUpArea')} onChange={set('builtUpArea')} error={err('builtUpArea')} />
              </>
            )}
            {!plot && (
              <>
                <Select label="Furnishing" value={v('furnishingStatus')} onChange={set('furnishingStatus')}>
                  <option value="">Not specified</option>
                  {FURNISHING_STATUSES.map((s) => <option key={s} value={s}>{FURNISHING_LABELS[s]}</option>)}
                </Select>
                <Input label="Floor number" type="number" value={v('floorNumber')} onChange={set('floorNumber')} error={err('floorNumber')} hint="0 for ground floor" />
                <Input label="Total floors" type="number" min={1} value={v('totalFloors')} onChange={set('totalFloors')} />
                <Input label="Covered parking" type="number" min={0} value={v('coveredParking')} onChange={set('coveredParking')} />
                <Input label="Open parking" type="number" min={0} value={v('openParking')} onChange={set('openParking')} />
                <Select label="Possession" value={v('possessionStatus')} onChange={set('possessionStatus')}>
                  <option value="">Not specified</option><option value="ready_to_move">Ready to move</option><option value="under_construction">Under construction</option>
                </Select>
                {f.possessionStatus === 'under_construction' && <Input label="Expected possession" type="date" required value={v('possessionDate')} onChange={set('possessionDate')} error={err('possessionDate')} />}
                {f.possessionStatus !== 'under_construction' && <Input label="Property age (years)" type="number" min={0} value={v('propertyAgeYears')} onChange={set('propertyAgeYears')} />}
              </>
            )}
            {!rent && <Select label="Sale type" value={v('condition')} onChange={set('condition')}><option value="">Not specified</option><option value="new">New</option><option value="resale">Resale</option></Select>}
            <Input label="RERA registration no. (if applicable)" value={v('reraNumber')} onChange={set('reraNumber')} hint="Shown as provided; buyers should verify on the state RERA portal." />
            <fieldset className="sm:col-span-2 lg:col-span-3">
              <legend className="label">Amenities</legend>
              <div className="flex flex-wrap gap-2">
                {AMENITIES.map((a) => {
                  const list = (f.amenities as string[]) ?? [];
                  const on = list.includes(a);
                  return <button key={a} type="button" className="chip text-xs" aria-pressed={on} onClick={() => setF((p) => ({ ...p, amenities: on ? list.filter((x) => x !== a) : [...list, a] }))}>{amenityLabel(a)}</button>;
                })}
              </div>
            </fieldset>
          </div>
        )}

        {step === 3 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <h2 className="text-lg font-semibold sm:col-span-2">Price & availability</h2>
            {rent ? (
              <>
                <Input label="Monthly rent (₹)" type="number" min={0} required value={v('monthlyRent')} onChange={set('monthlyRent')} error={err('monthlyRent')} hint={formatINR(Number(v('monthlyRent')) || undefined)} />
                <Input label="Security deposit (₹)" type="number" min={0} value={v('securityDeposit')} onChange={set('securityDeposit')} hint={formatINR(Number(v('securityDeposit')) || undefined)} />
                <Input label="Available from" type="date" value={v('availableFrom')} onChange={set('availableFrom')} />
                <Input label="Lease term (months)" type="number" min={1} value={v('leaseTermMonths')} onChange={set('leaseTermMonths')} />
                <Input label="Lock-in (months)" type="number" min={0} value={v('lockInMonths')} onChange={set('lockInMonths')} />
              </>
            ) : (
              <Input label="Expected price (₹)" type="number" min={0} required value={v('price')} onChange={set('price')} error={err('price')} hint={formatINR(Number(v('price')) || undefined)} />
            )}
            <Input label="Maintenance per month (₹)" type="number" min={0} value={v('maintenanceCharges')} onChange={set('maintenanceCharges')} />
            <Checkbox className="sm:col-span-2" checked={!!f.priceNegotiable} onChange={set('priceNegotiable')} label="Price is negotiable" />
            <Checkbox className="sm:col-span-2" checked={!!f.showContactDetails} onChange={set('showContactDetails')} label="Show my phone number and email publicly on the listing (otherwise buyers contact you through enquiries)" />
          </div>
        )}

        {step === 4 && (
          <div>
            <h2 className="text-lg font-semibold">Photos</h2>
            <p className="mt-1 text-sm text-muted">JPEG, PNG or WebP, up to 5 MB each, max {MAX_IMAGES_PER_PROPERTY} photos. The first photo is the cover. Upload real photos of this property only.</p>
            <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-line bg-surface px-6 py-10 text-center hover:border-brand-400">
              <span className="font-medium text-brand-700">Click to choose photos</span>
              <span className="text-xs text-muted">or drag them here</span>
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(e) => upload(e.target.files)} disabled={busy || images.length >= MAX_IMAGES_PER_PROPERTY} />
            </label>
            {images.length > 0 && (
              <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {images.map((img, i) => (
                  <li key={img.id} className="relative aspect-[4/3] overflow-hidden rounded-xl bg-surface">
                    <Image src={img.url} alt={img.altText} fill sizes="200px" className="object-cover" />
                    {i === 0 && <span className="absolute left-2 top-2 rounded bg-brand-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">Cover</span>}
                    <div className="absolute inset-x-0 bottom-0 flex justify-between bg-ink/60 p-1">
                      {i > 0 ? (
                        <button type="button" className="rounded px-1.5 text-xs text-white hover:bg-white/20" onClick={async () => {
                          const order = [...images];
                          [order[i - 1], order[i]] = [order[i]!, order[i - 1]!];
                          const r = await api<{ images: PropertyImageDTO[] }>(`/properties/${id}/images`, { method: 'PATCH', body: { images: order.map((im, idx) => ({ id: im.id, order: idx })) } });
                          setImages(r.images);
                        }}>‹ Move</button>
                      ) : <span />}
                      <button type="button" className="rounded px-1.5 text-xs text-white hover:bg-white/20" onClick={async () => {
                        const r = await api<{ images: PropertyImageDTO[] }>(`/properties/${id}/images/${img.id}`, { method: 'DELETE' });
                        setImages(r.images);
                      }}>Remove</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Review & submit</h2>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              {[
                ['Title', v('title')], ['Type', `${rent ? 'For rent' : 'For sale'} · ${v('propertyType')}`],
                ['Location', [v('locality'), v('city'), v('state'), v('pinCode')].filter(Boolean).join(', ')],
                ['Price', rent ? `${formatINR(Number(v('monthlyRent')))} / month` : formatINR(Number(v('price')))],
                ['Area', plot ? `${v('plotArea')} ${v('areaUnit')}` : `${v('carpetArea') || v('builtUpArea')} ${v('areaUnit')}`],
                ['Photos', String(images.length)],
              ].map(([k, val]) => <div key={k} className="rounded-xl bg-surface p-3"><dt className="text-xs text-muted">{k}</dt><dd className="font-medium">{val || '—'}</dd></div>)}
            </dl>
            <Alert>After you submit, our team reviews the listing (usually within one business day). You’ll be notified when it is approved or if changes are needed.</Alert>
            {!['draft', 'rejected', 'unavailable', 'rented'].includes(status) && <Alert tone="warning">This listing is currently “{status.replace('_', ' ')}” and cannot be resubmitted from here.</Alert>}
          </div>
        )}

        <div className="mt-8 flex flex-wrap justify-between gap-2 border-t border-line pt-4">
          <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>‹ Back</Button>
          <div className="flex gap-2">
            {id && <Button variant="outline" loading={busy} onClick={async () => { if (await persist()) toast('Saved'); }}>Save {status === 'draft' ? 'draft' : 'changes'}</Button>}
            {step < STEPS.length - 1 ? (
              <Button loading={busy} onClick={step === 4 ? () => setStep(5) : next}>{step === 4 ? 'Continue' : 'Save & continue'}</Button>
            ) : (
              <Button loading={busy} onClick={submit} disabled={!['draft', 'rejected', 'unavailable', 'rented'].includes(status)}>Submit for approval</Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
