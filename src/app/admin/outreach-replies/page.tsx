import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Central view of every prospect reply received across all venues — adgyn's own
// window into responses. Replies that couldn't be matched to a known prospect
// show as "Unmatched" so they can still be triaged.
export default async function AdminOutreachReplies() {
  const [replies, venues, prospects] = await Promise.all([
    prisma.outreachReply.findMany({ orderBy: { receivedAt: "desc" }, take: 200 }),
    prisma.venue.findMany({ select: { id: true, name: true } }),
    prisma.prospect.findMany({ select: { id: true, businessName: true } }),
  ]);

  const venueName = new Map(venues.map((v) => [v.id, v.name]));
  const prospectName = new Map(prospects.map((p) => [p.id, p.businessName]));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl font-bold">Outreach replies</h1>
        <span className="text-sm text-gray-400">{replies.length} shown</span>
      </div>

      <p className="text-sm text-gray-500 mb-5">
        Responses received to each venue&apos;s{" "}
        <code className="bg-gray-100 px-1 rounded">@adgyn.com</code> outreach
        inbox (Resend inbound webhook). Hosts also see these under the matching
        prospect in their outreach board.
      </p>

      {replies.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-300">
          No replies yet.
        </div>
      ) : (
        <div className="space-y-3">
          {replies.map((r) => (
            <div key={r.id} className="bg-white rounded-2xl shadow-sm p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-medium break-all">{r.fromEmail}</span>
                  {r.prospectId ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                      {prospectName.get(r.prospectId) ?? "Prospect"}
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                      Unmatched
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">
                  {venueName.get(r.venueId) ?? r.toEmail} ·{" "}
                  {r.receivedAt.toLocaleString()}
                </span>
              </div>
              {r.subject && (
                <div className="text-sm text-gray-500 mb-1">{r.subject}</div>
              )}
              {r.text && (
                <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700">
                  {r.text.trim()}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
