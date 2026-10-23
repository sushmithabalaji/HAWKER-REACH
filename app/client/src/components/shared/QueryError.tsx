// A query that failed, shown where its result would have been.
export function QueryError({ error, what }: { error: string; what?: string }) {
  return (
    <div className="text-destructive bg-destructive/10 p-3 rounded-md text-sm">
      {what ? `${what} didn't load: ` : 'Error: '}
      {error}
    </div>
  );
}
