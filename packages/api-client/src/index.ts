export * from './types';

export class BaggApiClient {
  private baseUrl: string;

  constructor(options?: { baseUrl?: string }) {
    this.baseUrl = options?.baseUrl || 'http://localhost:8000';
  }

  async getHealth(): Promise<{ status: string; environment: string; version: string }> {
    const res = await fetch(`${this.baseUrl}/health`);
    if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`);
    return res.json();
  }

  async getCurrencies(): Promise<any> {
    const res = await fetch(`${this.baseUrl}/currencies`);
    if (!res.ok) throw new Error(`Failed to fetch currencies: ${res.statusText}`);
    return res.json();
  }
}
