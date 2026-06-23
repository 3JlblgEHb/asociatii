export function unwrapRelation<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export function extractEmails(
  members: { users_profiles: { email: string } | { email: string }[] | null }[]
): string[] {
  return members
    .map((m) => unwrapRelation(m.users_profiles)?.email)
    .filter((email): email is string => Boolean(email));
}
