import { useState } from "react";
import { Search, Plus, Star, BookOpen, Filter } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/Badge";
import { BOOKS, AdminBook } from "@/data/mockData";
import { useAuth } from "@/context/AuthContext";

function statusVariant(s: AdminBook["status"]) {
  if (s === "published") return "success" as const;
  if (s === "draft") return "neutral" as const;
  return "danger" as const;
}

export default function BooksPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const books = user?.role === "publisher"
    ? BOOKS.filter((b) => b.publisherId === user.publisherId)
    : BOOKS;

  const filtered = books.filter((b) => {
    const matchSearch =
      !search ||
      b.title.toLowerCase().includes(search.toLowerCase()) ||
      b.publisher.toLowerCase().includes(search.toLowerCase()) ||
      b.subject.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || b.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totals = {
    revenue: books.reduce((s, b) => s + b.totalRevenue, 0),
    sales: books.reduce((s, b) => s + b.salesCount, 0),
    published: books.filter((b) => b.status === "published").length,
  };

  return (
    <div className="p-6">
      <PageHeader
        title="Books"
        subtitle={`${totals.published} published · ${totals.sales.toLocaleString()} total sales · EGP ${totals.revenue.toLocaleString()} revenue`}
        actions={
          <button className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition">
            <Plus size={15} />
            Add Book
          </button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search by title, subject, publisher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-input bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-muted-foreground" />
          {(["all", "published", "draft", "suspended"] as const).map((s) => (
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

      {/* Table */}
      <div className="bg-card border border-card-border rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Book</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden md:table-cell">Subject</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Publisher</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Price</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Sales</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden xl:table-cell">Revenue</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((book) => (
              <tr key={book.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <BookOpen size={16} className="text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate max-w-[200px]">{book.title}</p>
                      <p className="text-xs text-muted-foreground">{book.grade} · {book.type}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{book.subject}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs hidden lg:table-cell">{book.publisher}</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  <span className="font-semibold text-foreground">EGP {book.price}</span>
                  {book.originalPrice && (
                    <span className="text-muted-foreground text-xs line-through ml-1">EGP {book.originalPrice}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-muted-foreground tabular-nums hidden lg:table-cell">
                  {book.salesCount.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-foreground tabular-nums hidden xl:table-cell">
                  EGP {book.totalRevenue.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-center">
                  <Badge variant={statusVariant(book.status)}>{book.status}</Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5 justify-end">
                    {book.rating > 0 && (
                      <div className="flex items-center gap-0.5 text-amber-500">
                        <Star size={11} fill="currentColor" />
                        <span className="text-xs text-muted-foreground">{book.rating}</span>
                      </div>
                    )}
                    <button className="text-xs text-primary hover:underline ml-2">Edit</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-16 text-center text-muted-foreground text-sm">
            No books match your filters.
          </div>
        )}
      </div>
    </div>
  );
}
