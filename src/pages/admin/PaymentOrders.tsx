import ResponsiveDashboardLayout from "@/components/layout/ResponsiveDashboardLayout";
import TopBar from "@/components/layout/TopBar";
import { Link } from "react-router";
import { toast } from "sonner";
import { Settings2 } from "lucide-react";
import { trpc } from "@/providers/trpc";
import {
  SummaryCards, FilterBar, OrdersTable, OrderDrawer, downloadOrdersCsv, useOrderTable,
  type PaymentOrderRow,
} from "@/components/payments/orderUi";

export default function AdminPaymentOrders() {
  const utils = trpc.useUtils();
  const { data: orders } = trpc.payment.adminOrders.useQuery();
  const { data: stats } = trpc.payment.adminStats.useQuery();
  const verifyMut = trpc.payment.verifyOrder.useMutation();
  const rejectMut = trpc.payment.rejectOrder.useMutation();

  const { filters, setFilters, filtered, selected, setSelected } = useOrderTable(orders as PaymentOrderRow[] | undefined);

  const refresh = () => { utils.payment.adminOrders.invalidate(); utils.payment.adminStats.invalidate(); };
  const verify = async (id: number) => {
    try { await verifyMut.mutateAsync({ id }); toast.success("Payment verified — plan activated"); setSelected(null); refresh(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };
  const reject = async (id: number, note?: string) => {
    try { await rejectMut.mutateAsync({ id, note }); toast.success("Payment rejected"); setSelected(null); refresh(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };

  return (
    <ResponsiveDashboardLayout>
      <div className="hidden md:block"><TopBar title="Payment Orders" subtitle="All payments across Razorpay and manual — verify, filter, export" /></div>
      <div className="p-4 sm:p-6 space-y-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-[#64748B]">{filtered.length} of {orders?.length ?? 0} orders</p>
          <Link to="/admin/settings?tab=payment" className="h-9 px-3 rounded-xl bg-white border border-[#E2E8F0] text-[#334155] text-sm font-semibold flex items-center gap-1.5 hover:bg-[#F8FAFC]">
            <Settings2 size={15} /> Payment settings
          </Link>
        </div>

        <SummaryCards stats={stats ?? { revenue: 0, monthRevenue: 0, pending: 0, verified: 0 }} />

        <FilterBar filters={filters} setFilters={setFilters} count={filtered.length}
          onExport={() => downloadOrdersCsv(filtered, `payment-orders-${new Date().toISOString().slice(0, 10)}.csv`)} />

        <OrdersTable list={filtered} onRow={setSelected} />
      </div>

      {selected && (
        <OrderDrawer order={selected} canManage busy={verifyMut.isPending || rejectMut.isPending}
          onVerify={verify} onReject={reject} onClose={() => setSelected(null)} />
      )}
    </ResponsiveDashboardLayout>
  );
}
