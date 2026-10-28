import { SiteConfig } from '../models/misc.models';

export const DEFAULT_SETTINGS = {
  enquiryDuplicateWindowHours: 24,
  autoPublishOnApprove: true,
  reraRequiredStates: [] as string[],
};

export async function getSiteConfig() {
  const cfg = await SiteConfig.findOne({ key: 'main' }).lean();
  return {
    banners: (cfg?.banners as unknown[]) ?? [],
    faqs: (cfg?.faqs as unknown[]) ?? [],
    testimonials: (cfg?.testimonials as unknown[]) ?? [],
    pages: (cfg?.pages as Record<string, unknown>) ?? {},
    seo: (cfg?.seo as Record<string, unknown>) ?? {},
    settings: { ...DEFAULT_SETTINGS, ...((cfg?.settings as Record<string, unknown>) ?? {}) } as typeof DEFAULT_SETTINGS & {
      supportEmail?: string;
      supportPhone?: string;
      officeAddress?: string;
    },
  };
}
