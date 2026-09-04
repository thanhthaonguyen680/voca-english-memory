// Next.js shows this instantly on navigation while the Server Component above fetches data —
// without it, a click just sits blank/unresponsive until every await resolves. Kept as plain
// status text, not a skeleton, per rule.md's "no complex loading animations" convention.
export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <p className="text-sm text-neutral-500">Đang tải...</p>
    </main>
  );
}
