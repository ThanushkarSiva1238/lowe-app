import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function BackupPage() {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-sky-700">
          Backup
        </p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">
          Excel backup
        </h1>
        <p className="mt-1 text-xs text-slate-600">
          Download a full Excel backup of shipments, suppliers, consignees,
          payments, and settings for offline storage or sharing with your
          accountant.
        </p>
      </div>

      <Card
        title="Download full Excel backup"
        description="Generates one workbook with separate sheets for each table."
      >
        <form
          action="/api/backup"
          method="GET"
          className="flex flex-col items-start gap-3 pt-2"
        >
          <p className="text-xs text-slate-600">
            This may take a few seconds depending on how many records you have.
          </p>
          <Button type="submit">Download Excel backup</Button>
        </form>
      </Card>
    </div>
  );
}

