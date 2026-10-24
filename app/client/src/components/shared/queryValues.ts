// AppKit's JSON format sends every value as a string ("103.81", "false"), whatever the generated
// types say, and a string column holding JSON arrives already parsed. Parse rows before use.
export type RawValue = string | number | boolean | null | object;
export type RawRow = Record<string, RawValue>;

// For queries with no parameters; one shared object, so the hook's params never change identity.
export const NO_PARAMS = {};

export function toText(v: RawValue): string {
  return typeof v === 'string' ? v : JSON.stringify(v);
}

export function toNumber(v: RawValue): number {
  return typeof v === 'number' ? v : Number(v);
}

export function toBoolean(v: RawValue): boolean {
  return v === true || v === 'true';
}

// A missing value arrives as null, or as "" depending on the format; a column left out of the query is undefined.
export function isMissing(v: RawValue | undefined): v is null | undefined | '' {
  return v === undefined || v === null || v === '';
}

export function toNumberOrNull(v: RawValue | undefined): number | null {
  return isMissing(v) ? null : toNumber(v);
}
