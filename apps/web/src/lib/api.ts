import { BaggApiClient } from '@bagg/api-client';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const api = new BaggApiClient({
  baseUrl: API_BASE_URL,
});
