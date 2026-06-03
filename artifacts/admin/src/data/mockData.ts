export type AdminRole = "admin" | "publisher";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  phoneVerified?: boolean;
  phoneVerifiedAt?: string;
  twoFactorEnabled?: boolean;
  twoFactorEnabledAt?: string;
  role: AdminRole;
  publisherId?: string;
}

export interface Publisher {
  id: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  booksCount: number;
  totalRevenue: number;
  status: "active" | "suspended";
  joinedAt: string;
}

export interface AdminBook {
  id: string;
  title: string;
  publisherId: string;
  publisher: string;
  subject: string;
  classification: string;
  grade: string;
  type: string;
  price: number;
  originalPrice?: number;
  status: "published" | "draft" | "suspended";
  salesCount: number;
  totalRevenue: number;
  rating: number;
  lendingEnabled: boolean;
  createdAt: string;
}

export interface Student {
  id: string;
  name: string;
  email: string;
  phone?: string;
  phoneVerified?: boolean;
  phoneVerifiedAt?: string;
  grade: string;
  booksOwned: number;
  booksBorrowed: number;
  totalSpent: number;
  devices: number;
  joinedAt: string;
  status: "active" | "suspended";
  currentDevice?: StudentDevice;
  deviceHistory?: StudentDevice[];
  deviceChangeRequests?: DeviceChangeRequest[];
  securityEvents?: StudentSecurityEvent[];
  coupons?: StudentCoupons;
  auth?: StudentAuthSummary;
}

export interface StudentDevice {
  deviceId: string;
  maskedDeviceId: string;
  platform: string;
  osVersion?: string;
  appVersion?: string;
  deviceName?: string;
  registeredAt: string;
  lastVerifiedAt: string;
  status: "active" | "blocked" | "pending_reset";
}

export interface DeviceChangeRequest {
  id: string;
  deviceId: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  resolvedAt?: string;
}

export interface StudentSecurityEvent {
  id: string;
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  deviceId: string;
  message: string;
  createdAt: string;
  metadata?: Record<string, string>;
}

export interface StudentCoupon {
  code: string;
  status: "used" | "unused";
  bookId?: string;
  bookTitle?: string;
  discountPct?: number;
  discountResponsibility?: "platform" | "publisher" | "shared";
  usedAt?: string;
}

export interface StudentCoupons {
  used: StudentCoupon[];
  unused: StudentCoupon[];
}

export interface StudentAuthSummary {
  authProvider: "email_password_demo";
  passwordSet: boolean;
  passwordHashStored: boolean;
  passwordLastChangedAt?: string;
  lastLoginAt?: string;
  failedLoginAttempts: number;
  note: string;
}

export interface Order {
  id: string;
  studentId: string;
  studentName: string;
  bookId: string;
  bookTitle: string;
  publisherId: string;
  publisher: string;
  amount: number;
  status: "completed" | "refunded" | "pending";
  createdAt: string;
  couponCode?: string;
  discountAmount?: number;
}

export interface LendingRecord {
  id: string;
  bookId: string;
  bookTitle: string;
  ownerId: string;
  ownerName: string;
  borrowerId: string;
  borrowerName: string;
  lentAt: string;
  dueAt: string;
  returnedAt?: string;
  status: "active" | "returned" | "overdue";
}

export const PUBLISHERS: Publisher[] = [
  {
    id: "p1",
    name: "Dar Al-Ma'aref",
    email: "admin@darmaref.eg",
    phone: "+20 2 2345 6789",
    country: "Egypt",
    booksCount: 48,
    totalRevenue: 184320,
    status: "active",
    joinedAt: "2024-01-15",
  },
  {
    id: "p2",
    name: "Al-Shorouk Publishers",
    email: "books@shorouk.com",
    phone: "+20 2 3456 7890",
    country: "Egypt",
    booksCount: 32,
    totalRevenue: 97600,
    status: "active",
    joinedAt: "2024-02-20",
  },
  {
    id: "p3",
    name: "Merit Publishing",
    email: "info@meritpub.eg",
    phone: "+20 2 4567 8901",
    country: "Egypt",
    booksCount: 19,
    totalRevenue: 56800,
    status: "active",
    joinedAt: "2024-03-10",
  },
  {
    id: "p4",
    name: "Arab Science Publishers",
    email: "contact@arabsci.com",
    phone: "+966 11 456 7890",
    country: "Saudi Arabia",
    booksCount: 27,
    totalRevenue: 123400,
    status: "active",
    joinedAt: "2024-04-05",
  },
  {
    id: "p5",
    name: "Nile Educational Press",
    email: "info@nilepress.eg",
    phone: "+20 2 5678 9012",
    country: "Egypt",
    booksCount: 14,
    totalRevenue: 38200,
    status: "suspended",
    joinedAt: "2024-05-18",
  },
];

export const BOOKS: AdminBook[] = [
  {
    id: "b1",
    title: "Mathematics Grade 10 — Thanawy",
    publisherId: "p1",
    publisher: "Dar Al-Ma'aref",
    subject: "Mathematics",
    classification: "term1",
    grade: "Grade 10",
    type: "Textbook",
    price: 89,
    originalPrice: 120,
    status: "published",
    salesCount: 1842,
    totalRevenue: 163938,
    rating: 4.8,
    lendingEnabled: true,
    createdAt: "2024-02-01",
  },
  {
    id: "b2",
    title: "Physics Explained — Grade 11",
    publisherId: "p2",
    publisher: "Al-Shorouk Publishers",
    subject: "Physics",
    classification: "term1",
    grade: "Grade 11",
    type: "Textbook",
    price: 79,
    status: "published",
    salesCount: 1124,
    totalRevenue: 88796,
    rating: 4.6,
    lendingEnabled: true,
    createdAt: "2024-02-15",
  },
  {
    id: "b3",
    title: "Arabic Language & Literature",
    publisherId: "p1",
    publisher: "Dar Al-Ma'aref",
    subject: "Arabic",
    classification: "term1",
    grade: "Grade 9",
    type: "Textbook",
    price: 65,
    status: "published",
    salesCount: 2310,
    totalRevenue: 150150,
    rating: 4.9,
    lendingEnabled: false,
    createdAt: "2024-01-20",
  },
  {
    id: "b4",
    title: "Chemistry Workbook — Grade 12",
    publisherId: "p3",
    publisher: "Merit Publishing",
    subject: "Chemistry",
    classification: "workbook",
    grade: "Grade 12",
    type: "Workbook",
    price: 55,
    status: "published",
    salesCount: 756,
    totalRevenue: 41580,
    rating: 4.4,
    lendingEnabled: true,
    createdAt: "2024-03-05",
  },
  {
    id: "b5",
    title: "Biology: Life Sciences",
    publisherId: "p4",
    publisher: "Arab Science Publishers",
    subject: "Biology",
    classification: "term1",
    grade: "Grade 10",
    type: "Textbook",
    price: 95,
    originalPrice: 130,
    status: "published",
    salesCount: 983,
    totalRevenue: 93385,
    rating: 4.7,
    lendingEnabled: true,
    createdAt: "2024-04-12",
  },
  {
    id: "b6",
    title: "English Grammar Mastery",
    publisherId: "p2",
    publisher: "Al-Shorouk Publishers",
    subject: "English",
    classification: "full_year",
    grade: "Grade 8",
    type: "Practice",
    price: 45,
    status: "draft",
    salesCount: 0,
    totalRevenue: 0,
    rating: 0,
    lendingEnabled: false,
    createdAt: "2024-09-01",
  },
  {
    id: "b7",
    title: "History of Arab Civilizations",
    publisherId: "p5",
    publisher: "Nile Educational Press",
    subject: "History",
    classification: "final_revision",
    grade: "Grade 11",
    type: "Textbook",
    price: 72,
    status: "suspended",
    salesCount: 234,
    totalRevenue: 16848,
    rating: 4.1,
    lendingEnabled: true,
    createdAt: "2024-05-20",
  },
];

export const STUDENTS: Student[] = [
  {
    id: "s1",
    name: "Ahmed Hassan",
    email: "ahmed@student.eg",
    grade: "Grade 11",
    booksOwned: 8,
    booksBorrowed: 2,
    totalSpent: 640,
    devices: 2,
    joinedAt: "2024-01-10",
    status: "active",
  },
  {
    id: "s2",
    name: "Nour El-Din Sara",
    email: "nour@student.eg",
    grade: "Grade 10",
    booksOwned: 5,
    booksBorrowed: 1,
    totalSpent: 395,
    devices: 1,
    joinedAt: "2024-02-05",
    status: "active",
  },
  {
    id: "s3",
    name: "Omar Khalil",
    email: "omar@student.eg",
    grade: "Grade 12",
    booksOwned: 12,
    booksBorrowed: 0,
    totalSpent: 980,
    devices: 3,
    joinedAt: "2024-01-22",
    status: "active",
  },
  {
    id: "s4",
    name: "Fatma Rashid",
    email: "fatma@student.eg",
    grade: "Grade 9",
    booksOwned: 4,
    booksBorrowed: 3,
    totalSpent: 260,
    devices: 1,
    joinedAt: "2024-03-14",
    status: "active",
  },
  {
    id: "s5",
    name: "Yousef Ibrahim",
    email: "yousef@student.eg",
    grade: "Grade 10",
    booksOwned: 1,
    booksBorrowed: 1,
    totalSpent: 89,
    devices: 2,
    joinedAt: "2024-08-30",
    status: "suspended",
  },
];

export const ORDERS: Order[] = [
  {
    id: "o1",
    studentId: "s1",
    studentName: "Ahmed Hassan",
    bookId: "b1",
    bookTitle: "Mathematics Grade 10 — Thanawy",
    publisherId: "p1",
    publisher: "Dar Al-Ma'aref",
    amount: 89,
    status: "completed",
    createdAt: "2024-09-02T10:30:00Z",
  },
  {
    id: "o2",
    studentId: "s2",
    studentName: "Nour El-Din Sara",
    bookId: "b2",
    bookTitle: "Physics Explained — Grade 11",
    publisherId: "p2",
    publisher: "Al-Shorouk Publishers",
    amount: 79,
    status: "completed",
    createdAt: "2024-09-05T14:15:00Z",
  },
  {
    id: "o3",
    studentId: "s3",
    studentName: "Omar Khalil",
    bookId: "b5",
    bookTitle: "Biology: Life Sciences",
    publisherId: "p4",
    publisher: "Arab Science Publishers",
    amount: 95,
    status: "completed",
    createdAt: "2024-09-08T09:00:00Z",
  },
  {
    id: "o4",
    studentId: "s1",
    studentName: "Ahmed Hassan",
    bookId: "b3",
    bookTitle: "Arabic Language & Literature",
    publisherId: "p1",
    publisher: "Dar Al-Ma'aref",
    amount: 65,
    status: "completed",
    createdAt: "2024-09-10T16:45:00Z",
  },
  {
    id: "o5",
    studentId: "s4",
    studentName: "Fatma Rashid",
    bookId: "b4",
    bookTitle: "Chemistry Workbook — Grade 12",
    publisherId: "p3",
    publisher: "Merit Publishing",
    amount: 55,
    status: "refunded",
    createdAt: "2024-09-12T11:20:00Z",
  },
  {
    id: "o6",
    studentId: "s5",
    studentName: "Yousef Ibrahim",
    bookId: "b1",
    bookTitle: "Mathematics Grade 10 — Thanawy",
    publisherId: "p1",
    publisher: "Dar Al-Ma'aref",
    amount: 89,
    status: "completed",
    createdAt: "2024-09-15T08:30:00Z",
  },
];

export const LENDING_RECORDS: LendingRecord[] = [
  {
    id: "l1",
    bookId: "b1",
    bookTitle: "Mathematics Grade 10 — Thanawy",
    ownerId: "s1",
    ownerName: "Ahmed Hassan",
    borrowerId: "s2",
    borrowerName: "Nour El-Din Sara",
    lentAt: "2024-09-10T12:00:00Z",
    dueAt: "2024-09-24T12:00:00Z",
    status: "active",
  },
  {
    id: "l2",
    bookId: "b5",
    bookTitle: "Biology: Life Sciences",
    ownerId: "s3",
    ownerName: "Omar Khalil",
    borrowerId: "s4",
    borrowerName: "Fatma Rashid",
    lentAt: "2024-09-01T09:00:00Z",
    dueAt: "2024-09-15T09:00:00Z",
    returnedAt: "2024-09-14T15:30:00Z",
    status: "returned",
  },
  {
    id: "l3",
    bookId: "b2",
    bookTitle: "Physics Explained — Grade 11",
    ownerId: "s2",
    ownerName: "Nour El-Din Sara",
    borrowerId: "s5",
    borrowerName: "Yousef Ibrahim",
    lentAt: "2024-09-01T08:00:00Z",
    dueAt: "2024-09-08T08:00:00Z",
    status: "overdue",
  },
];

export const MONTHLY_REVENUE = [
  { month: "Apr", revenue: 28400, orders: 312 },
  { month: "May", revenue: 34200, orders: 378 },
  { month: "Jun", revenue: 41800, orders: 456 },
  { month: "Jul", revenue: 38500, orders: 420 },
  { month: "Aug", revenue: 52300, orders: 571 },
  { month: "Sep", revenue: 67900, orders: 738 },
];

export const SUBJECT_BREAKDOWN = [
  { subject: "Mathematics", count: 1842, color: "#1A4A7C" },
  { subject: "Arabic", count: 2310, color: "#E8A22C" },
  { subject: "Physics", count: 1124, color: "#10B981" },
  { subject: "Biology", count: 983, color: "#8B5CF6" },
  { subject: "Chemistry", count: 756, color: "#EF4444" },
];

export const MOCK_ADMIN: AdminUser = {
  id: "admin1",
  name: "Karim Mansour",
  email: "karim@warqless.com",
  role: "admin",
};
