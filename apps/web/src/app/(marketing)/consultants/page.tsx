import { AudiencePage } from '@/components/marketing/audience-page';
import { MarketingBreadcrumbStructuredData } from '@/components/marketing/marketing-structured-data';
import { marketingMetadata } from '@/lib/metadata';
import { Metadata } from 'next';

export const metadata: Metadata = marketingMetadata({
    title: 'Invoicing Software for Consultants',
    description:
        'Manage consulting fees, prepare professional quotations, invoice clients and track payments in one workspace with Bagg.',
    path: '/consultants',
});

export default function ConsultantsPage() {
    return (
        <>
            <MarketingBreadcrumbStructuredData items={[
                { name: 'Home', path: '/' },
                { name: 'Consultants', path: '/consultants' },
            ]} />

            <AudiencePage audience="consultants" />
        </>
    );
}