import { AudiencePage } from '@/components/marketing/audience-page';
import { marketingMetadata } from '@/lib/metadata';
import {Metadata} from "next";

export const metadata: Metadata = marketingMetadata({
    title: 'for consultants',
    description:
        'Present fees, issue invoices and track client payments with a clearer commercial record for your consultancy.',
    path: '/consultants',
});

export default function ConsultantsPage() {
    return <AudiencePage audience="consultants" />;
}