'use client';

import { NewQuoteFlow } from "@/components/quotes/NewQuoteFlow";
import { NewQuoteDesktop } from "@/components/quotes/NewQuoteDesktop";

export default function NewQuotePage() {
    return (
        <>
            {/* Mobile: four-step quote creation flow */}
            <div className="sm:hidden">
                <NewQuoteFlow />
            </div>

            {/* Tablet and desktop */}
            <div className="hidden sm:block">
                <NewQuoteDesktop />
            </div>
        </>
    );
}