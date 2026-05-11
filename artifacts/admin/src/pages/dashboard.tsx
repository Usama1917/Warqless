import {
  BookOpen,
  Building2,
  Users,
  ShoppingCart,
  ArrowLeftRight,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Badge } from "@/components/Badge";
import {
  BOOKS,
  PUBLISHERS,
  STUDENTS,
  ORDERS,
  LENDING_RECORDS,
  MONTHLY_REVENUE,
  SUBJECT_BREAKDOWN,
} from "@/data/mockData";
import { useAuth } from "@/context/AuthContext";

function formatEGP(n: number) {
  return `EGP ${n.toLocaleString()}`;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const totalRevenue = ORDERS.filter((o) => o.status === "completed").reduce(
    (sum, o) => sum + o.amount,
    0
  );
  const publishedBooks = BOOKS.filter((b) => b.status === "published").length;
  const activeStudents = STUDENTS.filter((s) => s.status === "active").length;
  const activeLending = LENDING_RECORDS.filter((l) => l.status === "active").length;
  const overdueLending = LENDING_RECORDS.filter((l) => l.status === "overdue").length;
  const recentOrders = ORDERS.slice().reverse().slice(0, 5);

  return (
    <div className="p-6">
      <PageHeader
        title="Dashboard"
        subtitle={`Welcome back, ${user?.name}. Here is your overview.`}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Revenue"
          value={formatEGP(totalRevenue)}
          icon={TrendingUp}
          trend={12}
          iconColor="text-primary"
          iconBg="bg-primary/10"
        />
        <StatCard
          title="Published Books"
          value={publishedBooks}
          subtitle={`${BOOKS.filter((b) => b.status === "draft").length} drafts pending`}
          icon={BookOpen}
          trend={8}
          iconColor="text-accent"
          iconBg="bg-accent/10"
        />
        {isAdmin ? (
          <>
            <StatCard
              title="Active Students"
              value={activeStudents.toLocaleString()}
              subtitle={`${STUDENTS.filter((s) => s.status === "suspended").length} suspended`}
              icon={Users}
              trend={21}
              iconColor="text-emerald-600"
              iconBg="bg-emerald-50"
            />
            <StatCard
              title="Publishers"
              value={PUBLISHERS.filter((p) => p.status === "active").length}
              subtitle={`${PUBLISHERS.length} total registered`}
              icon={Building2}
              trend={0}
              iconColor="text-purple-600"
              iconBg="bg-purple-50"
            />
          </>
        ) : (
          <>
            <StatCard
              title="Orders"
              value={ORDERS.length}
              subtitle="All time"
              icon={ShoppingCart}
              trend={5}
              iconColor="text-emerald-600"
              iconBg="bg-emerald-50"
            />
            <StatCard
              title="Active Lending"
              value={activeLending}
              subtitle={overdueLending > 0 ? `${overdueLending} overdue` : undefined}
              icon={ArrowLeftRight}
              iconColor="text-amber-600"
              iconBg="bg-amber-50"
            />
          </>
        )}
      </div>

      {/* Overdue alert */}
      {overdueLending > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6 text-sm">
          <AlertTriangle size={16} className="text-amber-600 shrink-0" />
          <span className="text-amber-800">
            <strong>{overdueLending} lending record{overdueLending > 1 ? "s" : ""}</strong> overdue — review in the Lending section.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        {/* Revenue chart */}
        <div className="xl:col-span-2 bg-card border border-card-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-foreground">Revenue</h3>
              <p className="text-muted-foreground text-xs mt-0.5">Last 6 months</p>
            </div>
            <Badge variant="success">+12% MoM</Badge>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={MONTHLY_REVENUE}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1A4A7C" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#1A4A7C" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#6b7280" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
              <Tooltip
                formatter={(v: number) => [`EGP ${v.toLocaleString()}`, "Revenue"]}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
              />
              <Area type="monotone" dataKey="revenue" stroke="#1A4A7C" strokeWidth={2} fill="url(#revenueGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Subject breakdown */}
        <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm">
          <h3 className="font-semibold text-foreground mb-1">Sales by Subject</h3>
          <p className="text-muted-foreground text-xs mb-3">Units sold</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={SUBJECT_BREAKDOWN}
                dataKey="count"
                nameKey="subject"
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={75}
                paddingAngle={2}
              >
                {SUBJECT_BREAKDOWN.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => [v.toLocaleString(), "Units"]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent orders */}
      <div className="bg-card border border-card-border rounded-xl shadow-sm">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Recent Orders</h3>
          <Badge variant="neutral">{ORDERS.length} total</Badge>
        </div>
        <div className="divide-y divide-border">
          {recentOrders.map((order) => (
            <div key={order.id} className="px-5 py-3 flex items-center gap-4">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                {order.studentName.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{order.studentName}</p>
                <p className="text-xs text-muted-foreground truncate">{order.bookTitle}</p>
              </div>
              <Badge variant={order.status === "completed" ? "success" : order.status === "refunded" ? "danger" : "warning"}>
                {order.status}
              </Badge>
              <span className="text-sm font-semibold text-foreground tabular-nums shrink-0">
                EGP {order.amount}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
