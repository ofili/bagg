import type { Metadata } from "next";
import {ReactNode} from "react";

export const metadata: Metadata = {
    title: "Client Invoice | Bagg",
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

export default function PublicInvoiceLayout({
    children,
                                            }: {
    children: ReactNode;
}) {
    return children;
}