import { Download } from "lucide-react";
import { buttonStyles } from "@/components/ui";
import { cn } from "@/lib/cn";

interface DownloadPdfButtonProps {
  href: string;
  /** What is being downloaded, for screen readers: "invoice", "quote" or "receipt". */
  documentLabel: string;
  className?: string;
}

/**
 * The primary way for a client to keep a copy of a document. It sits at the top of
 * the page, so it should be one of the first things they see, not a footer link.
 */
export function DownloadPdfButton({ href, documentLabel, className }: DownloadPdfButtonProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Download ${documentLabel} as PDF`}
      className={cn(buttonStyles({ variant: "primary", zone: "calm" }), "gap-2 print:hidden", className)}
    >
      <Download aria-hidden className="h-4 w-4" />
      <span>Download PDF</span>
    </a>
  );
}
