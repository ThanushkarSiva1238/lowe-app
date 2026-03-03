import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { settingsSchema } from "@/lib/validation";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

async function loadSettings() {
  const supabase = createServerSupabaseClient();

  const { data } = await supabase
    .from("settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  return {
    gbp_rate: Number(data?.gbp_rate ?? 400),
    usd_rate: Number(data?.usd_rate ?? 300),
  };
}

async function saveSettings(formData: FormData) {
  "use server";

  const supabase = createServerSupabaseClient();

  const raw = {
    gbp_rate: formData.get("gbp_rate"),
    usd_rate: formData.get("usd_rate"),
  };

  const parsed = settingsSchema.safeParse(raw);

  if (!parsed.success) {
    redirect("/settings");
  }

  const payload = parsed.data;

  await supabase
    .from("settings")
    .upsert(
      {
        id: 1,
        gbp_rate: payload.gbp_rate,
        usd_rate: payload.usd_rate,
      },
      { onConflict: "id" },
    );

  redirect("/settings");
}

export default async function SettingsPage() {
  const settings = await loadSettings();

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-sky-700">
          Settings
        </p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">
          Settings
        </h1>
        <p className="mt-1 text-xs text-slate-600">
          Maintain your default exchange rates. These values are used when
          converting shipment invoice values to LKR.
        </p>
      </div>

      <form action={saveSettings} className="space-y-4">
        <Card
          title="Exchange rates"
          description="Base GBP and USD rates in LKR."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              name="gbp_rate"
              label="GBP rate (LKR)"
              type="number"
              step="0.01"
              defaultValue={settings.gbp_rate}
              required
            />
            <Input
              name="usd_rate"
              label="USD rate (LKR)"
              type="number"
              step="0.01"
              defaultValue={settings.usd_rate}
              required
            />
          </div>
        </Card>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="submit">Save settings</Button>
        </div>
      </form>
    </div>
  );
}

