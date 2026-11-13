
import type { Metadata } from 'next';
import {
    absoluteUrl,
    contactEmail,
    siteDescription,
    siteName,
} from '@/lib/site';

type JsonLd = Record<string, unknown>;

function JsonLdScript({ data }: { data: JsonLd }) {
    // Prevent a data value from accidentally terminating the script element.
    const serialized = JSON.stringify(data).replace(/</g, '\\u003c');

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: serialized }}
        />
    );
}

export function MarketingStructuredData() {
    const organizationId = `${absoluteUrl('/')}#organization`;
    const websiteId = `${absoluteUrl('/')}#website`;
    const applicationId = `${absoluteUrl('/')}#software`;

    const structuredData: JsonLd = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'Organization',
                '@id': organizationId,
                name: siteName,
                url: absoluteUrl('/'),
                email: contactEmail,
            },
            {
                '@type': 'WebSite',
                '@id': websiteId,
                name: siteName,
                url: absoluteUrl('/'),
                description: siteDescription,
                publisher: {
                    '@id': organizationId,
                },
                inLanguage: 'en-NG',
            },
            {
                '@type': 'SoftwareApplication',
                '@id': applicationId,
                name: siteName,
                url: absoluteUrl('/'),
                description: siteDescription,
                applicationCategory: 'BusinessApplication',
                operatingSystem: 'Web',
                publisher: {
                    '@id': organizationId,
                },
            },
        ],
    };

    return <JsonLdScript data={structuredData} />;
}

export type BreadcrumbItem = {
    name: string;
    path: string;
};

export function MarketingBreadcrumbStructuredData({
                                                      items,
                                                  }: {
    items: BreadcrumbItem[];
}) {
    if (items.length < 2) {
        return null;
    }

    const structuredData: JsonLd = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.name,
            item: absoluteUrl(item.path),
        })),
    };

    return <JsonLdScript data={structuredData} />;
}
