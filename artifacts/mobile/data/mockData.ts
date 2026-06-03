export type BookType =
  | "revision"
  | "textbook"
  | "workbook"
  | "question_bank"
  | "exam_prep"
  | "bundle";

export type BookStatus = "published" | "draft" | "pending";

export interface Book {
  id: string;
  title: string;
  publisherId?: string;
  publisher: string;
  subject: string;
  grade: string;
  academicYear: string;
  price: number;
  originalPrice?: number;
  couponCode?: string;
  discountPct?: number;
  discountResponsibility?: "platform" | "publisher" | "shared";
  description: string;
  pages: number;
  type: BookType;
  lendingEnabled: boolean;
  rating: number;
  reviewCount: number;
  coverGradient: string[];
  coverAccent: string;
  isNew: boolean;
  isPopular: boolean;
  isFeatured: boolean;
  tags: string[];
}

export interface PurchasedBook extends Book {
  purchaseDate: string;
  licenseId: string;
  progress: number;
  lastPage: number;
  lastOpened?: string;
  bookmarkedPages: number[];
}

export interface BorrowedBook extends Book {
  borrowDate: string;
  returnDate: string;
  ownerId: string;
  ownerName: string;
  isLentOut: boolean;
  borrowerName?: string;
}

export const GRADES = [
  "Grade 7",
  "Grade 8",
  "Grade 9",
  "Grade 10",
  "Grade 11",
  "Grade 12",
];

export const SUBJECTS = [
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "Arabic",
  "English",
  "History",
  "Geography",
  "Computer Science",
  "Economics",
];

export const BOOK_TYPES: { label: string; value: BookType }[] = [
  { label: "Revision", value: "revision" },
  { label: "Textbook", value: "textbook" },
  { label: "Workbook", value: "workbook" },
  { label: "Question Bank", value: "question_bank" },
  { label: "Exam Prep", value: "exam_prep" },
  { label: "Bundle", value: "bundle" },
];

export const BOOKS: Book[] = [
  {
    id: "1",
    title: "Mathematics Mastery — Final Revision",
    publisher: "Dar Al-Maaref Publishing",
    subject: "Mathematics",
    grade: "Grade 12",
    academicYear: "2024/2025",
    price: 89,
    originalPrice: 120,
    description:
      "The most comprehensive mathematics revision book for Thanaweya Amma. Covers all topics with solved examples, practice problems, and past exam questions with full explanations.",
    pages: 340,
    type: "revision",
    lendingEnabled: true,
    rating: 4.8,
    reviewCount: 2341,
    coverGradient: ["#1A4A7C", "#0D2D50"],
    coverAccent: "#E8A22C",
    isNew: false,
    isPopular: true,
    isFeatured: true,
    tags: ["bestseller", "exam", "grade-12"],
  },
  {
    id: "2",
    title: "Physics in Depth — Grade 11",
    publisher: "Al-Azhar Educational",
    subject: "Physics",
    grade: "Grade 11",
    academicYear: "2024/2025",
    price: 75,
    description:
      "Deep dive into all Grade 11 physics concepts. Includes interactive diagrams, experiments, and hundreds of MCQ questions for exam preparation.",
    pages: 280,
    type: "textbook",
    lendingEnabled: true,
    rating: 4.6,
    reviewCount: 1208,
    coverGradient: ["#1B4332", "#0A2418"],
    coverAccent: "#52B788",
    isNew: false,
    isPopular: true,
    isFeatured: false,
    tags: ["science", "grade-11"],
  },
  {
    id: "3",
    title: "English Grammar & Composition",
    publisher: "Oxford Egypt",
    subject: "English",
    grade: "Grade 10",
    academicYear: "2024/2025",
    price: 65,
    originalPrice: 80,
    description:
      "Master English grammar and writing skills. Covers all language topics from basic to advanced with comprehensive exercises and answer keys.",
    pages: 220,
    type: "workbook",
    lendingEnabled: false,
    rating: 4.5,
    reviewCount: 876,
    coverGradient: ["#7B2D8B", "#4A1A55"],
    coverAccent: "#E040FB",
    isNew: true,
    isPopular: false,
    isFeatured: true,
    tags: ["language", "grade-10"],
  },
  {
    id: "4",
    title: "Chemistry Question Bank — All Grades",
    publisher: "Science First",
    subject: "Chemistry",
    grade: "Grade 12",
    academicYear: "2024/2025",
    price: 110,
    description:
      "Over 3000 chemistry questions organized by topic and difficulty. Full worked solutions and exam strategies included.",
    pages: 480,
    type: "question_bank",
    lendingEnabled: true,
    rating: 4.9,
    reviewCount: 3102,
    coverGradient: ["#B7410E", "#7A2B0A"],
    coverAccent: "#FF8C42",
    isNew: false,
    isPopular: true,
    isFeatured: true,
    tags: ["bestseller", "science", "grade-12"],
  },
  {
    id: "5",
    title: "Biology Exam Preparation Pack",
    publisher: "Al-Arabiya Sciences",
    subject: "Biology",
    grade: "Grade 12",
    academicYear: "2024/2025",
    price: 95,
    description:
      "Comprehensive exam preparation for Biology. Includes past papers from 10 years, model answers, and exam tips from top teachers.",
    pages: 380,
    type: "exam_prep",
    lendingEnabled: true,
    rating: 4.7,
    reviewCount: 1645,
    coverGradient: ["#155E63", "#0A3D40"],
    coverAccent: "#06B6D4",
    isNew: false,
    isPopular: true,
    isFeatured: false,
    tags: ["exam", "science", "grade-12"],
  },
  {
    id: "6",
    title: "Arabic Language — Complete Study",
    publisher: "Dar Al-Hilal",
    subject: "Arabic",
    grade: "Grade 11",
    academicYear: "2024/2025",
    price: 70,
    description:
      "Everything you need for Arabic Language. Grammar, literature analysis, composition writing, and exam preparation all in one book.",
    pages: 310,
    type: "revision",
    lendingEnabled: true,
    rating: 4.4,
    reviewCount: 921,
    coverGradient: ["#1A1A2E", "#16213E"],
    coverAccent: "#E94560",
    isNew: false,
    isPopular: false,
    isFeatured: false,
    tags: ["arabic", "grade-11"],
  },
  {
    id: "7",
    title: "Computer Science Modern Bundle",
    publisher: "TechEdu Egypt",
    subject: "Computer Science",
    grade: "Grade 10",
    academicYear: "2024/2025",
    price: 130,
    originalPrice: 180,
    description:
      "The complete computer science bundle including programming fundamentals, algorithms, data structures, and practical projects.",
    pages: 540,
    type: "bundle",
    lendingEnabled: false,
    rating: 4.8,
    reviewCount: 445,
    coverGradient: ["#0F0F1A", "#1A1A35"],
    coverAccent: "#7C3AED",
    isNew: true,
    isPopular: false,
    isFeatured: true,
    tags: ["tech", "bundle", "grade-10"],
  },
  {
    id: "8",
    title: "History & Geography — Grades 9-12",
    publisher: "National Knowledge House",
    subject: "History",
    grade: "Grade 9",
    academicYear: "2024/2025",
    price: 60,
    description:
      "A comprehensive guide to Egyptian and World history and geography. Includes maps, timelines, and analytical questions.",
    pages: 260,
    type: "textbook",
    lendingEnabled: true,
    rating: 4.3,
    reviewCount: 612,
    coverGradient: ["#744210", "#4A2A0A"],
    coverAccent: "#D97706",
    isNew: false,
    isPopular: false,
    isFeatured: false,
    tags: ["humanities", "grade-9"],
  },
];

export const MOCK_PURCHASED_BOOKS: PurchasedBook[] = [
  {
    ...BOOKS[0],
    purchaseDate: "2024-09-15",
    licenseId: "LIC-2024-001",
    progress: 68,
    lastPage: 231,
    lastOpened: "2024-12-20",
    bookmarkedPages: [45, 120, 231],
  },
  {
    ...BOOKS[3],
    purchaseDate: "2024-10-01",
    licenseId: "LIC-2024-002",
    progress: 23,
    lastPage: 110,
    lastOpened: "2024-12-18",
    bookmarkedPages: [50, 110],
  },
  {
    ...BOOKS[6],
    purchaseDate: "2024-11-10",
    licenseId: "LIC-2024-003",
    progress: 5,
    lastPage: 27,
    lastOpened: "2024-12-10",
    bookmarkedPages: [],
  },
];

export const MOCK_BORROWED_BOOKS: BorrowedBook[] = [
  {
    ...BOOKS[1],
    borrowDate: "2024-12-15",
    returnDate: "2024-12-29",
    ownerId: "user-123",
    ownerName: "Ahmed Hassan",
    isLentOut: false,
  },
];

export const PUBLISHERS = [
  "Dar Al-Maaref Publishing",
  "Al-Azhar Educational",
  "Oxford Egypt",
  "Science First",
  "Al-Arabiya Sciences",
  "Dar Al-Hilal",
  "TechEdu Egypt",
  "National Knowledge House",
];

export const FEATURED_OFFERS = [
  {
    id: "offer-1",
    title: "Back to School Bundle",
    description: "Get 3 books for the price of 2",
    discount: 33,
    validUntil: "2025-01-31",
    color: "#1A4A7C",
    accentColor: "#E8A22C",
  },
  {
    id: "offer-2",
    title: "Grade 12 Special Pack",
    description: "All Thanaweya Amma books — 25% off",
    discount: 25,
    validUntil: "2025-02-15",
    color: "#B7410E",
    accentColor: "#FF8C42",
  },
];
