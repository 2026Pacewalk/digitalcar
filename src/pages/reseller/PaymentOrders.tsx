import ResponsiveDashboardLayout from "@/components/layout/ResponsiveDashboardLayout";
import TopBar from "@/components/layout/TopBar";
import { trpc } from "@/providers/trpc";
import {
  SummaryCards, FilterBar, OrdersTable, OrderDrawer, downloadOrdersCsv, computeStats, useOrderTable,
  type PaymentOrderRow,
} from "@/components/payments/orderUi";

/* Reseller view: read-only list of THEIR OWN customers' payment orders. Resellers
   can't verify/reject (that's admin) — they get visibility, filters, and export. */
export default function ResellerPaymentOrders() {
  const { data: orders } = trpc.payment.resellerOrders.useQuery();
  const { filters, setFilters, filtered, selected, setSelected } = useOrderTable(orders as PaymentOrderRow[] | undefined);
  const stats = computeStats((orders as PaymentOrderRow[]) || []);

  return (
    <ResponsiveDashboardLayout>
      <div className="hidden md:block"><TopBar title="Payment Orders" subtitle="Payments from your customers — track revenue and status" /></div>
      <div className="p-4 sm:p-6 space-y-5">
        <p className="text-sm text-[#64748B]">{filtered.length} of {orders?.length ?? 0} orders</p>

        <SummaryCards stats={stats} />

        <FilterBar filters={filters} setFilters={setFilters} count={filtered.length}
          onExport={() => downloadOrdersCsv(filtered, `my-customer-payments-${new Date().toISOString().slice(0, 10)}.csv`)} />

        <OrdersTable list={filtered} onRow={setSelected} />
      </div>

      {selected && <OrderDrawer order={selected} onClose={() => setSelected(null)} />}
    </ResponsiveDashboardLayout>
  );
}
