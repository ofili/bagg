import { AudiencePage } from '@/components/marketing/audience-page';
import { marketingMetadata } from '@/lib/metadata';
import {Metadata} from "next";

export const metadata: Metadata = marketingMetadata({
    title: 'for creative studios',
    description:
        'Help your creative studio quote, invoice, follow up and keep client payment records together with Bagg.',
    path: '/studios',
});

export default function StudiosPage() {
    return <AudiencePage audience="studios" />;
}
