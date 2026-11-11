import { Suspense } from 'react';
import NewRecurringInvoiceClient from './NewRecurringInvoiceClient';

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NewRecurringInvoiceClient />
      </Suspense>
  );
}