
import { AudiencePage } from '@/components/marketing/audience-page';
import { marketingMetadata } from '@/lib/metadata';
import {Metadata} from "next";

export const metadata: Metadata = marketingMetadata({
    title: 'for freelancers',
    description:
        'Create professional invoices, share payment links, track balances and keep receipts organised with Bagg.',
    path: '/freelancers',
});

export default function FreelancersPage() {
    return <AudiencePage audience="freelancers" />;
}
