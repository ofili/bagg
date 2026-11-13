import type { Metadata } from "next";
import {ReactNode} from "react";

export const metadata: Metadata = {
    title: "Client Quote | Bagg",
    robots: {
        index: false,
        follow: false,
        googleBot: {
            index: false,
            follow: false,
            noimageindex: true,
        },
    },
};

export default function PublicQuoteLayout({
                                                children,
                                            }: {
    children: ReactNode;
}) {
    return children;
}