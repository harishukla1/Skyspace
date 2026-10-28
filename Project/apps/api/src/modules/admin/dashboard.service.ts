import { PLATFORM_TIMEZONE } from '@skyspace/shared';
import { Enquiry, SiteVisit } from '../../models/misc.models';
import { Property } from '../../models/property.model';
import { User } from '../../models/user.model';

type Unit = 'day' | 'week' | 'month';

/**
 * All dashboard figures are computed from live collections. Aggregation logic is documented in docs/database-schema.md#dashboard-metrics.
 * Conversion rate = converted leads / leads created in range; reported only when there are at least 10 leads in range.
 */
export async function dashboard(from: Date, to: Date) {
  const range = { $gte: from, $lte: to };
  const span = (to.getTime() - from.getTime()) / 86_400_000;
  const unit: Unit = span <= 45 ? 'day' : span <= 200 ? 'week' : 'month';
  const bucket = (field: string) => ({ $dateTrunc: { date: `$${field}`, unit, timezone: PLATFORM_TIMEZONE } });
  const series = (rows: { _id: Date; count: number }[]) => rows.map((r) => ({ date: r._id.toISOString(), count: r.count }));

  const [
    totalUsers, totalAgents, totalProperties, published, pending, sold, rented, newEnquiries, openLeads, upcomingVisits,
    listingsOverTime, enquiriesOverTime, byCity, byTransaction, byCategory, byType, leadStatus, visitStatus, leadsInRange, convertedInRange,
  ] = await Promise.all([
    User.countDocuments({ status: { $ne: 'deactivated' } }),
    User.countDocuments({ roles: 'agent', status: 'active' }),
    Property.countDocuments({ status: { $ne: 'archived' } }),
    Property.countDocuments({ status: 'published' }),
    Property.countDocuments({ status: 'pending_approval' }),
    Property.countDocuments({ status: 'sold' }),
    Property.countDocuments({ status: 'rented' }),
    Enquiry.countDocuments({ status: 'new' }),
    Enquiry.countDocuments({ status: { $nin: ['converted', 'closed', 'invalid'] } }),
    SiteVisit.countDocuments({ status: { $in: ['confirmed', 'pending_confirmation', 'rescheduled'] }, scheduledAt: { $gte: new Date() } }),
    Property.aggregate([{ $match: { createdAt: range } }, { $group: { _id: bucket('createdAt'), count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
    Enquiry.aggregate([{ $match: { createdAt: range } }, { $group: { _id: bucket('createdAt'), count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
    Property.aggregate([{ $match: { status: 'published' } }, { $group: { _id: '$city', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 10 }]),
    Property.aggregate([{ $match: { status: 'published' } }, { $group: { _id: '$transactionType', count: { $sum: 1 } } }]),
    Property.aggregate([{ $match: { status: 'published' } }, { $group: { _id: '$propertyCategory', count: { $sum: 1 } } }]),
    Property.aggregate([{ $match: { status: 'published' } }, { $group: { _id: '$propertyType', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    Enquiry.aggregate([{ $match: { createdAt: range } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    SiteVisit.aggregate([{ $match: { createdAt: range } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Enquiry.countDocuments({ createdAt: range }),
    Enquiry.countDocuments({ createdAt: range, status: 'converted' }),
  ]);

  const kv = (rows: { _id: string | null; count: number }[]) => rows.map((r) => ({ key: r._id ?? 'unknown', count: r.count }));
  return {
    range: { from: from.toISOString(), to: to.toISOString(), granularity: unit },
    kpis: { totalUsers, totalAgents, totalProperties, published, pending, sold, rented, newEnquiries, openLeads, upcomingVisits },
    charts: {
      listingsOverTime: series(listingsOverTime),
      enquiriesOverTime: series(enquiriesOverTime),
      byCity: kv(byCity),
      byTransactionType: kv(byTransaction),
      byCategory: kv(byCategory),
      byPropertyType: kv(byType),
      leadStatus: kv(leadStatus),
      visitStatus: kv(visitStatus),
    },
    conversion: {
      leads: leadsInRange,
      converted: convertedInRange,
      rate: leadsInRange >= 10 ? Math.round((convertedInRange / leadsInRange) * 1000) / 10 : null,
    },
  };
}
