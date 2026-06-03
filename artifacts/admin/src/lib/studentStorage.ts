import { STUDENTS, type Student } from "@/data/mockData";

export const STORED_STUDENTS_STORAGE_KEY = "warqless_admin_students";

function normalizeStoredStudent(student: Student): Student {
  return {
    ...student,
    booksOwned: Number.isFinite(student.booksOwned) ? student.booksOwned : 0,
    booksBorrowed: Number.isFinite(student.booksBorrowed) ? student.booksBorrowed : 0,
    totalSpent: Number.isFinite(student.totalSpent) ? student.totalSpent : 0,
    devices: Number.isFinite(student.devices) ? student.devices : 0,
    status: student.status === "suspended" ? "suspended" : "active",
  };
}

export function readStoredStudents(): Student[] {
  if (typeof window === "undefined") return STUDENTS.map(normalizeStoredStudent);

  try {
    const raw = window.localStorage.getItem(STORED_STUDENTS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) && parsed.length > 0
      ? parsed.map(normalizeStoredStudent)
      : STUDENTS.map(normalizeStoredStudent);
  } catch {
    return STUDENTS.map(normalizeStoredStudent);
  }
}

export function saveStoredStudents(students: Student[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORED_STUDENTS_STORAGE_KEY, JSON.stringify(students));
}
