import type { Metadata } from "next";
import {ReactNode} from "react";

export const metadata: Metadata = {
    title: "Client Receipt | Bagg",
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

export default function PublicReceiptLayout({
                                                children,
                                            }: {
    children: ReactNode;
}) {
    return children;
}