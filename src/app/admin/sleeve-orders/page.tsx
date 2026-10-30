import { prisma } from "@/lib/prisma";
import { cents, ORDER_STATUSES, parseExperience } from "@/lib/smart-sleeves";
import { setSleeveOrderStatus } from "./actions";

// Smart Sleeves orders from cafés. No online payment in V1: invoice the café,
// then move the status along — cafés see it on their campaign page.
export default async function AdminSleeveOrders() {
  const orders = await prisma.sleeveOrder.findMany({ orderBy: { createdAt: "desc" }, include: { venue: { select: { name: true } }, experience: { select: { config: true } } } });
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl font-bold">Sleeve orders</h1>
        <span className="text-sm text-gray-400">{orders.length} total</span>
      </div>
      {orders.length === 0 ? (
        <p className="text-sm text-gray-500 bg-white rounded-xl p-6">No sleeve orders yet.</p>
      ) : (
        <div className="bg-white rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500 border-b">
              <tr><th className="p-3">Placed</th><th className="p-3">Café / campaign</th><th className="p-3">Sleeves</th><th className="p-3">Total</th><th className="p-3">Ship to</th><th className="p-3">Status</th></tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b last:border-0 align-top">
                  <td className="p-3 whitespace-nowrap">{order.createdAt.toLocaleDateString()}</td>
                  <td className="p-3"><div className="font-medium">{order.venue.name}</div><div className="text-gray-500">{parseExperience(order.experience.config)?.name}</div></td>
                  <td className="p-3">{order.quantity.toLocaleString()} × {order.size}<div className="text-gray-500">{order.design}</div>{order.instructions && <div className="text-gray-500 mt-1 max-w-xs">“{order.instructions}”</div>}</td>
                  <td className="p-3 whitespace-nowrap">{cents(order.totalCents)}</td>
                  <td className="p-3 whitespace-pre-line text-gray-600">{order.shipTo}</td>
                  <td className="p-3">
                    <form action={setSleeveOrderStatus} className="flex gap-2">
                      <input type="hidden" name="id" value={order.id} />
                      <select name="status" defaultValue={order.status} className="border rounded px-2 py-1">
                        {Object.entries(ORDER_STATUSES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                      <button type="submit" className="px-3 py-1 rounded bg-gray-900 text-white">Save</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
