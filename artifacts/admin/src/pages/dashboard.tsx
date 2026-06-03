import {
  BadgeMinus,
  BadgePlus,
  BookOpen,
  BookPlus,
  BookX,
  Building2,
  UserMinus,
  UserPlus,
  Users,
  ShoppingCart,
  Minus,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { useState } from "react";
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
  STUDENTS,
  ORDERS,
  LENDING_RECORDS,
  MONTHLY_REVENUE,
} from "@/data/mockData";
import { useAuth } from "@/context/AuthContext";
import { useAdminLanguage } from "@/context/AdminLanguageContext";
import {
  buildMonthlyRevenueFromOrders,
  buildSubjectBreakdown,
  calculateActivePublishersTrend,
  calculateActiveStudentsTrend,
  calculateBookStatusCounts,
  calculateBooksRevenue,
  calculateCumulativeMonthTrend,
  calculateLatestMonthlyRevenueTrend,
  calculatePublisherStatusCounts,
  calculatePublishedBooksTrend,
  calculateStudentStatusCounts,
} from "@/lib/revenue";
import { readStoredBooks } from "@/lib/bookStorage";
import { readVisiblePublishers } from "@/lib/publisherStorage";

function getRevenueTrendVisual(trend: number) {
  if (trend > 0) {
    return {
      icon: TrendingUp,
      iconColor: "text-emerald-600",
      iconBg: "bg-emerald-50",
    };
  }

  if (trend < 0) {
    return {
      icon: TrendingDown,
      iconColor: "text-red-600",
      iconBg: "bg-red-50",
    };
  }

  return {
    icon: Minus,
    iconColor: "text-muted-foreground",
    iconBg: "bg-muted",
  };
}

function getPublishedBooksTrendVisual(trend: number) {
  if (trend > 0) {
    return {
      icon: BookPlus,
      iconColor: "text-emerald-600",
      iconBg: "bg-emerald-50",
    };
  }

  if (trend < 0) {
    return {
      icon: BookX,
      iconColor: "text-red-600",
      iconBg: "bg-red-50",
    };
  }

  return {
    icon: BookOpen,
    iconColor: "text-accent",
    iconBg: "bg-accent/10",
  };
}

function getActiveStudentsTrendVisual(trend: number) {
  if (trend > 0) {
    return {
      icon: UserPlus,
      iconColor: "text-emerald-600",
      iconBg: "bg-emerald-50",
    };
  }

  if (trend < 0) {
    return {
      icon: UserMinus,
      iconColor: "text-red-600",
      iconBg: "bg-red-50",
    };
  }

  return {
    icon: Users,
    iconColor: "text-emerald-600",
    iconBg: "bg-emerald-50",
  };
}

function getPublishersTrendVisual(trend: number) {
  if (trend > 0) {
    return {
      icon: BadgePlus,
      iconColor: "text-emerald-600",
      iconBg: "bg-emerald-50",
    };
  }

  if (trend < 0) {
    return {
      icon: BadgeMinus,
      iconColor: "text-red-600",
      iconBg: "bg-red-50",
    };
  }

  return {
    icon: Building2,
    iconColor: "text-purple-600",
    iconBg: "bg-purple-50",
  };
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { t, formatCurrency, formatNumber } = useAdminLanguage();
  const [storedBooks] = useState(readStoredBooks);
  const [visiblePublishers] = useState(readVisiblePublishers);
  const isAdmin = user?.role === "admin";
  const scopedBooks = isAdmin
    ? storedBooks
    : storedBooks.filter((b) => b.publisherId === user?.publisherId);
  const scopedOrders = isAdmin
    ? ORDERS
    : ORDERS.filter((o) => o.publisherId === user?.publisherId);

  const monthlyRevenue = isAdmin ? MONTHLY_REVENUE : buildMonthlyRevenueFromOrders(scopedOrders);
  const revenueTrend = calculateLatestMonthlyRevenueTrend(monthlyRevenue);
  const revenueTrendVisual = getRevenueTrendVisual(revenueTrend);
  const totalRevenue = calculateBooksRevenue(scopedBooks);
  const bookStatusCounts = calculateBookStatusCounts(scopedBooks);
  const publishedBooksTrend = calculatePublishedBooksTrend(scopedBooks);
  const publishedBooksTrendVisual = getPublishedBooksTrendVisual(publishedBooksTrend);
  const studentStatusCounts = calculateStudentStatusCounts(STUDENTS);
  const activeStudentsTrend = calculateActiveStudentsTrend(STUDENTS);
  const activeStudentsTrendVisual = getActiveStudentsTrendVisual(activeStudentsTrend);
  const publisherStatusCounts = calculatePublisherStatusCounts(visiblePublishers);
  const publishersTrend = calculateActivePublishersTrend(visiblePublishers);
  const publishersTrendVisual = getPublishersTrendVisual(publishersTrend);
  const overdueLending = isAdmin
    ? LENDING_RECORDS.filter((record) => record.status === "overdue").length
    : 0;
  const recentOrders = scopedOrders.slice().reverse().slice(0, 5);
  const subjectBreakdown = buildSubjectBreakdown(scopedBooks);
  const ordersTrend = calculateCumulativeMonthTrend(
    scopedOrders,
    (order) => order.createdAt,
    () => true,
  );

  return (
    <div className="p-6">
      <PageHeader
        title={t.dashboard.title}
        subtitle={t.dashboard.subtitle(user?.name ?? "")}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard
          title={t.dashboard.totalRevenue}
          value={formatCurrency(totalRevenue)}
          subtitle={t.dashboard.totalRevenueDesc(isAdmin)}
          icon={revenueTrendVisual.icon}
          trend={revenueTrend}
          iconColor={revenueTrendVisual.iconColor}
          iconBg={revenueTrendVisual.iconBg}
        />
        <StatCard
          title={t.dashboard.publishedBooks}
          value={bookStatusCounts.published}
          subtitle={t.dashboard.draftsPending(bookStatusCounts.draft)}
          icon={publishedBooksTrendVisual.icon}
          trend={publishedBooksTrend}
          iconColor={publishedBooksTrendVisual.iconColor}
          iconBg={publishedBooksTrendVisual.iconBg}
        />
        {isAdmin ? (
          <>
            <StatCard
              title={t.dashboard.activeStudents}
              value={formatNumber(studentStatusCounts.active)}
              subtitle={t.dashboard.suspendedStudents(studentStatusCounts.suspended)}
              icon={activeStudentsTrendVisual.icon}
              trend={activeStudentsTrend}
              iconColor={activeStudentsTrendVisual.iconColor}
              iconBg={activeStudentsTrendVisual.iconBg}
            />
            <StatCard
              title={t.dashboard.publishers}
              value={publisherStatusCounts.active}
              subtitle={t.dashboard.registeredPublishers(publisherStatusCounts.total)}
              icon={publishersTrendVisual.icon}
              trend={publishersTrend}
              iconColor={publishersTrendVisual.iconColor}
              iconBg={publishersTrendVisual.iconBg}
            />
          </>
        ) : (
          <>
            <StatCard
              title={t.common.orders}
              value={scopedOrders.length}
              subtitle={t.dashboard.allTime}
              icon={ShoppingCart}
              trend={ordersTrend}
              iconColor="text-emerald-600"
              iconBg="bg-emerald-50"
            />
          </>
        )}
      </div>

      {/* Overdue alert */}
      {overdueLending > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6 text-sm">
          <AlertTriangle size={16} className="text-amber-600 shrink-0" />
          <span className="text-amber-800">
            <strong>{t.dashboard.overdueAlert(overdueLending)}</strong>
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        {/* Revenue chart */}
        <div className="xl:col-span-2 bg-card border border-card-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-foreground">{t.dashboard.revenueChart}</h3>
              <p className="text-muted-foreground text-xs mt-0.5">{t.common.last6Months}</p>
            </div>
            <Badge variant={revenueTrend < 0 ? "danger" : revenueTrend > 0 ? "success" : "neutral"}>
              {revenueTrend > 0 ? "+" : ""}{revenueTrend}% {t.dashboard.monthOverMonth}
            </Badge>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={monthlyRevenue}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1A4A7C" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#1A4A7C" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#6b7280" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${formatNumber(Number(v) / 1000)}K`} />
              <Tooltip
                formatter={(v: number) => [formatCurrency(v), t.common.revenue]}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
              />
              <Area type="monotone" dataKey="revenue" stroke="#1A4A7C" strokeWidth={2} fill="url(#revenueGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Subject breakdown */}
        <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm">
          <h3 className="font-semibold text-foreground mb-1">{t.dashboard.subjectBreakdown}</h3>
          <p className="text-muted-foreground text-xs mb-3">{t.dashboard.unitsSold}</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={subjectBreakdown}
                dataKey="count"
                nameKey="subject"
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={75}
                paddingAngle={2}
              >
                {subjectBreakdown.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => [formatNumber(v), t.common.units]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent orders */}
      <div className="bg-card border border-card-border rounded-xl shadow-sm">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold text-foreground">{t.dashboard.recentOrders}</h3>
          <Badge variant="neutral">{scopedOrders.length} {t.common.total}</Badge>
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
                {t.common[order.status]}
              </Badge>
              <span className="text-sm font-semibold text-foreground tabular-nums shrink-0">
                {formatCurrency(order.amount)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
