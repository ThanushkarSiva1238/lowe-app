"use client"

import { Button } from "@/components/ui/Button";

export function PrintButton() {
  return (
    <Button
      type="button"
      size="sm"
      variant="secondary"
      onClick={() => window.print()}
      className="mb-4 print:hidden"
    >
      Print
    </Button>
  );
}

