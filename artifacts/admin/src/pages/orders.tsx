import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, RefreshCw, Search } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/Badge";
import type { Order } from "@/data/mockData";
import { useAuth } from "@/context/AuthContext";
import { useAdminLanguage } from "@/context/AdminLanguageContext";
import { fetchSyncedOrders } from "@/lib/apiSync";
import { cn } from "@/lib/utils";

function statusVariant(s: Order["status"]) {
  if (s === "completed") return "success" as const;
  if (s === "refunded") return "danger" as const;
  return "warning" as const;
}

function formatExportDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function downloadExcelFile(orders: Order[], filename: string) {
  const headers = [
    "Order ID",
    "Status",
    "Created at",
    "Student ID",
    "Student name",
    "Book ID",
    "Book title",
    "Publisher ID",
    "Publisher",
    "Amount EGP",
    "Coupon code",
    "Discount EGP",
  ];

  const rows = orders.map((order) => [
    order.id,
    order.status,
    formatExportDate(order.createdAt),
    order.studentId,
    order.studentName,
    order.bookId,
    order.bookTitle,
    order.publisherId,
    order.publisher,
    order.amount,
    order.couponCode ?? "",
    order.discountAmount ?? "",
  ]);

  const table = [
    `<tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>`,
    ...rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`),
  ].join("");

  const html = `\uFEFF<html><head><meta charset="utf-8" /></head><body><table border="1">${table}</table></body></html>`;
  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function OrdersPage() {
  const { user } = useAuth();
  const { t, isRTL, formatCurrency, formatDate } = useAdminLanguage();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [liveOrders, setLiveOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [syncError, setSyncError] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  const loadOrders = useCallback(async (showLoading = false) => {
    if (showLoading) setIsLoading(true);
    try {
      const nextOrders = await fetchSyncedOrders();
      setLiveOrders(nextOrders);
      setLastSyncedAt(new Date().toISOString());
      setSyncError(false);
    } catch {
      setSyncError(true);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOrders(true);
    const interval = window.setInterval(() => {
      void loadOrders();
    }, 5000);

    return () => window.clearInterval(interval);
  }, [loadOrders]);

  const orders = useMemo(() => {
    const scoped =
      user?.role === "publisher"
        ? liveOrders.filter((order) => order.publisherId === user.publisherId)
        : liveOrders;

    return [...scoped].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [liveOrders, user]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((order) => {
      const matchSearch =
        !q ||
        order.id.toLowerCase().includes(q) ||
        order.studentId.toLowerCase().includes(q) ||
        order.studentName.toLowerCase().includes(q) ||
        order.bookId.toLowerCase().includes(q) ||
        order.bookTitle.toLowerCase().includes(q) ||
        order.publisher.toLowerCase().includes(q) ||
        (order.couponCode ?? "").toLowerCase().includes(q);
      const matchStatus = statusFilter === "all" || order.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [orders, search, statusFilter]);

  const revenue = orders
    .filter((order) => order.status === "completed")
    .reduce((sum, order) => sum + order.amount, 0);
  const refunded = orders
    .filter((order) => order.status === "refunded")
    .reduce((sum, order) => sum + order.amount, 0);

  const exportFilteredOrders = () => {
    if (filtered.length === 0) return;
    const date = new Date().toISOString().slice(0, 10);
    downloadExcelFile(filtered, `warqless-orders-${date}.xls`);
  };

  return (
    <div className="p-6">
      <PageHeader
        title={t.orders.title}
        subtitle={t.orders.subtitle(orders.length, formatCurrency(revenue), formatCurrency(refunded))}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void loadOrders(true)}
              className="flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
            >
              <RefreshCw size={15} className={cn(isLoading && "animate-spin")} />
              {lastSyncedAt
                ? t.orders.lastSynced(formatDate(lastSyncedAt, { hour: "2-digit", minute: "2-digit" }))
                : t.orders.refresh}
            </button>
            <button
              type="button"
              onClick={exportFilteredOrders}
              disabled={filtered.length === 0}
              className="flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download size={15} />
              {t.orders.exportExcel}
            </button>
          </div>
        }
      />

      {syncError && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {t.orders.loadError}
        </div>
      )}

      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={15} className={cn("absolute top-1/2 -translate-y-1/2 text-muted-foreground", isRTL ? "right-3" : "left-3")} />
          <input
            type="search"
            placeholder={t.orders.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={cn(
              "w-full rounded-xl border border-input bg-card py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring",
              isRTL ? "pr-9 pl-4" : "pl-9 pr-4",
            )}
          />
        </div>
        <div className="flex gap-1.5">
          {(["all", "completed", "pending", "refunded"] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                statusFilter === status
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.common[status]}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-card-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-4 py-3 text-start text-xs font-medium uppercase tracking-wide text-muted-foreground">{t.orders.order}</th>
              <th className="hidden px-4 py-3 text-start text-xs font-medium uppercase tracking-wide text-muted-foreground md:table-cell">{t.common.student}</th>
              <th className="hidden px-4 py-3 text-start text-xs font-medium uppercase tracking-wide text-muted-foreground lg:table-cell">{t.common.publisher}</th>
              <th className="hidden px-4 py-3 text-start text-xs font-medium uppercase tracking-wide text-muted-foreground xl:table-cell">{t.common.date}</th>
              <th className="hidden px-4 py-3 text-start text-xs font-medium uppercase tracking-wide text-muted-foreground xl:table-cell">{t.orders.coupon}</th>
              <th className="px-4 py-3 text-end text-xs font-medium uppercase tracking-wide text-muted-foreground">{t.orders.netAmount}</th>
              <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">{t.common.status}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((order) => (
              <tr key={order.id} className="transition-colors hover:bg-muted/30">
                <td className="px-4 py-3">
                  <div>
                    <p className="max-w-[260px] truncate font-medium text-foreground">{order.bookTitle}</p>
                    <p className="mt-0.5 text-xs uppercase tracking-wide text-muted-foreground">#{order.id}</p>
                    <p className="mt-1 text-xs text-muted-foreground lg:hidden">{order.studentName}</p>
                  </div>
                </td>
                <td className="hidden px-4 py-3 md:table-cell">
                  <p className="text-sm text-foreground">{order.studentName}</p>
                  <p className="text-xs text-muted-foreground">{order.studentId}</p>
                </td>
                <td className="hidden px-4 py-3 text-xs text-muted-foreground lg:table-cell">
                  <p>{order.publisher}</p>
                  {order.publisherId && <p className="mt-1">{order.publisherId}</p>}
                </td>
                <td className="hidden px-4 py-3 text-xs text-muted-foreground xl:table-cell">
                  {formatDate(order.createdAt, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td className="hidden px-4 py-3 text-xs text-muted-foreground xl:table-cell">
                  {order.couponCode ? (
                    <div>
                      <p className="font-medium text-foreground">{order.couponCode}</p>
                      {typeof order.discountAmount === "number" && (
                        <p className="mt-1">{t.orders.discount}: {formatCurrency(order.discountAmount)}</p>
                      )}
                    </div>
                  ) : (
                    <span>-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-end font-bold tabular-nums text-foreground">
                  {formatCurrency(order.amount)}
                </td>
                <td className="px-4 py-3 text-center">
                  <Badge variant={statusVariant(order.status)}>{t.common[order.status]}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-16 text-center text-sm text-muted-foreground">
            {isLoading ? t.orders.loading : t.orders.noOrders}
          </div>
        )}
      </div>
    </div>
  );
}
