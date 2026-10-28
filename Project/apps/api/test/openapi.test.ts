import { describe, expect, it } from 'vitest';
import { buildOpenApi } from '../src/docs/openapi';

describe('openapi', () => {
  it('builds a valid document covering the core endpoints', () => {
    const doc = buildOpenApi();
    expect(doc.openapi).toBe('3.0.3');
    for (const p of ['/auth/login', '/properties', '/properties/{slug}', '/enquiries', '/site-visits', '/admin/dashboard', '/admin/properties/{id}/approve']) {
      expect(doc.paths[p], p).toBeDefined();
    }
  });
});
