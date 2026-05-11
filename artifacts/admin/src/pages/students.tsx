import { useState } from "react";
import { Search, Users, BookOpen, ArrowLeftRight } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/Badge";
import { STUDENTS, Student } from "@/data/mockData";

function statusVariant(s: Student["status"]) {
  return s === "active" ? ("success" as const) : ("danger" as const);
}

export default function StudentsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = STUDENTS.filter((s) => {
    const matchSearch =
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase()) ||
      s.grade.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalSpent = STUDENTS.reduce((s, st) => s + st.totalSpent, 0);

  return (
    <div className="p-6">
      <PageHeader
        title="Students"
        subtitle={`${STUDENTS.filter((s) => s.status === "active").length} active students · EGP ${totalSpent.toLocaleString()} total spent`}
        actions={
          <div className="flex items-center gap-2">
            {(["all", "active", "suspended"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                  statusFilter === f
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        }
      />

      <div className="relative mb-5">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          placeholder="Search students..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm pl-9 pr-4 py-2.5 rounded-xl border border-input bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="bg-card border border-card-border rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Student</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden md:table-cell">Grade</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Books</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Borrowed</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden xl:table-cell">Devices</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Spent</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((student) => (
              <tr key={student.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                      {student.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{student.name}</p>
                      <p className="text-xs text-muted-foreground">{student.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{student.grade}</td>
                <td className="px-4 py-3 text-center hidden lg:table-cell">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground">
                    <BookOpen size={13} />
                    <span>{student.booksOwned}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-center hidden lg:table-cell">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground">
                    <ArrowLeftRight size={13} />
                    <span>{student.booksBorrowed}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-center text-muted-foreground hidden xl:table-cell">
                  {student.devices}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-foreground tabular-nums">
                  EGP {student.totalSpent.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-center">
                  <Badge variant={statusVariant(student.status)}>{student.status}</Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5 justify-end">
                    <button className="text-xs text-primary hover:underline">View</button>
                    {student.status === "active" ? (
                      <button className="text-xs text-destructive hover:underline ml-1">Suspend</button>
                    ) : (
                      <button className="text-xs text-emerald-600 hover:underline ml-1">Restore</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-16 text-center text-muted-foreground text-sm">
            No students match your filters.
          </div>
        )}
      </div>
    </div>
  );
}
