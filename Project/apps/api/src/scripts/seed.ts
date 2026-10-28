/**
 * Development seed. Creates sample cities, categories, users, listings (with Unsplash sample photos), leads and visits.
 * Usage: npm run seed            (refuses to run when NODE_ENV=production unless --force)
 *        npm run seed -- --reset (drops existing data first)
 */
import mongoose from 'mongoose';
import { DEFAULT_PROPERTY_TYPES, istToday, slugify, type ListingStatus } from '@skyspace/shared';
import { connectDb } from '../config/db';
import { env } from '../config/env';
import { User } from '../models/user.model';
import { Property } from '../models/property.model';
import {
  AgentProfile, Category, City, Enquiry, ListingStatusHistory, Notification, Report, SiteConfig, SiteVisit, nextSequence, Shortlist,
} from '../models/misc.models';
import { hashPassword } from '../modules/auth/auth.service';
import { CITIES, FAQS, IMAGES, PAGES, PROJECTS, TEMPLATES, TESTIMONIALS, unsplash } from './seed-data';

let s = 42;
const rand = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
const pick = <T>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)]!;
const between = (a: number, b: number) => Math.round(a + rand() * (b - a));
const roundTo = (n: number, step: number) => Math.round(n / step) * step;
const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000);

export async function seed({ reset = false } = {}) {
  if (reset) {
    await mongoose.connection.db!.dropDatabase();
    console.log('Database dropped');
  }
  if (await User.exists({ email: 'admin@skyspace.test' })) {
    console.log('Seed data already present (admin@skyspace.test exists). Use --reset to recreate.');
    return;
  }
  await Promise.all(mongoose.modelNames().map((n) => mongoose.model(n).syncIndexes()));

  await Category.insertMany(DEFAULT_PROPERTY_TYPES.map((t, i) => ({ ...t, order: i, active: true })));
  await City.insertMany(
    CITIES.map((c) => ({
      name: c.name, slug: slugify(c.name), state: c.state, popular: c.popular, active: true, imageUrl: c.image,
      localities: c.localities.map((l) => ({ name: l.name, slug: slugify(l.name), pinCodes: [l.pin] })),
    })),
  );

  const pw = await hashPassword('Password@123');
  const adminPw = await hashPassword('Admin@12345');
  const mk = (name: string, email: string, phone: string, roles: string[], extra = {}) =>
    User.create({ name, email, phone, roles, passwordHash: roles.includes('admin') ? adminPw : pw, emailVerified: true, ...extra });
  const admin = await mk('Platform Admin', 'admin@skyspace.test', '+919800000001', ['admin', 'customer']);
  const agents = [
    await mk('Riya Kapoor', 'riya.agent@skyspace.test', '+919800000011', ['agent', 'customer']),
    await mk('Arjun Menon', 'arjun.agent@skyspace.test', '+919800000012', ['agent', 'customer']),
    await mk('Sneha Kulkarni', 'sneha.agent@skyspace.test', '+919800000013', ['agent', 'customer']),
  ];
  const owners = [
    await mk('Vikram Shah', 'owner@skyspace.test', '+919800000021', ['owner', 'customer']),
    await mk('Lakshmi Iyer', 'lakshmi.owner@skyspace.test', '+919800000022', ['owner', 'customer']),
  ];
  const customer = await mk('Aman Verma', 'customer@skyspace.test', '+919800000031', ['customer']);
  await mk('Suspended User', 'suspended@skyspace.test', '+919800000041', ['customer'], { status: 'suspended', statusReason: 'Sample suspended account' });

  const agentMeta = [
    { agencyName: 'Sky Space Realty — West', cities: ['Mumbai', 'Pune'], experienceYears: 9, languages: ['English', 'Hindi', 'Marathi'], specialisations: ['Residential resale', 'Luxury'] },
    { agencyName: 'Sky Space Realty — South', cities: ['Bengaluru', 'Chennai', 'Hyderabad'], experienceYears: 7, languages: ['English', 'Malayalam', 'Tamil', 'Kannada'], specialisations: ['Commercial leasing', 'IT parks'] },
    { agencyName: 'Sky Space Realty — North & East', cities: ['Delhi', 'Gurugram', 'Noida', 'Kolkata', 'Jaipur', 'Ahmedabad'], experienceYears: 5, languages: ['English', 'Hindi', 'Bengali'], specialisations: ['Rentals', 'Retail'] },
  ];
  await AgentProfile.insertMany(
    agents.map((a, i) => ({
      userId: a._id, slug: `${slugify(a.name)}-${String(a._id).slice(-5)}`, publicProfile: true, reraAgentNumber: undefined,
      bio: `${a.name} helps clients buy, sell and lease property across ${agentMeta[i]!.cities.join(', ')}.`, ...agentMeta[i],
    })),
  );
  const agentForCity = (city: string) => agents[agentMeta.findIndex((m) => m.cities.includes(city))] ?? agents[0]!;

  const statuses: ListingStatus[] = ['published', 'published', 'published', 'published', 'published', 'published', 'published', 'pending_approval', 'draft', 'sold', 'rented', 'rejected'];
  const amenityPool = ['lift', 'power_backup', 'security', 'cctv', 'gym', 'swimming_pool', 'club_house', 'park', 'children_play_area', 'gated_community', 'intercom', 'gas_pipeline', 'visitor_parking', 'fire_safety', 'water_supply_24x7'] as const;
  const commercialAmenities = ['lift', 'power_backup', 'security', 'cctv', 'fire_safety', 'wifi', 'cafeteria', 'conference_room', 'air_conditioning', 'visitor_parking'] as const;

  const properties = [];
  let n = 0;
  for (const city of CITIES) {
    const count = city.popular ? 7 : 4;
    for (let i = 0; i < count; i++) {
      const t = TEMPLATES[(n + i * 5) % TEMPLATES.length]!;
      const loc = pick(city.localities);
      const bhk = t.bhk ? pick(t.bhk) : undefined;
      const area = roundTo(between(t.area[0], t.area[1]) * (bhk ? bhk / 2.5 + 0.3 : 1), 10);
      const isPlot = t.type.endsWith('plot');
      const amount = t.tx === 'sale' ? roundTo(area * t.rate * city.priceFactor, 100000) : roundTo(area * t.rate * city.priceFactor, 500);
      let status = statuses[n % statuses.length]!;
      if (status === 'sold' && t.tx === 'rent') status = 'rented';
      if (status === 'rented' && t.tx === 'sale') status = 'sold';
      const useAgent = n % 3 !== 0;
      const owner = owners[n % owners.length]!;
      const agent = agentForCity(city.name);
      const seq = await nextSequence('property');
      const propertyId = `SSR${seq}`;
      const title = t.title(bhk, loc.name);
      const imgs = IMAGES[t.img];
      const imageIds = Array.from({ length: Math.min(imgs.length, isPlot ? 2 : 4) }, (_, k) => imgs[(n + k) % imgs.length]!);
      const createdAt = daysAgo(between(2, 170));
      const published = ['published', 'sold', 'rented'].includes(status);
      const project = t.category === 'residential' && !isPlot ? pick(PROJECTS) : undefined;
      const underConstruction = t.tx === 'sale' && t.type === 'apartment' && n % 4 === 0;
      properties.push({
        propertyId,
        slug: `${slugify(`${title} ${city.name}`)}-${propertyId.toLowerCase()}`,
        title,
        description: `${title}${project ? ` at ${project}` : ''}, ${city.name}. ${t.category === 'residential' ? `Well-ventilated ${bhk ? `${bhk} bedroom ` : ''}home with good natural light, close to schools, hospitals and daily-needs shopping.` : 'Prime commercial location with good road connectivity, ample parking and power backup — suitable for corporates, retail brands and logistics.'} Sample listing created for demonstration purposes.`,
        transactionType: t.tx,
        propertyCategory: t.category,
        propertyType: t.type,
        listedBy: useAgent ? 'agent' : 'owner',
        price: t.tx === 'sale' ? amount : undefined,
        monthlyRent: t.tx === 'rent' ? amount : undefined,
        securityDeposit: t.tx === 'rent' ? amount * (t.category === 'commercial' ? 6 : 2) : undefined,
        maintenanceCharges: isPlot ? undefined : roundTo(area * 3, 100),
        priceValue: amount,
        priceNegotiable: n % 2 === 0,
        projectName: project,
        address: `${between(1, 250)}, ${project ? 'Tower ' + 'ABCD'[n % 4] : 'Main Road'}`,
        locality: loc.name,
        localitySlug: slugify(loc.name),
        city: city.name,
        citySlug: slugify(city.name),
        state: city.state,
        pinCode: loc.pin,
        location: { type: 'Point', coordinates: [loc.lng + (rand() - 0.5) * 0.01, loc.lat + (rand() - 0.5) * 0.01] },
        hideExactLocation: n % 4 === 1,
        bedrooms: bhk,
        bathrooms: bhk ? Math.max(1, bhk - (n % 2)) : t.category === 'commercial' && !isPlot && t.type !== 'warehouse' ? 2 : undefined,
        balconies: bhk ? between(0, 3) : undefined,
        coveredParking: isPlot ? undefined : between(0, 2),
        openParking: t.category === 'commercial' ? between(0, 10) : undefined,
        carpetArea: isPlot ? undefined : area,
        builtUpArea: isPlot ? undefined : roundTo(area * 1.2, 10),
        plotArea: isPlot ? area : undefined,
        areaUnit: 'sqft',
        areaSqft: area,
        furnishingStatus: isPlot || t.type === 'warehouse' ? undefined : pick(['unfurnished', 'semi_furnished', 'furnished'] as const),
        floorNumber: t.type === 'apartment' || t.type === 'office' ? between(1, 18) : undefined,
        totalFloors: t.type === 'apartment' || t.type === 'office' ? 20 : undefined,
        propertyAgeYears: underConstruction || isPlot ? undefined : between(0, 15),
        possessionStatus: isPlot ? undefined : underConstruction ? 'under_construction' : 'ready_to_move',
        possessionDate: underConstruction ? new Date(Date.UTC(2027, between(0, 11), 1)) : undefined,
        condition: t.tx === 'sale' ? (underConstruction ? 'new' : pick(['new', 'resale'] as const)) : undefined,
        availableFrom: t.tx === 'rent' ? new Date(`${istToday()}T00:00:00Z`) : undefined,
        leaseTermMonths: t.tx === 'rent' ? (t.category === 'commercial' ? 36 : 11) : undefined,
        lockInMonths: t.tx === 'rent' && t.category === 'commercial' ? 12 : undefined,
        preferredTenants: t.tx === 'rent' && t.category === 'residential' ? ['family', 'company'] : undefined,
        amenities: isPlot ? ['gated_community', 'security'] : (t.category === 'commercial' ? commercialAmenities : amenityPool).filter(() => rand() > 0.45),
        nearby: [
          { type: 'transport', name: `${loc.name} Metro / Bus Station`, distanceKm: Math.round(rand() * 30) / 10 + 0.3 },
          { type: 'school', name: `${loc.name} Public School`, distanceKm: Math.round(rand() * 25) / 10 + 0.5 },
          { type: 'hospital', name: `${city.name} Multispeciality Hospital`, distanceKm: Math.round(rand() * 50) / 10 + 1 },
        ],
        reraNumber: t.tx === 'sale' && t.category === 'residential' && project && n % 2 === 0 ? `P5${between(1000000, 9999999)}` : undefined,
        showContactDetails: !useAgent && n % 2 === 0,
        images: imageIds.map((id, k) => ({ key: `seed/${id}`, url: unsplash(id), altText: `${title} — photo ${k + 1} (sample image)`, order: k })),
        ownerId: owner._id,
        agentId: useAgent ? agent._id : undefined,
        status,
        verificationStatus: published && n % 5 === 0 ? 'verified' : 'unverified',
        verifiedAt: published && n % 5 === 0 ? createdAt : undefined,
        verifiedBy: published && n % 5 === 0 ? admin._id : undefined,
        featured: status === 'published' && n % 4 === 0,
        moderationComment: status === 'rejected' ? 'Photos do not match the property description. Please upload actual photos.' : undefined,
        submittedAt: status === 'draft' ? undefined : createdAt,
        publishedAt: published ? new Date(createdAt.getTime() + 86_400_000) : undefined,
        stats: { views: published ? between(20, 900) : 0, enquiries: 0, shortlists: 0, visits: 0 },
        createdAt,
        updatedAt: createdAt,
      });
      n++;
    }
  }
  const inserted = (await Property.insertMany(properties as never[], { timestamps: false } as never)) as unknown as InstanceType<typeof Property>[];
  await ListingStatusHistory.insertMany(
    inserted.flatMap((p) => {
      const h: Record<string, unknown>[] = [{ propertyId: p._id, newStatus: 'draft', changedBy: p.ownerId, comment: 'Listing created', createdAt: p.createdAt }];
      if (p.status !== 'draft') h.push({ propertyId: p._id, previousStatus: 'draft', newStatus: 'pending_approval', changedBy: p.ownerId, comment: 'Submitted for approval', createdAt: p.createdAt });
      if (['published', 'sold', 'rented'].includes(p.status)) h.push({ propertyId: p._id, previousStatus: 'pending_approval', newStatus: 'published', changedBy: admin._id, createdAt: p.publishedAt });
      if (['sold', 'rented', 'rejected'].includes(p.status)) h.push({ propertyId: p._id, previousStatus: p.status === 'rejected' ? 'pending_approval' : 'published', newStatus: p.status, changedBy: p.status === 'rejected' ? admin._id : p.ownerId, comment: p.moderationComment, createdAt: new Date() });
      return h;
    }),
  );

  const live = inserted.filter((p) => p.status === 'published');
  const names = ['Rahul Sharma', 'Priya Nair', 'Karan Mehta', 'Ananya Reddy', 'Mohit Gupta', 'Neha Joshi', 'Sameer Khan', 'Divya Rao', 'Rohan Das', 'Pooja Patel'];
  const leadStatuses = ['new', 'new', 'contacted', 'qualified', 'follow_up_required', 'site_visit_scheduled', 'converted', 'closed', 'invalid'] as const;
  const enquiries = [];
  for (let i = 0; i < 36; i++) {
    const p = live[i % live.length]!;
    const name = names[i % names.length]!;
    const status = leadStatuses[i % leadStatuses.length]!;
    const created = daysAgo(between(0, 85));
    enquiries.push({
      propertyId: p._id, ownerId: p.ownerId, assignedAgentId: p.agentId, customerId: i % 6 === 0 ? customer._id : undefined,
      name: i % 6 === 0 ? customer.name : name, email: i % 6 === 0 ? customer.email : `${slugify(name).replace('-', '.')}${i}@example.com`,
      phone: i % 6 === 0 ? customer.phone : `+9197${String(10000000 + i * 7919).slice(0, 8)}`,
      preferredContact: pick(['phone', 'email', 'whatsapp'] as const), message: `Hi, I am interested in ${p.title}. Is it still available? Please share more details.`,
      enquiryType: p.transactionType === 'rent' ? 'rent' : 'buy', source: 'property_details', status,
      followUpAt: status === 'follow_up_required' ? new Date(Date.now() + between(1, 7) * 86_400_000) : undefined,
      notes: status !== 'new' ? [{ note: 'Called the customer and shared details.', by: p.agentId ?? p.ownerId, createdAt: created }] : [],
      history: [{ to: 'new', at: created }, ...(status !== 'new' ? [{ from: 'new', to: status, by: p.agentId ?? p.ownerId, at: created }] : [])],
      consentAt: created, createdAt: created, updatedAt: created,
    });
  }
  await Enquiry.insertMany(enquiries, { timestamps: false } as never);
  for (const e of enquiries) await Property.updateOne({ _id: e.propertyId }, { $inc: { 'stats.enquiries': 1 } });

  const visitStatuses = ['pending_confirmation', 'confirmed', 'completed', 'cancelled', 'pending_confirmation', 'confirmed', 'no_show', 'rejected'] as const;
  const slots = ['10:00', '11:00', '15:00', '16:00', '17:00'];
  const visits = [];
  for (let i = 0; i < 16; i++) {
    const p = live[(i * 3) % live.length]!;
    const status = visitStatuses[i % visitStatuses.length]!;
    const past = ['completed', 'no_show'].includes(status);
    const day = new Date(Date.now() + (past ? -between(2, 30) : between(2, 20)) * 86_400_000);
    const date = istToday(day);
    const timeSlot = slots[i % slots.length]!;
    const scheduledAt = new Date(`${date}T${timeSlot}:00+05:30`);
    const isCustomer = i % 4 === 0;
    visits.push({
      propertyId: p._id, ownerId: p.ownerId, assignedAgentId: p.agentId, customerId: isCustomer ? customer._id : undefined,
      name: isCustomer ? customer.name : names[i % names.length], phone: isCustomer ? customer.phone : `+9196${String(20000000 + i * 3571).slice(0, 8)}`,
      email: isCustomer ? customer.email : `visitor${i}@example.com`, scheduledAt, date, timeSlot, status,
      confirmedAt: ['confirmed', 'completed', 'no_show'].includes(status) ? daysAgo(1) : undefined,
      propertySlotLock: status === 'confirmed' ? `${p._id}:${scheduledAt.toISOString()}` : undefined,
      agentSlotLock: status === 'confirmed' && p.agentId ? `${p.agentId}:${scheduledAt.toISOString()}` : undefined,
      history: [{ to: 'pending_confirmation', at: daysAgo(3) }, ...(status !== 'pending_confirmation' ? [{ from: 'pending_confirmation', to: status, at: daysAgo(1) }] : [])],
    });
  }
  // Avoid duplicate lock collisions in the sample data.
  const seen = new Set<string>();
  for (const v of visits) {
    if (v.propertySlotLock && seen.has(v.propertySlotLock)) v.status = 'pending_confirmation', v.propertySlotLock = undefined, v.agentSlotLock = undefined;
    if (v.propertySlotLock) seen.add(v.propertySlotLock);
  }
  const seenAgent = new Set<string>();
  for (const v of visits) {
    if (v.agentSlotLock && seenAgent.has(v.agentSlotLock)) v.agentSlotLock = undefined;
    if (v.agentSlotLock) seenAgent.add(v.agentSlotLock);
  }
  await SiteVisit.insertMany(visits);

  await Shortlist.insertMany(live.slice(0, 4).map((p) => ({ userId: customer._id, propertyId: p._id })));
  await Report.create({ propertyId: live[2]!._id, email: 'reporter@example.com', reason: 'incorrect_info', details: 'Rent mentioned on call differs from the listing.' });
  await Notification.create({ userId: customer._id, type: 'system', title: 'Welcome to Sky Space Realty', message: 'Start shortlisting properties and request site visits from any listing page.', link: '/buy' });

  await SiteConfig.create({
    key: 'main',
    banners: [{ title: 'Find a space that lifts you higher', subtitle: 'Moderated listings for homes, offices and shops across India', imageUrl: unsplash('1600596542815-ffad4c1539a9', 2000), ctaLabel: 'Explore properties', ctaHref: '/search' }],
    faqs: FAQS,
    testimonials: TESTIMONIALS,
    pages: PAGES,
    seo: { homeTitle: 'Sky Space Realty — Buy, Sell & Rent Property in India', homeDescription: 'Search apartments, villas, plots, offices, shops and warehouses for sale and rent across Mumbai, Bengaluru, Pune, Delhi NCR, Hyderabad, Chennai and more.' },
    settings: { supportEmail: 'support@skyspacerealty.example', supportPhone: '+919800000000', officeAddress: 'Sky Space Realty, Mumbai, Maharashtra', enquiryDuplicateWindowHours: 24, autoPublishOnApprove: true },
  });

  console.log(`Seeded ${inserted.length} properties, ${enquiries.length} enquiries, ${visits.length} site visits.`);
  console.log('Sample accounts (development only):');
  console.log('  admin@skyspace.test / Admin@12345');
  console.log('  riya.agent@skyspace.test, arjun.agent@skyspace.test, sneha.agent@skyspace.test / Password@123');
  console.log('  owner@skyspace.test, lakshmi.owner@skyspace.test / Password@123');
  console.log('  customer@skyspace.test / Password@123');
}

const isMain = process.argv[1] && /seed\.(ts|js)$/.test(process.argv[1]);
if (isMain) {
  if (env.NODE_ENV === 'production' && !process.argv.includes('--force')) {
    console.error('Refusing to seed a production database. Pass --force if you really mean it.');
    process.exit(1);
  }
  await connectDb();
  await seed({ reset: process.argv.includes('--reset') });
  await mongoose.disconnect();
}
