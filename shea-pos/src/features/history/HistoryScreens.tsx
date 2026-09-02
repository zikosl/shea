import { useEffect, useState } from "react";
import { FileClock, Printer, ReceiptText } from "lucide-react";
import { EmptyState } from "../../components/EmptyState";
import { ErrorState, LoadingState } from "../../components/AsyncState";
import { PageHeader } from "../../components/PageHeader";
import { money } from "../../shared/format";
import { localeFor, localizeError, localizeValue, useI18n } from "../../i18n";

export function OrdersScreen() {
  const { t, language } = useI18n();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = async () => {
    setLoading(true);
    setError("");
    try {
      setRows((await window.pos.listOrders()) as any[]);
    } catch (value) {
      setError(localizeError(language, value));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, []);
  return (
    <div className="page-stack">
      <PageHeader
        eyebrow={t("orders")}
        title={t("onlineInbox")}
        description={t("onlineInboxText")}
      />
      <div className="panel data-panel">
        {loading ? (
          <LoadingState label={t("loadingData")} />
        ) : error ? (
          <ErrorState
            title={t("unableToLoad")}
            text={error || t("tryAgainText")}
            retryLabel={t("retry")}
            onRetry={() => void load()}
          />
        ) : rows.length ? (
          <div className="table">
            <div className="table-row table-head">
              <span>#</span>
              <span>{t("customer")}</span>
              <span>{t("status")}</span>
              <span>{t("total")}</span>
            </div>
            {rows.map((row) => (
              <div className="table-row" key={row.server_id}>
                <span>
                  <strong>#{row.server_id}</strong>
                </span>
                <span>{row.customer_name || t("customer")}</span>
                <span>
                  <em className="badge">
                    {localizeValue(language, row.status)}
                  </em>
                </span>
                <span>{money(row.total)}</span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={FileClock}
            title={t("noOrders")}
            text={t("noOrdersText")}
          />
        )}
      </div>
    </div>
  );
}

export function SalesScreen({
  onNotice,
  settings,
}: {
  onNotice: (message: string) => void;
  settings: Record<string, string>;
}) {
  const { t, language } = useI18n();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = async () => {
    setLoading(true);
    setError("");
    try {
      setRows((await window.pos.listSales()) as any[]);
    } catch (value) {
      setError(localizeError(language, value));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, []);
  return (
    <div className="page-stack">
      <PageHeader
        eyebrow={t("register")}
        title={t("localSales")}
        description={t("localSalesText")}
      />
      <div className="panel data-panel">
        {loading ? (
          <LoadingState label={t("loadingData")} />
        ) : error ? (
          <ErrorState
            title={t("unableToLoad")}
            text={error || t("tryAgainText")}
            retryLabel={t("retry")}
            onRetry={() => void load()}
          />
        ) : rows.length ? (
          <div className="table">
            <div className="table-row five table-head">
              <span>{t("receipt")}</span>
              <span>{t("date")}</span>
              <span>{t("payment")}</span>
              <span>{t("syncState")}</span>
              <span>{t("total")}</span>
            </div>
            {rows.map((row) => (
              <div className="table-row five" key={row.id}>
                <span>
                  <strong>{row.sale_number}</strong>
                </span>
                <span>
                  {new Date(row.created_at).toLocaleString(localeFor(language))}
                </span>
                <span>{localizeValue(language, row.payment_method)}</span>
                <span>
                  <em
                    className={
                      row.sync_state === "SYNCED" ? "badge" : "badge warning"
                    }
                  >
                    {localizeValue(language, row.sync_state)}
                  </em>
                </span>
                <span className="row-action">
                  {money(row.total)}
                  <button
                    className="icon-button"
                    title={t("receipt")}
                    onClick={() =>
                      window.pos
                        .printReceipt({
                          saleId: row.id,
                          printerName: settings.printerName || undefined,
                        })
                        .catch((error) =>
                          onNotice(localizeError(language, error)),
                        )
                    }
                  >
                    <Printer />
                  </button>
                </span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={ReceiptText}
            title={t("noSales")}
            text={t("noSalesText")}
          />
        )}
      </div>
    </div>
  );
}
