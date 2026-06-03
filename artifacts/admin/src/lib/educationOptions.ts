export const EDUCATION_STAGE_GROUPS = [
  {
    id: "primary",
    levels: ["primary_1", "primary_2", "primary_3", "primary_4", "primary_5", "primary_6"],
  },
  {
    id: "preparatory",
    levels: ["preparatory_1", "preparatory_2", "preparatory_3"],
  },
  {
    id: "secondary",
    levels: ["secondary_1", "secondary_2", "secondary_3"],
  },
  {
    id: "technical_secondary",
    levels: ["technical_secondary_1", "technical_secondary_2", "technical_secondary_3"],
  },
] as const;

export type EducationStageGroup = (typeof EDUCATION_STAGE_GROUPS)[number]["id"];
export type EducationStageLevel = (typeof EDUCATION_STAGE_GROUPS)[number]["levels"][number];

export const EDUCATION_STAGE_LEVELS = EDUCATION_STAGE_GROUPS.flatMap((group) => group.levels);
export const DEFAULT_EDUCATION_STAGE = EDUCATION_STAGE_LEVELS[0];

export function isEducationStageLevel(value: string): value is EducationStageLevel {
  return EDUCATION_STAGE_LEVELS.includes(value as EducationStageLevel);
}
