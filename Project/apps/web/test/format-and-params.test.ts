import { describe, expect, it } from 'vitest';
import { parseSearch, toQueryString } from '@/lib/search-params';

describe('search params', () => {
  it('drops invalid values instead of failing the page', () => {
    const s = parseSearch({ city: 'Pune', transactionType: 'lease', limit: '9999', bedrooms: ['2', '3'] });
    expect(s.city).toBe('Pune');
    expect(s.transactionType).toBeUndefined();
    expect(s.limit).toBe(12);
    expect(s.bedrooms).toEqual([2, 3]);
  });
  it('omits defaults when serialising', () => {
    expect(toQueryString({ city: 'Pune', page: 1, sort: 'relevance', type: ['villa', 'apartment'], q: '' })).toBe('city=Pune&type=villa%2Capartment');
  });
});
