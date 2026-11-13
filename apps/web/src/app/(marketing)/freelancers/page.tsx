
import { AudiencePage } from '@/components/marketing/audience-page';
import { MarketingBreadcrumbStructuredData } from '@/components/marketing/marketing-structured-data';
import { marketingMetadata } from '@/lib/metadata';
import { Metadata } from 'next';

export const metadata: Metadata = marketingMetadata({
    title: 'Invoicing Software for Freelancers',
    description:
        'Create professional invoices, share payment links, track balances and keep receipts organised with Bagg.',
    path: '/freelancers',
});

export default function FreelancersPage() {
    return (
        <>
            <MarketingBreadcrumbStructuredData items={[
                { name: 'Home', path: '/' },
                { name: 'Freelancers', path: '/freelancers' },
            ]} />

            <AudiencePage audience="freelancers" />
        </>
    );
}
