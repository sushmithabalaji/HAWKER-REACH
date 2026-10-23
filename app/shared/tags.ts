// Every number shown in the app carries one of these (CLAUDE.md, team rules).
export const TAGS = ['MEASURED', 'MODELLED', 'ASSUMPTION'] as const;
export type Tag = (typeof TAGS)[number];

export function isTag(value: string): value is Tag {
  return (TAGS as readonly string[]).includes(value);
}
