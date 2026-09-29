interface EnIsoParams {
  date: Date | null;
}

/** Date Prisma → horodatage ISO de transport (null conservé). */
export function enIsoOuNull({ date }: EnIsoParams): string | null {
  return date === null ? null : date.toISOString();
}
