import type { PropertyCategory } from '@skyspace/shared';

const U = (id: string, w = 1600) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=75`;
export const unsplash = U;

export const CITIES: {
  name: string;
  state: string;
  popular: boolean;
  image?: string;
  priceFactor: number;
  localities: { name: string; pin: string; lat: number; lng: number }[];
}[] = [
  { name: 'Mumbai', state: 'Maharashtra', popular: true, image: U('1567157577867-05ccb1388e66', 800), priceFactor: 2.4, localities: [
    { name: 'Powai', pin: '400076', lat: 19.1176, lng: 72.906 }, { name: 'Andheri West', pin: '400058', lat: 19.1364, lng: 72.8296 },
    { name: 'Bandra West', pin: '400050', lat: 19.0596, lng: 72.8295 }, { name: 'Lower Parel', pin: '400013', lat: 18.9977, lng: 72.8376 },
    { name: 'Goregaon East', pin: '400063', lat: 19.1663, lng: 72.8526 } ] },
  { name: 'Bengaluru', state: 'Karnataka', popular: true, image: U('1596176530529-78163a4f7af2', 800), priceFactor: 1.4, localities: [
    { name: 'Whitefield', pin: '560066', lat: 12.9698, lng: 77.75 }, { name: 'Koramangala', pin: '560034', lat: 12.9352, lng: 77.6245 },
    { name: 'HSR Layout', pin: '560102', lat: 12.9116, lng: 77.6474 }, { name: 'Indiranagar', pin: '560038', lat: 12.9719, lng: 77.6412 },
    { name: 'Electronic City', pin: '560100', lat: 12.8452, lng: 77.6602 } ] },
  { name: 'Pune', state: 'Maharashtra', popular: true, priceFactor: 1.1, localities: [
    { name: 'Hinjewadi', pin: '411057', lat: 18.5913, lng: 73.7389 }, { name: 'Kharadi', pin: '411014', lat: 18.5515, lng: 73.9348 },
    { name: 'Baner', pin: '411045', lat: 18.559, lng: 73.7868 }, { name: 'Koregaon Park', pin: '411001', lat: 18.5362, lng: 73.894 } ] },
  { name: 'Hyderabad', state: 'Telangana', popular: true, image: U('1572445271230-a78b5944a659', 800), priceFactor: 1.2, localities: [
    { name: 'Gachibowli', pin: '500032', lat: 17.4401, lng: 78.3489 }, { name: 'HITEC City', pin: '500081', lat: 17.4435, lng: 78.3772 },
    { name: 'Kondapur', pin: '500084', lat: 17.47, lng: 78.357 }, { name: 'Banjara Hills', pin: '500034', lat: 17.4126, lng: 78.4482 } ] },
  { name: 'Chennai', state: 'Tamil Nadu', popular: true, image: U('1582510003544-4d00b7f74220', 800), priceFactor: 1.1, localities: [
    { name: 'Sholinganallur', pin: '600119', lat: 12.901, lng: 80.2279 }, { name: 'Anna Nagar', pin: '600040', lat: 13.085, lng: 80.2101 },
    { name: 'Adyar', pin: '600020', lat: 13.0012, lng: 80.2565 }, { name: 'Velachery', pin: '600042', lat: 12.9815, lng: 80.218 } ] },
  { name: 'Delhi', state: 'Delhi', popular: true, image: U('1587474260584-136574528ed5', 800), priceFactor: 1.8, localities: [
    { name: 'Dwarka', pin: '110075', lat: 28.5921, lng: 77.046 }, { name: 'Vasant Kunj', pin: '110070', lat: 28.52, lng: 77.158 },
    { name: 'Saket', pin: '110017', lat: 28.5245, lng: 77.2066 }, { name: 'Connaught Place', pin: '110001', lat: 28.6315, lng: 77.2167 } ] },
  { name: 'Gurugram', state: 'Haryana', popular: true, priceFactor: 1.6, localities: [
    { name: 'Golf Course Road', pin: '122011', lat: 28.4421, lng: 77.1009 }, { name: 'Sohna Road', pin: '122018', lat: 28.4089, lng: 77.0418 },
    { name: 'Cyber City', pin: '122002', lat: 28.4949, lng: 77.0887 } ] },
  { name: 'Noida', state: 'Uttar Pradesh', popular: false, priceFactor: 0.9, localities: [
    { name: 'Sector 62', pin: '201309', lat: 28.627, lng: 77.365 }, { name: 'Sector 150', pin: '201310', lat: 28.438, lng: 77.484 } ] },
  { name: 'Kolkata', state: 'West Bengal', popular: true, image: U('1558431382-27e303142255', 800), priceFactor: 0.9, localities: [
    { name: 'Salt Lake', pin: '700091', lat: 22.5867, lng: 88.4171 }, { name: 'New Town', pin: '700156', lat: 22.5958, lng: 88.4795 },
    { name: 'Ballygunge', pin: '700019', lat: 22.5276, lng: 88.364 } ] },
  { name: 'Ahmedabad', state: 'Gujarat', popular: false, priceFactor: 0.8, localities: [
    { name: 'Bodakdev', pin: '380054', lat: 23.0396, lng: 72.5113 }, { name: 'Prahlad Nagar', pin: '380015', lat: 23.012, lng: 72.5108 } ] },
  { name: 'Jaipur', state: 'Rajasthan', popular: false, image: U('1477587458883-47145ed94245', 800), priceFactor: 0.7, localities: [
    { name: 'Malviya Nagar', pin: '302017', lat: 26.8549, lng: 75.8243 }, { name: 'Vaishali Nagar', pin: '302021', lat: 26.911, lng: 75.743 } ] },
];

export const IMAGES = {
  apartment: ['1545324418-cc1a3fa10c00', '1502672260266-1c1ef2d93688', '1522708323590-d24dbb6b0267', '1484154218962-a197022b5858', '1505691938895-1758d7feb511', '1560448204-e02f11c3d0e2', '1493809842364-78817add7ffb', '1600607687939-ce8a6c25118c', '1600210492486-724fe5c67fb0', '1617104678098-de229db51175'],
  house: ['1512917774080-9991f1c4c750', '1600596542815-ffad4c1539a9', '1600585154340-be6161a56a0c', '1570129477492-45c003edd2be', '1613490493576-7fde63acd811', '1564013799919-ab600027ffc6', '1580587771525-78b9dba3b914', '1582407947304-fd86f028f716', '1600566753190-17f0baa2a6c3', '1449844908441-8829872d2607'],
  office: ['1486406146926-c627a92ad1ab', '1497366216548-37526070297c', '1497366811353-6870744d04b2', '1524758631624-e2822e304c36', '1556761175-5973dc0f32e7', '1554995207-c18c203602cb'],
  retail: ['1441986300917-64674bd600d8', '1554995207-c18c203602cb'],
  warehouse: ['1586528116311-ad8dd3c8310d'],
  plot: ['1500382017468-9049fed747ef', '1416331108676-a22ccb276e35'],
};

export interface Template {
  type: string;
  category: PropertyCategory;
  tx: 'sale' | 'rent';
  img: keyof typeof IMAGES;
  bhk?: number[];
  area: [number, number];
  /** Base price per sq.ft (sale) or rent per sq.ft per month, before city factor. */
  rate: number;
  title: (bhk: number | undefined, locality: string) => string;
}

export const TEMPLATES: Template[] = [
  { type: 'apartment', category: 'residential', tx: 'sale', img: 'apartment', bhk: [1, 2, 3, 4], area: [550, 2200], rate: 9000, title: (b, l) => `${b} BHK Apartment in ${l}` },
  { type: 'apartment', category: 'residential', tx: 'rent', img: 'apartment', bhk: [1, 2, 3], area: [500, 1800], rate: 32, title: (b, l) => `${b} BHK Flat for Rent in ${l}` },
  { type: 'villa', category: 'residential', tx: 'sale', img: 'house', bhk: [3, 4, 5], area: [2400, 5200], rate: 11000, title: (b, l) => `${b} BHK Villa in ${l}` },
  { type: 'independent-house', category: 'residential', tx: 'sale', img: 'house', bhk: [2, 3, 4], area: [1400, 3600], rate: 8000, title: (b, l) => `${b} BHK Independent House, ${l}` },
  { type: 'builder-floor', category: 'residential', tx: 'rent', img: 'apartment', bhk: [2, 3], area: [900, 1800], rate: 30, title: (b, l) => `${b} BHK Builder Floor for Rent, ${l}` },
  { type: 'residential-plot', category: 'residential', tx: 'sale', img: 'plot', area: [1200, 4800], rate: 5500, title: (_b, l) => `Residential Plot in ${l}` },
  { type: 'office', category: 'commercial', tx: 'rent', img: 'office', area: [800, 12000], rate: 85, title: (_b, l) => `Furnished Office Space in ${l}` },
  { type: 'office', category: 'commercial', tx: 'sale', img: 'office', area: [600, 5000], rate: 14000, title: (_b, l) => `Commercial Office for Sale, ${l}` },
  { type: 'shop', category: 'commercial', tx: 'rent', img: 'retail', area: [200, 1500], rate: 140, title: (_b, l) => `High-street Shop for Rent, ${l}` },
  { type: 'showroom', category: 'commercial', tx: 'rent', img: 'retail', area: [1500, 6000], rate: 120, title: (_b, l) => `Showroom Space on Main Road, ${l}` },
  { type: 'warehouse', category: 'commercial', tx: 'rent', img: 'warehouse', area: [5000, 40000], rate: 22, title: (_b, l) => `Warehouse / Godown near ${l}` },
  { type: 'coworking', category: 'commercial', tx: 'rent', img: 'office', area: [400, 3000], rate: 110, title: (_b, l) => `Managed Co-working Space, ${l}` },
];

export const PROJECTS = ['Skyline Residency', 'Green Meadows', 'Palm Grove', 'Lakeview Towers', 'Sunrise Heights', 'Orchid Enclave', 'Silver Oak', 'Riverside Gardens', undefined, undefined];

export const FAQS = [
  { question: 'Is it free to search for properties on Sky Space Realty?', answer: 'Yes. Searching, shortlisting, sending enquiries and requesting site visits are free for home buyers and tenants.' },
  { question: 'How do I list my property?', answer: 'Create an owner account, choose “Post Property”, fill in the details and upload photos. Our moderation team reviews every listing before it goes live, usually within one business day.' },
  { question: 'What does the “Verified” badge mean?', answer: 'A listing is marked Verified only after our team has checked it against documents or a physical visit. Listings are not verified automatically when they are posted.' },
  { question: 'Are site visits confirmed instantly?', answer: 'No. A visit request is sent to the owner or agent, who confirms, proposes another time, or declines. You will see the status in My Site Visits and receive a notification.' },
  { question: 'How are prices shown?', answer: 'All prices are in Indian Rupees. Sale prices are shown in lakh (Lac) or crore (Cr); rents are monthly. Maintenance and security deposit are shown separately when the lister provides them.' },
  { question: 'Do you show RERA registration numbers?', answer: 'Where a lister provides a RERA registration number we display it. RERA applicability depends on the project, the state and the law; buyers should verify registration on the relevant state RERA portal.' },
  { question: 'Who can see my phone number when I send an enquiry?', answer: 'Only the property owner or the agent handling the listing, and our administrators. Your details are never shown publicly.' },
  { question: 'Can I rent commercial space through Sky Space Realty?', answer: 'Yes. Use the Commercial section to find offices, shops, showrooms, warehouses and co-working spaces for rent or sale.' },
];

export const TESTIMONIALS = [
  { name: 'Sample testimonial', city: 'Pune', quote: 'This is sample content shown until real customer testimonials are added from the admin panel.', isSample: true },
  { name: 'Sample testimonial', city: 'Bengaluru', quote: 'Replace these placeholders with genuine, consented customer feedback via Admin → Content.', isSample: true },
];

export const PAGES = {
  about: {
    title: 'About Sky Space Realty',
    body: 'Sky Space Realty is an Indian real estate platform for buying, selling and renting residential and commercial property.\n\nWe moderate every listing before it is published, show prices transparently in Indian Rupees, and connect buyers and tenants directly with owners and registered agents.\n\nOur team also manages properties on behalf of owners — from tenant search and site visits to lead follow-up.',
    seoTitle: 'About Us | Sky Space Realty',
    seoDescription: 'Sky Space Realty helps you buy, sell and rent residential and commercial property across India.',
  },
  privacy: {
    title: 'Privacy Policy',
    body: 'TEMPLATE — review with legal counsel before launch.\n\nWhat we collect: account details (name, email, mobile), listing information, enquiries, site visit requests and usage data.\n\nHow we use it: to operate the platform, connect you with owners and agents, send service notifications, and prevent fraud.\n\nSharing: enquiry and visit contact details are shared only with the owner or agent responsible for the listing and with our administrators.\n\nRetention: closed lead contact details are anonymised after 24 months.\n\nYour rights: you may access, correct or delete your data and withdraw consent by contacting us. We process personal data in line with the Digital Personal Data Protection Act, 2023.',
  },
  terms: {
    title: 'Terms and Conditions',
    body: 'TEMPLATE — review with legal counsel before launch.\n\nListings are provided by owners and agents. Sky Space Realty moderates listings but does not guarantee their accuracy unless a listing is marked Verified.\n\nUsers must not post misleading, duplicate or unlawful content. We may suspend listings or accounts that breach these terms.\n\nBuyers and tenants should independently verify title, approvals and RERA registration before transacting.',
  },
};
