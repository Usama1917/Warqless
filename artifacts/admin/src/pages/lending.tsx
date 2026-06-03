import { useState } from "react";
import { ArrowLeftRight, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/Badge";
import { BOOKS, LENDING_RECORDS, LendingRecord } from "@/data/mockData";
import { useAuth } from "@/context/AuthContext";
import { useAdminLanguage } from "@/context/AdminLanguageContext";

function statusVariant(s: LendingRecord["status"]) {
  if (s === "active") return "default" as const;
  if (s === "returned") return "success" as const;
  return "danger" as const;
}

function StatusIcon({ status }: { status: LendingRecord["status"] }) {
  if (status === "active") return <Clock size={14} className="text-primary" />;
  if (status === "returned") return <CheckCircle2 size={14} className="text-emerald-600" />;
  return <AlertTriangle size={14} className="text-red-500" />;
}

export default function LendingPage() {
  const { user } = useAuth();
  const { t, formatDate } = useAdminLanguage();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const isAdmin = user?.role === "admin";
  const publisherBookIds = new Set(
    BOOKS.filter((b) => b.publisherId === user?.publisherId).map((b) => b.id),
  );
  const records = isAdmin
    ? LENDING_RECORDS
    : LENDING_RECORDS.filter((r) => publisherBookIds.has(r.bookId));

  const filtered = records.filter(
    (r) => statusFilter === "all" || r.status === statusFilter
  );

  const stats = {
    active: records.filter((r) => r.status === "active").length,
    returned: records.filter((r) => r.status === "returned").length,
    overdue: records.filter((r) => r.status === "overdue").length,
  };

  return (
    <div className="p-6">
      <PageHeader
        title={t.lending.title}
        subtitle={t.lending.subtitle(stats.active, stats.returned, stats.overdue)}
      />

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {[
          { label: t.lending.activeLoans, value: stats.active, color: "bg-primary/10 text-primary", icon: Clock },
          { label: t.common.returned, value: stats.returned, color: "bg-emerald-50 text-emerald-700", icon: CheckCircle2 },
          { label: t.common.overdue, value: stats.overdue, color: "bg-red-50 text-red-600", icon: AlertTriangle },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-card-border rounded-xl p-4 shadow-sm">
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm font-bold ${s.color}`}>
              <s.icon size={15} />
              {s.value}
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-1.5 mb-5">
        {(["all", "active", "returned", "overdue"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
              statusFilter === f
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.common[f]}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((record) => (
          <div key={record.id} className="bg-card border border-card-border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <ArrowLeftRight size={16} className="text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-foreground text-sm truncate">{record.bookTitle}</p>
                    <StatusIcon status={record.status} />
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                    <span>
                      <span className="font-medium text-foreground">{t.lending.owner}:</span> {record.ownerName}
                    </span>
                    <span>
                      <span className="font-medium text-foreground">{t.lending.borrower}:</span> {record.borrowerName}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
                    <span>
                      {t.lending.lent}: {formatDate(record.lentAt, { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                    <span>
                      {t.lending.due}: {formatDate(record.dueAt, { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                    {record.returnedAt && (
                      <span className="text-emerald-600">
                        {t.lending.returned}: {formatDate(record.returnedAt, { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant={statusVariant(record.status)}>{t.common[record.status]}</Badge>
                {record.status === "active" && (
                  <button className="text-xs text-destructive border border-destructive/30 px-2.5 py-1 rounded-lg hover:bg-destructive/5 transition">
                    {t.common.recall}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="py-16 text-center text-muted-foreground text-sm bg-card border border-card-border rounded-xl">
            {t.lending.noRecords}
          </div>
        )}
      </div>
    </div>
  );
}
