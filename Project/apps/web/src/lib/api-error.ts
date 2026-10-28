export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: { path: string; message: string }[],
  ) {
    super(message);
  }
  fieldErrors(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const d of this.details ?? []) if (!out[d.path]) out[d.path] = d.message;
    return out;
  }
}

export async function toApiError(res: Response): Promise<ApiError> {
  try {
    const body = await res.json();
    return new ApiError(res.status, body?.error?.code ?? 'ERROR', body?.error?.message ?? res.statusText, body?.error?.details);
  } catch {
    return new ApiError(res.status, 'ERROR', res.status >= 500 ? 'Server error. Please try again.' : res.statusText);
  }
}
