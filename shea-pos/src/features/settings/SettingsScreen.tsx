import { useEffect, useState } from "react";
import { Check, Printer, SlidersHorizontal } from "lucide-react";
import { localizeError, useI18n } from "../../i18n";
import { LoadingState } from "../../components/AsyncState";
import { PageHeader } from "../../components/PageHeader";

export function SettingsScreen({
  values,
  onChange,
  onNotice,
}: {
  values: Record<string, string>;
  onChange: (value: Record<string, string>) => void;
  onNotice: (message: string) => void;
}) {
  const { t, language } = useI18n();
  const [printers, setPrinters] = useState<any[]>([]);
  const [logo, setLogo] = useState(values.storeLogo || "");
  const [draft, setDraft] = useState(values);
  const [loadingPrinters, setLoadingPrinters] = useState(true);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setDraft(values);
    setLogo(values.storeLogo || "");
  }, [values]);
  useEffect(() => {
    void window.pos
      .listPrinters()
      .then(setPrinters as any)
      .catch((value) => onNotice(localizeError(language, value)))
      .finally(() => setLoadingPrinters(false));
  }, []);
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    try {
      const result = await window.pos.updateSettings({
        storeName: String(form.get("storeName")),
        receiptFooter: String(form.get("receiptFooter")),
        printerName: String(form.get("printerName")),
        theme: String(form.get("theme")),
        language: String(form.get("language")),
        primaryColor: String(form.get("primaryColor")),
        storeLogo: logo,
      });
      setDraft(result);
      onChange(result);
      onNotice(t("settingsSaved"));
    } catch (value) {
      onNotice(localizeError(language, value));
    } finally {
      setSaving(false);
    }
  }
  function chooseLogo(file?: File) {
    if (!file) return;
    if (file.size > 2_000_000) return onNotice(t("logoTooLarge"));
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result);
      setLogo(value);
      const next = { ...draft, storeLogo: value };
      setDraft(next);
      onChange(next);
    };
    reader.readAsDataURL(file);
  }
  function preview(key: "theme" | "language" | "primaryColor", value: string) {
    const next = { ...draft, [key]: value };
    setDraft(next);
    onChange(next);
  }
  return (
    <form className="page-stack settings-form" onSubmit={save}>
      <PageHeader
        eyebrow={t("workspace")}
        title={t("appearancePrinting")}
        description={t("appearanceHelp")}
        actions={
          <button className="button primary" disabled={saving}>
            <Check />
            {saving ? t("saving") : t("saveChanges")}
          </button>
        }
      />
      <div className="panel settings-surface">
        <div className="settings-grid">
          <section>
            <h3>{t("workspace")}</h3>
            <label>
              {t("storeName")}
              <input name="storeName" defaultValue={values.storeName} />
            </label>
            <div className="two-fields">
              <label>
                {t("appearance")}
                <select
                  name="theme"
                  value={draft.theme || "system"}
                  onChange={(event) => preview("theme", event.target.value)}
                >
                  <option value="system">{t("system")}</option>
                  <option value="light">{t("light")}</option>
                  <option value="dark">{t("dark")}</option>
                </select>
              </label>
              <label>
                {t("language")}
                <select
                  name="language"
                  value={draft.language || "en"}
                  onChange={(event) => preview("language", event.target.value)}
                >
                  <option value="en">{t("english")}</option>
                  <option value="ar">{t("arabic")}</option>
                </select>
              </label>
            </div>
            <label>
              {t("brandColor")}
              <input
                className="color-input"
                name="primaryColor"
                type="color"
                value={draft.primaryColor || "#2f6fed"}
                onChange={(event) =>
                  preview("primaryColor", event.target.value)
                }
              />
            </label>
            <label>
              {t("storeLogo")}
              <div className="logo-picker">
                {logo ? <img src={logo} alt="" /> : <span>S</span>}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={(event) => chooseLogo(event.target.files?.[0])}
                />
                {logo && (
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() => {
                      setLogo("");
                      const next = { ...draft, storeLogo: "" };
                      setDraft(next);
                      onChange(next);
                    }}
                  >
                    {t("removeLogo")}
                  </button>
                )}
              </div>
            </label>
            <label>
              {t("receiptFooter")}
              <textarea
                name="receiptFooter"
                defaultValue={values.receiptFooter}
              />
            </label>
          </section>
          <section>
            <h3>{t("receiptPrinter")}</h3>
            <label>
              {t("receiptPrinter")}
              <select
                name="printerName"
                defaultValue={values.printerName}
                disabled={loadingPrinters}
              >
                <option value="">{t("defaultPrinter")}</option>
                {printers.map((printer) => (
                  <option key={printer.name} value={printer.name}>
                    {printer.displayName || printer.name}
                    {printer.isDefault ? ` (${t("defaultSuffix")})` : ""}
                  </option>
                ))}
              </select>
            </label>
            {loadingPrinters && <LoadingState label={t("loading")} compact />}
            <button
              type="button"
              className="button secondary"
              disabled={loadingPrinters}
              onClick={() =>
                window.pos
                  .testPrinter({
                    printerName:
                      (
                        document.querySelector(
                          "[name=printerName]",
                        ) as HTMLSelectElement
                      )?.value || undefined,
                  })
                  .then(() => onNotice(t("testReceiptSent")))
                  .catch((error) => onNotice(localizeError(language, error)))
              }
            >
              <Printer /> {t("printTest")}
            </button>
            <div className="info">
              <SlidersHorizontal />
              <p>
                <strong>{t("nativePrinter")}</strong>
                <br />
                {t("nativePrinterHelp")}
              </p>
            </div>
          </section>
        </div>
      </div>
    </form>
  );
}
