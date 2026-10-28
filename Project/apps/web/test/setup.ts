import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

vi.mock('next/navigation', () => {
  const push = vi.fn();
  return {
    useRouter: () => ({ push, replace: push, refresh: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
    usePathname: () => '/search',
    useSearchParams: () => new URLSearchParams(globalThis.__searchParams ?? ''),
    __push: push,
  };
});

declare global {
  var __searchParams: string | undefined;
}
