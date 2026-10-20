'use client';

import { Users, Plus, Mail, Phone, Globe } from 'lucide-react';
import { formatMoney } from '@/lib/money';

export default function ClientsPage() {
  const clients = [
    {
      id: 'cl_1',
      name: 'Lagos Tech Ventures',
      email: 'billing@lagostech.ng',
      phone: '+234 803 123 4567',
      currency: 'NGN' as const,
      total_invoiced_minor: 45000000,
      total_outstanding_minor: 25000000,
    },
    {
      id: 'cl_2',
      name: 'Acme Global Inc.',
      email: 'finance@acmeglobal.com',
      phone: '+1 415 555 2671',
      currency: 'USD' as const,
      total_invoiced_minor: 1250000,
      total_outstanding_minor: 0,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Clients</h1>
          <p className="text-sm text-neutral-500">Manage client directory and default payment terms.</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-lg transition">
          <Plus className="w-4 h-4" /> Add Client
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {clients.map((client) => (
          <div key={client.id} className="p-5 bg-white rounded-xl border shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-neutral-900">{client.name}</h3>
              <span className="text-xs font-semibold px-2 py-0.5 bg-neutral-100 rounded text-neutral-600">
                {client.currency}
              </span>
            </div>

            <div className="space-y-1.5 text-xs text-neutral-600">
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-neutral-400" /> {client.email}
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-neutral-400" /> {client.phone}
              </div>
            </div>

            <div className="pt-3 border-t flex justify-between text-xs">
              <div>
                <span className="text-neutral-400 block">Total Invoiced</span>
                <span className="font-semibold text-neutral-800">
                  {formatMoney(client.total_invoiced_minor, client.currency)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-neutral-400 block">Outstanding</span>
                <span className="font-semibold text-neutral-900">
                  {formatMoney(client.total_outstanding_minor, client.currency)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
