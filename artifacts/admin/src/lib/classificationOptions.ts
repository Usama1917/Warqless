export const BOOK_CLASSIFICATION_OPTIONS = [
  "term1",
  "term2",
  "full_year",
  "final_revision",
  "question_bank",
  "workbook",
  "exam_preparation",
  "answer_book",
  "other",
] as const;

export type BookClassification = (typeof BOOK_CLASSIFICATION_OPTIONS)[number];

export const DEFAULT_BOOK_CLASSIFICATION: BookClassification = "term1";

export function isBookClassification(value: string): value is BookClassification {
  return BOOK_CLASSIFICATION_OPTIONS.includes(value as BookClassification);
}
