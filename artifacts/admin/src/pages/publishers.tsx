import { useState } from "react";
import { Search, Plus, Building2, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/Badge";
import { PUBLISHERS, Publisher } from "@/data/mockData";

function statusVariant(s: Publisher["status"]) {
  return s === "active" ? ("success" as const) : ("danger" as const);
}

export default function PublishersPage() {
  const [search, setSearch] = useState("");

  const filtered = PUBLISHERS.filter(
    (p) =>
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase()) ||
      p.country.toLowerCase().includes(search.toLowerCase())
  );

  const totalRevenue = PUBLISHERS.reduce((s, p) => s + p.totalRevenue, 0);
  const totalBooks = PUBLISHERS.reduce((s, p) => s + p.booksCount, 0);

  return (
    <div className="p-6">
      <PageHeader
        title="Publishers"
        subtitle={`${PUBLISHERS.filter((p) => p.status === "active").length} active · ${totalBooks} books · EGP ${totalRevenue.toLocaleString()} total revenue`}
        actions={
          <button className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition">
            <Plus size={15} />
            Add Publisher
          </button>
        }
      />

      <div className="relative mb-5">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          placeholder="Search publishers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm pl-9 pr-4 py-2.5 rounded-xl border border-input bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((pub) => (
          <div key={pub.id} className="bg-card border border-card-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Building2 size={18} className="text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">{pub.name}</p>
                  <p className="text-muted-foreground text-xs">{pub.country}</p>
                </div>
              </div>
              <Badge variant={statusVariant(pub.status)}>{pub.status}</Badge>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-muted rounded-lg p-2.5 text-center">
                <p className="text-sm font-bold text-foreground">{pub.booksCount}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Books</p>
              </div>
              <div className="bg-muted rounded-lg p-2.5 text-center col-span-2">
                <p className="text-sm font-bold text-foreground">EGP {pub.totalRevenue.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Revenue</p>
              </div>
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              <div className="flex items-center justify-between">
                <span>{pub.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Joined {new Date(pub.joinedAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</span>
                <div className="flex items-center gap-1 text-emerald-600 font-medium">
                  <TrendingUp size={11} />
                  <span>Active</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3.5 border-t border-border flex gap-2">
              <button className="flex-1 py-1.5 text-xs font-medium text-primary border border-primary/30 rounded-lg hover:bg-primary/5 transition">
                View Books
              </button>
              <button className="flex-1 py-1.5 text-xs font-medium text-foreground border border-border rounded-lg hover:bg-muted transition">
                Edit
              </button>
              {pub.status === "active" ? (
                <button className="flex-1 py-1.5 text-xs font-medium text-destructive border border-destructive/30 rounded-lg hover:bg-destructive/5 transition">
                  Suspend
                </button>
              ) : (
                <button className="flex-1 py-1.5 text-xs font-medium text-emerald-600 border border-emerald-200 rounded-lg hover:bg-emerald-50 transition">
                  Reactivate
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="py-16 text-center text-muted-foreground text-sm">
          No publishers match your search.
        </div>
      )}
    </div>
  );
}
