import { BaggApiClient } from '@bagg/api-client';

const API_BASE_URL = '/api';

export const api = new BaggApiClient({
  baseUrl: API_BASE_URL,
});
