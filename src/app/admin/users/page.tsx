import { prisma } from "@/lib/prisma";
import { CreateUserForm } from "./create-user-form";

export default async function AdminUsers() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      memberships: true,
    },
  });

  // Get all venues and brands for the create form dropdowns
  const [venues, brands] = await Promise.all([
    prisma.venue.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.brand.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  // Look up org names for display
  const venueMap = new Map(venues.map((v) => [v.id, v.name]));
  const brandMap = new Map(brands.map((b) => [b.id, b.name]));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl font-bold">Users</h1>
        <span className="text-sm text-gray-400">{users.length} total</span>
      </div>

      {/* Create user form */}
      <CreateUserForm
        venues={venues}
        brands={brands}
      />

      {/* User list */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
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
