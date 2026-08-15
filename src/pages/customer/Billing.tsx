import ResponsiveDashboardLayout from "@/components/layout/ResponsiveDashboardLayout";
import TopBar from "@/components/layout/TopBar";
import { Link } from "react-router";
import { CreditCard } from "lucide-react";
import { trpc } from "@/providers/trpc";
import {
  SummaryCards, FilterBar, OrdersTable, OrderDrawer, downloadOrdersCsv, computeStats, useOrderTable,
  type PaymentOrderRow,
} from "@/components/payments/orderUi";

/* Customer "Billing" — their own payment history / invoices. Read-only, with the
   same filters + CSV export. Reuses payment.myOrders (raw rows → mapped shape). */
export default function CustomerBilling() {
  const { data: raw } = trpc.payment.myOrders.useQuery();
  const orders: PaymentOrderRow[] = (raw || []).map((o) => ({
    ...o,
    amount: Number(o.amount),
    createdAt: o.createdAt as unknown as string,
    verifiedAt: (o.verifiedAt as unknown as string) ?? null,
    user: null, // it's always the signed-in user
  }));
  const { filters, setFilters, filtered, selected, setSelected } = useOrderTable(orders);
  const stats = computeStats(orders);

  return (
    <ResponsiveDashboardLayout>
      <div className="hidden md:block"><TopBar title="Billing" subtitle="Your payment history and invoices" /></div>
      <div className="p-4 sm:p-6 space-y-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-[#64748B]">{filtered.length} of {orders.length} payments</p>
          <Link to="/dashboard/subscription" className="h-9 px-3 rounded-xl bg-white border border-[#E2E8F0] text-[#334155] text-sm font-semibold flex items-center gap-1.5 hover:bg-[#F8FAFC]">
            <CreditCard size={15} /> Plans
          </Link>
        </div>

        <SummaryCards stats={stats} />

        <FilterBar filters={filters} setFilters={setFilters} count={filtered.length}
          onExport={() => downloadOrdersCsv(filtered, `my-payments-${new Date().toISOString().slice(0, 10)}.csv`)} />

        <OrdersTable list={filtered} onRow={setSelected} hideCustomer />
      </div>

      {selected && <OrderDrawer order={selected} onClose={() => setSelected(null)} />}
    </ResponsiveDashboardLayout>
  );
}
