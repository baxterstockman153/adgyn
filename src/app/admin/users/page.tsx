import { prisma } from "@/lib/prisma";
import { CreateUserForm } from "./create-user-form";
import { InviteForm } from "./invite-form";

export default async function AdminUsers() {
  const [users, venues, brands, invites] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: { memberships: true },
    }),
    prisma.venue.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.brand.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.invite.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  // Look up org names for display
  const venueMap = new Map(venues.map((v) => [v.id, v.name]));
  const brandMap = new Map(brands.map((b) => [b.id, b.name]));

  const now = new Date();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl font-bold">Users & Invites</h1>
        <span className="text-sm text-gray-400">{users.length} users</span>
      </div>

      {/* Invite form */}
      <InviteForm venues={venues} brands={brands} />

      {/* Pending invites */}
      {invites.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
          <div className="px-4 py-3 border-b border-gray-50">
            <h3 className="text-sm font-medium text-gray-500">
              Invite Links
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs text-gray-400 uppercase tracking-wider">
                  <th className="px-4 py-2">For</th>
                  <th className="px-4 py-2">Type</th>
                  <th className="px-4 py-2">Role</th>
                  <th className="px-4 py-2">Email Lock</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {invites.map((inv) => {
                  const orgName =
                    inv.orgType === "venue"
                      ? venueMap.get(inv.orgId)
                      : brandMap.get(inv.orgId);
                  const isExpired = inv.expiresAt < now;
                  const isUsed = !!inv.usedAt;
                  const status = isUsed
                    ? "used"
                    : isExpired
                    ? "expired"
                    : "active";

                  return (
                    <tr key={inv.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium">
                        {orgName || inv.orgId}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            inv.orgType === "venue"
                              ? "bg-blue-50 text-blue-600"
                              : "bg-orange-50 text-orange-600"
                          }`}
                        >
                          {inv.orgType}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-500">
                        {inv.role}
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-400">
                        {inv.email || "—"}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            status === "active"
                              ? "bg-green-50 text-green-700"
                              : status === "used"
                              ? "bg-gray-100 text-gray-500"
                              : "bg-red-50 text-red-500"
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        {status === "active" ? (
                          <code className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">
                            /invite/{inv.token.slice(0, 8)}…
                          </code>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Manual user creation */}
      <details className="mb-6">
        <summary className="text-sm text-gray-400 cursor-pointer hover:text-gray-600">
          Manual user creation (advanced)
        </summary>
        <div className="mt-2">
          <CreateUserForm venues={venues} brands={brands} />
        </div>
      </details>

      {/* User list */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-50">
          <h3 className="text-sm font-medium text-gray-500">All Users</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs text-gray-400 uppercase tracking-wider">
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Roles</th>
                <th className="px-4 py-3">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-medium">{u.email}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {u.name || <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {u.memberships.map((m) => {
                        const orgName =
                          m.orgType === "venue"
                            ? venueMap.get(m.orgId)
                            : brandMap.get(m.orgId);
                        return (
                          <span
                            key={m.id}
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              m.orgType === "venue"
                                ? "bg-blue-50 text-blue-600"
                                : "bg-orange-50 text-orange-600"
                            }`}
                          >
                            {m.orgType}: {orgName || m.orgId}
                            <span className="text-[10px] opacity-50 ml-1">
                              ({m.role})
                            </span>
                          </span>
                        );
                      })}
                      {u.memberships.length === 0 && (
                        <span className="text-xs text-gray-300">No roles</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {u.createdAt.toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
