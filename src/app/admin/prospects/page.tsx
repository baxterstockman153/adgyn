import { prisma } from "@/lib/prisma";
import { outreachEnabled } from "@/lib/features";
import { createProspect, deleteProspect } from "../actions";

export const dynamic = "force-dynamic";

const STATUS_CHIP: Record<string, string> = {
  new: "bg-gray-100 text-gray-600",
  contacted: "bg-blue-100 text-blue-700",
  interested: "bg-purple-100 text-purple-700",
  won: "bg-green-100 text-green-700",
  lost: "bg-red-100 text-red-600",
};

export default async function AdminProspects() {
  const [venues, prospects] = await Promise.all([
    prisma.venue.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.prospect.findMany({
      orderBy: [{ venueId: "asc" }, { createdAt: "desc" }],
    }),
  ]);

  const venueName = new Map(venues.map((v) => [v.id, v.name]));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl font-bold">Prospects</h1>
        <span className="text-sm text-gray-400">{prospects.length} total</span>
      </div>

      <p className="text-sm text-gray-500 mb-5">
        Outreach leads shown to hosts. The module is feature-flagged per venue —
        add a venue in <code className="bg-gray-100 px-1 rounded">features.ts</code>{" "}
        to switch it on for them.
      </p>

      {/* Add prospect */}
      <form
        action={createProspect}
        className="bg-white rounded-xl shadow-sm p-4 mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
      >
        <Field label="Venue" required>
          <select
            name="venueId"
            required
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
          >
            {venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
                {outreachEnabled(v.id) ? "" : " (outreach off)"}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Business name" required>
          <input name="businessName" required placeholder="Gabby's Good Dogs" className={inputCls} />
        </Field>
        <Field label="Contact name">
          <input name="contactName" placeholder="Jane Doe" className={inputCls} />
        </Field>
        <Field label="Contact title">
          <input name="contactTitle" placeholder="Owner" className={inputCls} />
        </Field>
        <Field label="Email">
          <input name="email" type="email" placeholder="jane@example.com" className={inputCls} />
        </Field>
        <Field label="Phone">
          <input name="phone" placeholder="(925) 555-1234" className={inputCls} />
        </Field>
        <Field label="Website">
          <input name="website" placeholder="example.com" className={inputCls} />
        </Field>
        <Field label="Address">
          <input name="address" placeholder="123 Main St" className={inputCls} />
        </Field>
        <Field label="City">
          <input name="city" placeholder="Walnut Creek" className={inputCls} />
        </Field>
        <div className="sm:col-span-2 lg:col-span-3">
          <label className="block text-xs text-gray-400 mb-1">
            Outreach message <span className="text-gray-300">(optional — host sees a template if blank)</span>
          </label>
          <textarea
            name="outreachMessage"
            rows={2}
            placeholder="Custom pitch for this prospect…"
            className={inputCls}
          />
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <button
            type="submit"
            className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            + Add Prospect
          </button>
        </div>
      </form>

      {/* Prospect table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs text-gray-400 uppercase tracking-wider">
                <th className="px-4 py-3">Business</th>
                <th className="px-4 py-3">Venue</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {prospects.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-300">
                    No prospects yet.
                  </td>
                </tr>
              ) : (
                prospects.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium">{p.businessName}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {venueName.get(p.venueId) ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {p.contactName || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 break-all">
                      {p.email || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_CHIP[p.status]}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <form action={deleteProspect}>
                        <input type="hidden" name="id" value={p.id} />
                        <button
                          type="submit"
                          className="text-xs text-gray-300 hover:text-red-500 transition-colors"
                        >
                          Delete
                        </button>
                      </form>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1">
        {label}
        {required && <span className="text-red-400"> *</span>}
      </label>
      {children}
    </div>
  );
}
