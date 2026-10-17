export default function Loading() {
  return <div className="min-h-screen bg-[#f7f1e8] p-8 md:p-16" role="status"><div className="mx-auto max-w-5xl animate-pulse space-y-6"><div className="h-8 w-48 rounded bg-[#e9e4db]" /><div className="h-48 rounded-2xl bg-[#e9e4db]" /><div className="grid grid-cols-3 gap-4">{[1, 2, 3].map(item => <div key={item} className="h-24 rounded-xl bg-[#e9e4db]" />)}</div></div><span className="sr-only">Loading your café workspace…</span></div>;
}
