import { BrowserWindow } from "electron";
import type { PosDatabase } from "./database";

function escape(value: unknown) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ]!,
  );
}

type ReceiptLanguage = "en" | "ar";

const receiptText = {
  en: {
    total: "Total",
    payment: "Payment",
    cash: "Cash",
    card: "Card",
    other: "Other",
    thankYou: "Thank you",
    printerConnected: "Printer connected successfully.",
  },
  ar: {
    total: "الإجمالي",
    payment: "الدفع",
    cash: "نقداً",
    card: "بطاقة",
    other: "أخرى",
    thankYou: "شكراً لزيارتكم",
    printerConnected: "تم ربط الطابعة بنجاح.",
  },
};

function receiptHtml(
  sale: any,
  items: any[],
  settings: Record<string, string>,
) {
  const language: ReceiptLanguage = settings.language === "ar" ? "ar" : "en";
  const text = receiptText[language];
  const payment =
    text[sale.payment_method?.toLowerCase() as "cash" | "card" | "other"] ??
    escape(sale.payment_method);
  const footer = settings.receiptFooter || text.thankYou;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    @page{margin:3mm}body{font:12px ui-monospace,monospace;color:#000;margin:0;direction:${language === "ar" ? "rtl" : "ltr"}}.center{text-align:center}h1{font-size:18px;margin:0 0 4px}.line{border-top:1px dashed #000;margin:8px 0}.row{display:flex;justify-content:space-between;gap:8px}.item{margin:6px 0}.total{font-size:16px;font-weight:700}
  </style></head><body><div class="center"><h1>${escape(settings.storeName || "Shea POS")}</h1><div>${escape(sale.sale_number)}</div><div>${escape(new Date(sale.created_at).toLocaleString(language === "ar" ? "ar-DZ" : "en-DZ"))}</div></div><div class="line"></div>
  ${items.map((item) => `<div class="item"><div>${escape(item.product_name)} ${escape(item.variant_name)}</div><div class="row"><span>${item.quantity} x ${Number(item.unit_price).toFixed(2)}</span><span>${Number(item.total).toFixed(2)} DZD</span></div></div>`).join("")}
  <div class="line"></div><div class="row total"><span>${text.total}</span><span>${Number(sale.total).toFixed(2)} DZD</span></div><div class="row"><span>${text.payment}</span><span>${payment}</span></div><div class="center" style="margin-top:14px">${escape(footer)}</div></body></html>`;
}

export async function listPrinters(window: BrowserWindow) {
  return window.webContents.getPrintersAsync();
}

async function printHtml(html: string, printerName?: string) {
  const printWindow = new BrowserWindow({
    show: false,
    webPreferences: { sandbox: true },
  });
  try {
    await printWindow.loadURL(
      `data:text/html;charset=utf-8,${encodeURIComponent(html)}`,
    );
    await new Promise<void>((resolve, reject) =>
      printWindow.webContents.print(
        { silent: true, printBackground: true, deviceName: printerName },
        (success, reason) =>
          success ? resolve() : reject(new Error(reason || "Printing failed")),
      ),
    );
  } finally {
    printWindow.destroy();
  }
}

export async function printReceipt(
  database: PosDatabase,
  saleId: string,
  printerName?: string,
) {
  const { sale, items } = database.getSaleWithItems(saleId) as any;
  if (!sale) throw new Error("Sale not found");
  await printHtml(
    receiptHtml(sale, items, database.getSettings()),
    printerName,
  );
}

export async function testPrinter(database: PosDatabase, printerName?: string) {
  const settings = database.getSettings();
  const language: ReceiptLanguage = settings.language === "ar" ? "ar" : "en";
  await printHtml(
    `<html dir="${language === "ar" ? "rtl" : "ltr"}"><body style="font:14px monospace;text-align:center"><h2>${escape(settings.storeName || "Shea POS")}</h2><p>${receiptText[language].printerConnected}</p></body></html>`,
    printerName,
  );
}
