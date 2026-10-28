import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const apiMock = vi.fn();
vi.mock('@/lib/api', () => ({ api: (...a: unknown[]) => apiMock(...a) }));
vi.mock('@/features/auth/AuthProvider', () => ({ useAuth: () => ({ user: null }) }));

describe('EnquiryForm', () => {
  it('validates on the client before calling the API', async () => {
    const { EnquiryForm } = await import('@/components/property/EnquiryForm');
    render(<EnquiryForm propertyId="6ae1b5a2c9db798bc20b95b1" />);
    await userEvent.click(screen.getByRole('button', { name: 'Send enquiry' }));
    expect(apiMock).not.toHaveBeenCalled();
    expect(screen.getByText('Enter a valid 10-digit Indian mobile number')).toBeInTheDocument();
  });
  it('submits valid input and shows confirmation', async () => {
    apiMock.mockResolvedValueOnce({ id: 'x', status: 'new' });
    const { EnquiryForm } = await import('@/components/property/EnquiryForm');
    render(<EnquiryForm propertyId="6ae1b5a2c9db798bc20b95b1" />);
    await userEvent.type(screen.getByLabelText(/Your name/), 'Asha Rao');
    await userEvent.type(screen.getByLabelText(/Mobile number/), '9876543210');
    await userEvent.type(screen.getByLabelText(/Email/), 'asha@test.in');
    await userEvent.type(screen.getByLabelText(/Message/), 'Is it available?');
    await userEvent.click(screen.getByLabelText(/I agree to be contacted/));
    await userEvent.click(screen.getByRole('button', { name: 'Send enquiry' }));
    expect(apiMock).toHaveBeenCalledWith('/enquiries', expect.objectContaining({ body: expect.objectContaining({ phone: '9876543210', consent: true }) }));
    expect(await screen.findByText(/Enquiry received/)).toBeInTheDocument();
  });
});
