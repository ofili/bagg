import { AudiencePage } from '@/components/marketing/audience-page';
import { MarketingBreadcrumbStructuredData } from '@/components/marketing/marketing-structured-data';
import { marketingMetadata } from '@/lib/metadata';
import { Metadata } from 'next';

export const metadata: Metadata = marketingMetadata({
    title: 'Invoicing Software for Creative Studios',
    description:
        'Manage client quotations, professional invoices and payments follow-ups for your creative studio with Bagg.',
    path: '/studios',
});

export default function StudiosPage() {
    return (
        <>
            <MarketingBreadcrumbStructuredData items={[
                { name: 'Home', path: '/' },
                { name: 'Creative Studios', path: '/studios' },
            ]} />

            <AudiencePage audience="studios" />
        </>
    );
}
