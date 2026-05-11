import { useState } from "react";
import { Search, Download } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/Badge";
import { ORDERS, Order } from "@/data/mockData";
import { useAuth } from "@/context/AuthContext";

function statusVariant(s: Order["status"]) {
  if (s === "completed") return "success" as const;
  if (s === "refunded") return "danger" as const;
  return "warning" as const;
}

export default function OrdersPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const orders = user?.role === "publisher"
    ? ORDERS.filter((o) => o.publisherId === user.publisherId)
    : ORDERS;

  const filtered = orders.filter((o) => {
    const matchSearch =
      !search ||
      o.studentName.toLowerCase().includes(search.toLowerCase()) ||
      o.bookTitle.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const revenue = orders
    .filter((o) => o.status === "completed")
    .reduce((s, o) => s + o.amount, 0);
  const refunded = orders.filter((o) => o.status === "refunded").reduce((s, o) => s + o.amount, 0);

  return (
    <div className="p-6">
      <PageHeader
        title="Orders"
        subtitle={`${orders.length} orders · EGP ${revenue.toLocaleString()} revenue · EGP ${refunded.toLocaleString()} refunded`}
        actions={
          <button className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-border bg-card text-foreground text-sm font-medium hover:bg-muted transition">
            <Download size={15} />
            Export CSV
          </button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search by student or book..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-input bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex gap-1.5">
          {(["all", "completed", "pending", "refunded"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                statusFilter === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-card border border-card-border rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Order</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden md:table-cell">Student</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Publisher</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden xl:table-cell">Date</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Amount</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((order) => (
              <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium text-foreground truncate max-w-[220px]">{order.bookTitle}</p>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mt-0.5">#{order.id}</p>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{order.studentName}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs hidden lg:table-cell">{order.publisher}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs hidden xl:table-cell">
                  {new Date(order.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </td>
                <td className="px-4 py-3 text-right font-bold text-foreground tabular-nums">
                  EGP {order.amount}
                </td>
                <td className="px-4 py-3 text-center">
                  <Badge variant={statusVariant(order.status)}>{order.status}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-16 text-center text-muted-foreground text-sm">
            No orders match your filters.
          </div>
        )}
      </div>
    </div>
  );
}
