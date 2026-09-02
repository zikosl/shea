import { useEffect, useMemo, useState } from "react";
import {
  Boxes,
  ChevronLeft,
  ChevronRight,
  History,
  LoaderCircle,
  PackagePlus,
  Search,
} from "lucide-react";
import { EmptyState } from "../../components/EmptyState";
import { ErrorState, LoadingState } from "../../components/AsyncState";
import { PageHeader } from "../../components/PageHeader";
import {
  localeFor,
  localizeError,
  localizeReason,
  localizeValue,
  useI18n,
} from "../../i18n";
import type { Catalog, Product } from "../../types";

type Changes = Omit<
  Parameters<typeof window.pos.updateProduct>[0],
  "productLocalId"
>;
type Tab = "products" | "catalog" | "movements";

export function InventoryScreen({
  onNotice,
}: {
  onNotice: (message: string) => void;
}) {
  const { t, language } = useI18n();
  const [tab, setTab] = useState<Tab>("products");
  const [products, setProducts] = useState<Product[]>([]),
    [templates, setTemplates] = useState<any[]>([]),
    [movements, setMovements] = useState<any[]>([]);
  const [catalog, setCatalog] = useState<Catalog | null>(null),
    [search, setSearch] = useState(""),
    [page, setPage] = useState(0);
  const [filters, setFilters] = useState({
    niche: "",
    category: "",
    type: "",
    brand: "",
    status: "",
    movementType: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activating, setActivating] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const limit = 50;
  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [inventory, catalogValue, templateRows, movementRows] =
        await Promise.all([
          window.pos.listInventory({ search, limit: 250 }),
          window.pos.listCatalog(),
          window.pos.listTemplates({ search, limit: 250 }),
          window.pos.listMovements({
            search,
            type: filters.movementType || undefined,
            limit: 500,
          }),
        ]);
      setProducts(inventory as Product[]);
      setCatalog(catalogValue as Catalog);
      setTemplates(templateRows);
      setMovements(movementRows);
    } catch (value) {
      setError(localizeError(language, value));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, [search, filters.movementType]);
  useEffect(() => setPage(0), [search, filters, tab]);

  const categories =
    catalog?.categories.filter(
      (row) => !filters.niche || row.niche_id === Number(filters.niche),
    ) ?? [];
  const productTypes =
    catalog?.productTypes.filter(
      (row) =>
        !filters.category || row.category_id === Number(filters.category),
    ) ?? [];
  const brands =
    catalog?.brands.filter(
      (row) => !filters.niche || row.niche_id === Number(filters.niche),
    ) ?? [];
  const filteredProducts = useMemo(
    () =>
      products.filter((row: any) => {
        if (filters.category && row.category_id !== Number(filters.category))
          return false;
        if (filters.type && row.product_type_id !== Number(filters.type))
          return false;
        if (filters.brand && row.brand_id !== Number(filters.brand))
          return false;
        if (
          filters.niche &&
          !categories.some((category) => category.id === row.category_id)
        )
          return false;
        if (
          filters.status === "low" &&
          !(
            row.inventory_policy === "TRACKED" &&
            row.stock <= row.reorder_threshold
          )
        )
          return false;
        if (
          filters.status === "out" &&
          !(row.inventory_policy === "TRACKED" && row.stock <= 0)
        )
          return false;
        if (
          filters.status === "unlimited" &&
          row.inventory_policy !== "UNLIMITED"
        )
          return false;
        if (filters.status === "hidden" && row.visible_in_pos) return false;
        if (filters.status === "inactive" && row.active) return false;
        return true;
      }),
    [products, filters, categories],
  );
  const filteredTemplates = templates.filter(
    (row) =>
      (!filters.category || row.category_id === Number(filters.category)) &&
      (!filters.type || row.product_type_id === Number(filters.type)) &&
      (!filters.brand || row.brand_id === Number(filters.brand)) &&
      (!filters.niche ||
        categories.some((category) => category.id === row.category_id)),
  );
  const current = (
    tab === "products"
      ? filteredProducts
      : tab === "catalog"
        ? filteredTemplates
        : movements
  ).slice(page * limit, (page + 1) * limit);
  const localized = (row: any) =>
    language === "ar" && row.name_ar ? row.name_ar : row.name;

  async function update(
    productLocalId: string,
    changes: Changes,
    notice: string,
  ) {
    try {
      await window.pos.updateProduct({ productLocalId, ...changes });
      onNotice(notice);
      await load();
    } catch (error) {
      onNotice(localizeError(language, error));
    }
  }
  async function activate(row: any, event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setActivating(row.variant_id);
    try {
      await window.pos.activateProduct({
        variantId: row.variant_id,
        price: Number(data.get("price")),
        costPrice: Number(data.get("costPrice")),
        stock: Number(data.get("stock")),
        reorderThreshold: Number(data.get("threshold")),
        trackInventory: data.get("tracked") === "on",
      });
      onNotice(`${localized(row)}: ${t("productActivated")}`);
      await load();
    } catch (error) {
      onNotice(localizeError(language, error));
    } finally {
      setActivating(null);
    }
  }
  async function createLocal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setCreating(true);
    try {
      await window.pos.createLocalProduct({
        name: String(data.get("name")),
        nameAr: String(data.get("nameAr") || ""),
        description: String(data.get("description") || ""),
        categoryId: Number(data.get("categoryId")),
        productTypeId: data.get("productTypeId")
          ? Number(data.get("productTypeId"))
          : undefined,
        brandId: data.get("brandId") ? Number(data.get("brandId")) : undefined,
        variantName: String(data.get("variantName") || "Default"),
        sku: String(data.get("sku") || ""),
        price: Number(data.get("price")),
        costPrice: Number(data.get("costPrice") || 0),
        stock: Number(data.get("stock") || 0),
        reorderThreshold: Number(data.get("threshold") || 0),
        trackInventory: data.get("tracked") === "on",
      });
      setShowCreate(false);
      setTab("products");
      onNotice(t("productRequestQueued"));
      await load();
    } catch (error) {
      onNotice(localizeError(language, error));
    } finally {
      setCreating(false);
    }
  }

  const title =
    tab === "products"
      ? t("products")
      : tab === "catalog"
        ? t("availableTemplates")
        : t("movementHistory");
  const description =
    tab === "catalog"
      ? t("availableTemplatesText")
      : tab === "movements"
        ? t("movementHistoryText")
        : t("noProductsText");
  return (
    <div className="inventory-stack page-stack">
      <PageHeader
        eyebrow={t("inventory")}
        title={title}
        description={description}
        actions={
          <button
            className="button primary"
            onClick={() => setShowCreate(true)}
          >
            <PackagePlus />
            {t("createProduct")}
          </button>
        }
      />
      <div className="panel inventory-header controls-only">
        <div className="segmented inventory-tabs">
          <button
            className={tab === "products" ? "active" : ""}
            onClick={() => setTab("products")}
          >
            <Boxes />
            {t("products")}
          </button>
          <button
            className={tab === "catalog" ? "active" : ""}
            onClick={() => setTab("catalog")}
          >
            <PackagePlus />
            {t("catalog")}
          </button>
          <button
            className={tab === "movements" ? "active" : ""}
            onClick={() => setTab("movements")}
          >
            <History />
            {t("movements")}
          </button>
        </div>
        <div className="search">
          <Search />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchInventory")}
          />
        </div>
        <div className="filter-grid">
          <Filter
            value={filters.niche}
            onChange={(value) =>
              setFilters({
                ...filters,
                niche: value,
                category: "",
                type: "",
                brand: "",
              })
            }
            label={t("allNiches")}
            rows={catalog?.niches ?? []}
            name={localized}
          />
          <Filter
            value={filters.category}
            onChange={(value) =>
              setFilters({ ...filters, category: value, type: "" })
            }
            label={t("allCategories")}
            rows={categories}
            name={localized}
          />
          <Filter
            value={filters.type}
            onChange={(value) => setFilters({ ...filters, type: value })}
            label={t("allTypes")}
            rows={productTypes}
            name={localized}
          />
          <Filter
            value={filters.brand}
            onChange={(value) => setFilters({ ...filters, brand: value })}
            label={t("allBrands")}
            rows={brands}
            name={localized}
          />
          {tab === "products" && (
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters({ ...filters, status: e.target.value })
              }
            >
              <option value="">{t("allStatuses")}</option>
              <option value="low">{t("lowStock")}</option>
              <option value="out">{t("outOfStock")}</option>
              <option value="unlimited">{t("unlimited")}</option>
              <option value="hidden">{t("hidden")}</option>
              <option value="inactive">{t("inactive")}</option>
            </select>
          )}
          {tab === "movements" && (
            <select
              value={filters.movementType}
              onChange={(e) =>
                setFilters({ ...filters, movementType: e.target.value })
              }
            >
              <option value="">{t("allMovements")}</option>
              {[
                "SALE",
                "RECEIPT",
                "RETURN",
                "ADJUSTMENT_IN",
                "ADJUSTMENT_OUT",
              ].map((value) => (
                <option key={value} value={value}>
                  {localizeValue(language, value)}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
      {loading ? (
        <div className="panel">
          <LoadingState label={t("loadingData")} />
        </div>
      ) : error ? (
        <div className="panel">
          <ErrorState
            title={t("unableToLoad")}
            text={error || t("tryAgainText")}
            retryLabel={t("retry")}
            onRetry={() => void load()}
          />
        </div>
      ) : (
        tab === "products" && (
          <div className="panel table-panel">
            {current.length ? (
              <div className="table">
                <div className="table-row inventory-advanced table-head">
                  <span>{t("product")}</span>
                  <span>{t("price")}</span>
                  <span>{t("cost")}</span>
                  <span>{t("stock")}</span>
                  <span>{t("threshold")}</span>
                  <span>{t("pos")}</span>
                  <span>{t("active")}</span>
                </div>
                {current.map((product: any) => (
                  <div
                    className="table-row inventory-advanced"
                    key={product.local_id}
                  >
                    <span>
                      <strong>{localized(product)}</strong>
                      <small>{product.variant_name || product.sku}</small>
                      {product.provisional ? (
                        <em className="badge warning">
                          {localizeValue(
                            language,
                            product.request_status || "PENDING",
                          )}
                        </em>
                      ) : null}
                    </span>
                    <InlineNumber
                      value={product.price}
                      onSave={(price) =>
                        update(product.local_id, { price }, t("priceSaved"))
                      }
                    />
                    <InlineNumber
                      value={product.cost_price}
                      onSave={(costPrice) =>
                        update(product.local_id, { costPrice }, t("costSaved"))
                      }
                    />
                    <span className="stock-cell">
                      {product.inventory_policy === "TRACKED" ? (
                        <InlineNumber
                          value={product.stock}
                          onSave={(stock) =>
                            update(product.local_id, { stock }, t("stockSaved"))
                          }
                        />
                      ) : (
                        <em className="badge">{t("unlimited")}</em>
                      )}
                      <label className="tiny-check">
                        <input
                          type="checkbox"
                          defaultChecked={
                            product.inventory_policy === "TRACKED"
                          }
                          onChange={(e) =>
                            void update(
                              product.local_id,
                              { trackInventory: e.target.checked },
                              t("inventoryPolicySaved"),
                            )
                          }
                        />
                        {t("trackStock")}
                      </label>
                    </span>
                    <InlineNumber
                      value={product.reorder_threshold}
                      onSave={(reorderThreshold) =>
                        update(
                          product.local_id,
                          { reorderThreshold },
                          t("thresholdSaved"),
                        )
                      }
                    />
                    <span>
                      <input
                        type="checkbox"
                        checked={Boolean(product.visible_in_pos)}
                        onChange={(e) =>
                          void update(
                            product.local_id,
                            { visibleInPos: e.target.checked },
                            t("visibilitySaved"),
                          )
                        }
                      />
                    </span>
                    <span>
                      <input
                        type="checkbox"
                        checked={Boolean(product.active)}
                        onChange={(e) =>
                          void update(
                            product.local_id,
                            { active: e.target.checked },
                            t("statusSaved"),
                          )
                        }
                      />
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Boxes}
                title={t("noProducts")}
                text={t("noProductsText")}
              />
            )}
          </div>
        )
      )}
      {!loading && !error && tab === "catalog" && (
        <div className="catalog-activation-grid">
          {current.map((row: any) => (
            <form
              className="activation-card"
              key={row.variant_id}
              onSubmit={(event) => activate(row, event)}
            >
              <div className="activation-image">
                {row.image ? <img src={row.image} alt="" /> : <PackagePlus />}
              </div>
              <div className="activation-copy">
                <h3>{localized(row)}</h3>
                <p>
                  {row.variant_name ||
                    row.sku ||
                    row.tags?.join(" · ") ||
                    t("standard")}
                </p>
              </div>
              {row.product_local_id ? (
                <em className="badge">{t("alreadyAdded")}</em>
              ) : (
                <>
                  <div className="activation-fields">
                    <label>
                      {t("sellingPrice")}
                      <input name="price" type="number" min="0" required />
                    </label>
                    <label>
                      {t("costPrice")}
                      <input
                        name="costPrice"
                        type="number"
                        min="0"
                        defaultValue="0"
                      />
                    </label>
                    <label>
                      {t("initialStock")}
                      <input
                        name="stock"
                        type="number"
                        min="0"
                        defaultValue="0"
                      />
                    </label>
                    <label>
                      {t("threshold")}
                      <input
                        name="threshold"
                        type="number"
                        min="0"
                        defaultValue="0"
                      />
                    </label>
                  </div>
                  <label className="switch-label">
                    <input name="tracked" type="checkbox" defaultChecked />
                    {t("trackStock")}
                  </label>
                  <button
                    className="button primary full"
                    disabled={activating === row.variant_id}
                  >
                    {activating === row.variant_id ? (
                      <LoaderCircle className="spin" />
                    ) : (
                      <PackagePlus />
                    )}
                    {activating === row.variant_id
                      ? t("submitting")
                      : t("activate")}
                  </button>
                </>
              )}
            </form>
          ))}
        </div>
      )}
      {!loading && !error && tab === "movements" && (
        <div className="panel table-panel">
          {current.length ? (
            <div className="table">
              <div className="table-row movement table-head">
                <span>{t("product")}</span>
                <span>{t("change")}</span>
                <span>{t("beforeAfter")}</span>
                <span>{t("reason")}</span>
                <span>{t("date")}</span>
              </div>
              {current.map((row: any) => (
                <div className="table-row movement" key={row.id}>
                  <span>
                    <strong>
                      {language === "ar" && row.product_name_ar
                        ? row.product_name_ar
                        : row.product_name}
                    </strong>
                    <small>{row.variant_name || row.sku}</small>
                  </span>
                  <span>
                    <em
                      className={
                        row.quantity_delta >= 0
                          ? "quantity-positive"
                          : "quantity-negative"
                      }
                    >
                      {row.quantity_delta >= 0 ? "+" : ""}
                      {row.quantity_delta}
                    </em>
                    <small>{localizeValue(language, row.type)}</small>
                  </span>
                  <span>
                    {row.stock_before} → {row.stock_after}
                  </span>
                  <span>{localizeReason(language, row.reason)}</span>
                  <span>
                    {new Date(row.created_at).toLocaleString(
                      localeFor(language),
                    )}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={History}
              title={t("noMovements")}
              text={t("movementHistoryText")}
            />
          )}
        </div>
      )}
      {!loading && !error && (
        <div className="pagination">
          <button disabled={!page} onClick={() => setPage(page - 1)}>
            <ChevronLeft />
          </button>
          <span>{page + 1}</span>
          <button
            disabled={current.length < limit}
            onClick={() => setPage(page + 1)}
          >
            <ChevronRight />
          </button>
        </div>
      )}
      {showCreate && catalog && (
        <div
          className="modal-backdrop"
          onMouseDown={() => !creating && setShowCreate(false)}
        >
          <form
            className="modal-card product-create-dialog"
            onSubmit={createLocal}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <p className="eyebrow">{t("localProduct")}</p>
            <h2>{t("createProduct")}</h2>
            <p className="muted">{t("createProductHelp")}</p>
            <div className="two-fields">
              <label>
                {t("englishName")}
                <input name="name" required autoFocus />
              </label>
              <label>
                {t("arabicName")}
                <input name="nameAr" dir="rtl" />
              </label>
            </div>
            <label>
              {t("description")}
              <textarea name="description" />
            </label>
            <div className="two-fields">
              <label>
                {t("category")}
                <select name="categoryId" required>
                  <option value="">{t("chooseCategory")}</option>
                  {catalog.categories.map((row) => (
                    <option key={row.id} value={row.id}>
                      {localized(row)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t("productType")}
                <select name="productTypeId">
                  <option value="">{t("optional")}</option>
                  {catalog.productTypes.map((row) => (
                    <option key={row.id} value={row.id}>
                      {localized(row)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t("brand")}
                <select name="brandId">
                  <option value="">{t("optional")}</option>
                  {catalog.brands.map((row) => (
                    <option key={row.id} value={row.id}>
                      {localized(row)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t("variant")}
                <input name="variantName" defaultValue="Default" />
              </label>
              <label>
                {t("sku")}
                <input name="sku" />
              </label>
              <label>
                {t("sellingPrice")}
                <input name="price" type="number" min="0" required />
              </label>
              <label>
                {t("costPrice")}
                <input
                  name="costPrice"
                  type="number"
                  min="0"
                  defaultValue="0"
                />
              </label>
              <label>
                {t("initialStock")}
                <input name="stock" type="number" min="0" defaultValue="0" />
              </label>
              <label>
                {t("threshold")}
                <input
                  name="threshold"
                  type="number"
                  min="0"
                  defaultValue="0"
                />
              </label>
            </div>
            <label className="switch-label">
              <input name="tracked" type="checkbox" defaultChecked />
              {t("trackStock")}
            </label>
            <div className="dialog-actions">
              <button
                type="button"
                className="button secondary"
                onClick={() => setShowCreate(false)}
                disabled={creating}
              >
                {t("close")}
              </button>
              <button className="button primary" disabled={creating}>
                {creating ? <LoaderCircle className="spin" /> : <PackagePlus />}
                {creating ? t("submitting") : t("createProduct")}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function Filter({
  value,
  onChange,
  label,
  rows,
  name,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  rows: any[];
  name: (row: any) => string;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{label}</option>
      {rows.map((row) => (
        <option key={row.id} value={row.id}>
          {name(row)}
        </option>
      ))}
    </select>
  );
}
function InlineNumber({
  value,
  onSave,
}: {
  value: number;
  onSave: (value: number) => void;
}) {
  return (
    <span>
      <input
        className="quantity-input"
        type="number"
        min="0"
        defaultValue={value ?? 0}
        onBlur={(event) => {
          const next = Number(event.target.value);
          if (next !== value) onSave(next);
        }}
      />
    </span>
  );
}
