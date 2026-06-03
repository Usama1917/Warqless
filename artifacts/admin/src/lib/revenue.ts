import type { AdminBook, Order, Publisher, Student } from "@/data/mockData";

const SUBJECT_COLORS = ["#1A4A7C", "#E8A22C", "#10B981", "#8B5CF6", "#EF4444", "#0EA5E9", "#F97316"];

export type MonthlyRevenuePoint = {
  month: string;
  revenue: number;
  orders: number;
};

export function calculateBookStatusCounts(books: Array<Pick<AdminBook, "status">>) {
  return {
    published: books.filter((book) => book.status === "published").length,
    draft: books.filter((book) => book.status === "draft").length,
    suspended: books.filter((book) => book.status === "suspended").length,
  };
}

export function calculatePublishedBooksTrend(books: Array<Pick<AdminBook, "createdAt" | "status">>): number {
  return calculateCumulativeMonthTrend(
    books,
    (book) => book.createdAt,
    (book) => book.status === "published",
  );
}

export function calculateStudentStatusCounts(students: Array<Pick<Student, "status">>) {
  return {
    active: students.filter((student) => student.status === "active").length,
    suspended: students.filter((student) => student.status === "suspended").length,
  };
}

export function calculateActiveStudentsTrend(students: Array<Pick<Student, "joinedAt" | "status">>): number {
  return calculateCumulativeMonthTrend(
    students,
    (student) => student.joinedAt,
    (student) => student.status === "active",
  );
}

export function calculatePublisherStatusCounts(publishers: Array<Pick<Publisher, "status">>) {
  return {
    active: publishers.filter((publisher) => publisher.status === "active").length,
    suspended: publishers.filter((publisher) => publisher.status === "suspended").length,
    total: publishers.length,
  };
}

export function calculateActivePublishersTrend(publishers: Array<Pick<Publisher, "joinedAt" | "status">>): number {
  return calculateCumulativeMonthTrend(
    publishers,
    (publisher) => publisher.joinedAt,
    (publisher) => publisher.status === "active",
  );
}

export function calculateBookRevenue(book: Pick<AdminBook, "price" | "salesCount">): number {
  return book.price * book.salesCount;
}

export function calculateBooksRevenue(books: Array<Pick<AdminBook, "price" | "salesCount">>): number {
  return books.reduce((sum, book) => sum + calculateBookRevenue(book), 0);
}

export function calculateOrderRevenueImpact(order: Pick<Order, "amount" | "status">): number {
  if (order.status === "completed") return order.amount;
  if (order.status === "refunded") return -order.amount;
  return 0;
}

export function calculateCompletedOrderRevenue(orders: Array<Pick<Order, "amount" | "status">>): number {
  return orders
    .filter((order) => order.status === "completed")
    .reduce((sum, order) => sum + order.amount, 0);
}

export function calculateRefundedOrderAmount(orders: Array<Pick<Order, "amount" | "status">>): number {
  return orders
    .filter((order) => order.status === "refunded")
    .reduce((sum, order) => sum + order.amount, 0);
}

export function calculatePercentChange(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - previous) / Math.abs(previous)) * 100);
}

export function calculateCumulativeMonthTrend<T>(
  items: T[],
  getDate: (item: T) => string,
  isIncluded: (item: T) => boolean,
): number {
  const validDates = items
    .map((item) => new Date(getDate(item)))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());

  const latestDate = validDates.at(-1);
  if (!latestDate) return 0;

  const latestMonthStart = new Date(Date.UTC(latestDate.getUTCFullYear(), latestDate.getUTCMonth(), 1));
  const current = items.filter(isIncluded).length;
  const previous = items.filter((item) => {
    const date = new Date(getDate(item));
    return isIncluded(item) && !Number.isNaN(date.getTime()) && date < latestMonthStart;
  }).length;

  return calculatePercentChange(current, previous);
}

export function calculateLatestMonthlyRevenueTrend(monthlyRevenue: Array<Pick<MonthlyRevenuePoint, "revenue">>): number {
  if (monthlyRevenue.length < 2) return 0;
  const current = monthlyRevenue[monthlyRevenue.length - 1]?.revenue ?? 0;
  const previous = monthlyRevenue[monthlyRevenue.length - 2]?.revenue ?? 0;
  return calculatePercentChange(current, previous);
}

export function buildSubjectBreakdown(books: AdminBook[]) {
  const totals = new Map<string, number>();

  for (const book of books) {
    totals.set(book.subject, (totals.get(book.subject) ?? 0) + book.salesCount);
  }

  return Array.from(totals.entries())
    .filter(([, count]) => count > 0)
    .map(([subject, count], index) => ({
      subject,
      count,
      color: SUBJECT_COLORS[index % SUBJECT_COLORS.length],
    }));
}

export function buildMonthlyRevenueFromOrders(orders: Order[], monthCount = 6): MonthlyRevenuePoint[] {
  const sortedDates = orders
    .map((order) => new Date(order.createdAt))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());

  const endDate = sortedDates.at(-1) ?? new Date();
  const months = Array.from({ length: monthCount }, (_, index) => {
    const date = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth() - (monthCount - 1 - index), 1));
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;

    return {
      key,
      month: date.toLocaleString("en-US", { month: "short", timeZone: "UTC" }),
      revenue: 0,
      orders: 0,
    };
  });

  const byKey = new Map(months.map((month) => [month.key, month]));

  for (const order of orders) {
    const date = new Date(order.createdAt);
    if (Number.isNaN(date.getTime())) continue;

    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    const month = byKey.get(key);
    if (!month) continue;

    month.revenue += calculateOrderRevenueImpact(order);
    if (order.status !== "pending") month.orders += 1;
  }

  return months.map(({ key: _key, ...month }) => month);
}
