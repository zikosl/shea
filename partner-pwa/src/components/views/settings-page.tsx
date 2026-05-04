"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { CheckCircle2, ChevronRight, Loader2, MapPin, Store, UploadCloud } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Field } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { resolveAssetUrl } from "@/lib/utils";
import { usePartnerStore } from "@/store/partner-store";

function StatCard({
  title,
  value,
  icon,
  hint,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="ds-surface rounded-[20px] p-4">
      <div className="flex items-start gap-3.5">
        <div className="ds-subtle-surface mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl text-[hsl(var(--foreground))]">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))]">
            {title}
          </p>
          <p className="mt-1 text-sm font-medium text-[hsl(var(--foreground))]">{value}</p>
          {hint ? <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{hint}</p> : null}
        </div>
      </div>
    </div>
  );
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="ds-surface rounded-[20px] p-5 md:p-6">
      <div className="mb-4">
        <h2 className="text-sm font-semibold tracking-[-0.01em] text-[hsl(var(--foreground))]">{title}</h2>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className="ds-input h-11 rounded-2xl px-4 text-sm"
    />
  );
}

export function SettingsPage() {
  const { profile, saveProfile, signOut } = usePartnerStore();

  const [draft, setDraft] = useState({
    companyName: profile?.companyName || "",
    address: profile?.address || "",
    latitude: profile?.latitude?.toString() || "",
    longitude: profile?.longitude?.toString() || "",
    online: !!profile?.online,
  });
  const [avatarPreview, setAvatarPreview] = useState<string>(
    profile?.avatar ? resolveAssetUrl(profile.avatar) : "",
  );
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft({
      companyName: profile?.companyName || "",
      address: profile?.address || "",
      latitude: profile?.latitude?.toString() || "",
      longitude: profile?.longitude?.toString() || "",
      online: !!profile?.online,
    });
    setAvatarPreview(profile?.avatar ? resolveAssetUrl(profile.avatar) : "");
  }, [profile]);

  const completion = useMemo(() => {
    const checks = [draft.companyName, draft.address, draft.latitude, draft.longitude].filter(Boolean).length;
    return Math.round((checks / 4) * 100);
  }, [draft.companyName, draft.address, draft.latitude, draft.longitude]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);

    try {
      await saveProfile({
        companyName: draft.companyName,
        address: draft.address,
        latitude: draft.latitude ? Number(draft.latitude) : null,
        longitude: draft.longitude ? Number(draft.longitude) : null,
        online: draft.online,
        avatarFile,
        avatar: profile?.avatar || null,
      });

      toast.success("Profile updated.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="grid min-h-0 gap-4 xl:grid-cols-[minmax(300px,0.82fr)_minmax(0,1.18fr)]">
      <aside className="workspace-scroll space-y-4 pr-1">
        <PageHeader title="Settings" back />

        <div className="ds-surface rounded-[20px] p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">
                Store
              </p>
              <p className="mt-2 text-lg font-semibold tracking-[-0.02em] text-[hsl(var(--foreground))]">
                {draft.companyName || "Your store"}
              </p>
              <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                {profile?.email || "No email available"}
              </p>
            </div>
            <Badge tone={draft.online ? "success" : "default"}>{draft.online ? "Online" : "Offline"}</Badge>
          </div>

          <div className="ds-subtle-surface mt-5 flex items-center justify-between rounded-2xl px-3 py-2.5">
            <span className="text-sm text-[hsl(var(--muted-foreground))]">Profile completion</span>
            <span className="text-sm font-medium text-[hsl(var(--foreground))]">{completion}%</span>
          </div>
        </div>

        <div className="ds-surface rounded-[20px] p-5">
          <div className="flex flex-col gap-4">
            <div className="ds-subtle-surface relative flex h-36 items-center justify-center overflow-hidden rounded-[18px]">
              {avatarPreview ? (
                <Image
                  unoptimized
                  src={avatarPreview}
                  alt="Store logo"
                  width={260}
                  height={260}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[hsla(var(--primary),0.12)] text-[hsl(var(--primary-strong))]">
                    <UploadCloud className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Upload your store logo</p>
                    <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                      PNG, JPG, or WebP recommended.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <label className="ds-secondary-button inline-flex cursor-pointer items-center justify-center rounded-full px-4 py-2.5 text-sm font-medium">
              {avatarPreview ? "Change logo" : "Upload logo"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  setAvatarFile(file);
                  setAvatarPreview(URL.createObjectURL(file));
                }}
              />
            </label>
          </div>
        </div>

        <div className="space-y-3">
          <StatCard
            title="Store profile"
            value={draft.companyName || "Not set yet"}
            hint="Displayed across your storefront."
            icon={<Store className="h-4.5 w-4.5" />}
          />
          <StatCard
            title="Coordinates"
            value={`Lat ${draft.latitude || "—"} / Lng ${draft.longitude || "—"}`}
            hint="Used for delivery and map accuracy."
            icon={<MapPin className="h-4.5 w-4.5" />}
          />
          <StatCard
            title="Brand assets"
            value={avatarPreview ? "Logo uploaded" : "No logo uploaded"}
            hint="Keeps your identity consistent."
            icon={<UploadCloud className="h-4.5 w-4.5" />}
          />
        </div>
      </aside>

      <form onSubmit={handleSubmit} className="workspace-scroll space-y-4 pr-1">
        <div className="ds-surface rounded-[20px] p-5 md:p-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
                Store profile
              </p>
              <h2 className="mt-2 text-lg font-semibold tracking-[-0.02em] text-[hsl(var(--foreground))]">
                Organize your public store details
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                Keep identity, location, and availability aligned so the storefront stays clear and accurate.
              </p>
            </div>
            <Badge tone="accent" className="self-start">
              {completion}% complete
            </Badge>
          </div>
        </div>

        <SectionCard
          title="Store identity"
          description="Update the name and address customers see when they visit your store."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Company name">
              <TextInput
                value={draft.companyName}
                placeholder="Enter your company name"
                onChange={(value) => setDraft((current) => ({ ...current, companyName: value }))}
              />
            </Field>
            <Field label="Store address">
              <TextInput
                value={draft.address}
                placeholder="Enter your store address"
                onChange={(value) => setDraft((current) => ({ ...current, address: value }))}
              />
            </Field>
          </div>
        </SectionCard>

        <SectionCard
          title="Location settings"
          description="Provide accurate coordinates to improve delivery coverage, customer trust, and map placement."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Latitude">
              <TextInput
                value={draft.latitude}
                type="number"
                placeholder="e.g. 36.7538"
                onChange={(value) => setDraft((current) => ({ ...current, latitude: value }))}
              />
            </Field>
            <Field label="Longitude">
              <TextInput
                value={draft.longitude}
                type="number"
                placeholder="e.g. 3.0588"
                onChange={(value) => setDraft((current) => ({ ...current, longitude: value }))}
              />
            </Field>
          </div>
        </SectionCard>

        <SectionCard
          title="Availability"
          description="Control whether your store is visible and ready to receive new orders."
        >
          <label className="ds-subtle-surface flex items-center justify-between gap-4 rounded-[18px] px-4 py-4">
            <div>
              <p className="text-sm font-semibold">Store status</p>
              <p className="mt-1 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                {draft.online
                  ? "Customers can browse and place orders right now."
                  : "Customers cannot place orders until the store is turned back online."}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Badge tone={draft.online ? "success" : "default"}>{draft.online ? "Online" : "Offline"}</Badge>
              <button
                type="button"
                aria-pressed={draft.online}
                onClick={() => setDraft((current) => ({ ...current, online: !current.online }))}
                className={`relative h-7 w-12 rounded-full border border-[hsla(var(--border),0.92)] transition-colors duration-200 ${
                  draft.online ? "bg-[hsl(var(--primary-strong))]" : "bg-[hsl(var(--pill))]"
                }`}
              >
                <span
                  className={`absolute top-1 h-5 w-5 rounded-full bg-[hsl(var(--card))] shadow-sm transition-transform duration-200 ${
                    draft.online ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </label>
        </SectionCard>

        <div className="ds-surface rounded-[20px] px-4 py-4 md:px-5 md:py-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold">Save changes</p>
              <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                Review your updates, then save them to refresh your store profile.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={signOut}
                className="ds-secondary-button inline-flex items-center rounded-full px-5 py-3 font-semibold"
              >
                Sign out
              </button>
              <button
                type="submit"
                disabled={saving}
                className="ds-primary-button inline-flex items-center gap-2 rounded-full px-5 py-3 font-semibold disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {saving ? "Saving..." : "Save changes"}
                {!saving ? <ChevronRight className="h-4 w-4" /> : null}
              </button>
            </div>
          </div>
        </div>
      </form>
    </section>
  );
}
