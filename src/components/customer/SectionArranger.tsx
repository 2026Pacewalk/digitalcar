/*
 * Drag-and-drop reordering for the card's content sections. The chosen order is
 * stored as a comma-separated `section_order` string on the card and consumed by
 * buildCard so the public card renders (and its footer nav lists) sections in the
 * customer's order. Touch + mouse + keyboard friendly via @dnd-kit.
 */
import { useMemo } from "react";
import {
  DndContext, closestCenter, PointerSensor, TouchSensor, KeyboardSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, arrayMove, useSortable, sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Info, ShoppingBag, Tags, Wallet, Images, Video, Star, MessageSquare, QrCode, GripVertical } from "lucide-react";

type Meta = { key: string; label: string; icon: React.ComponentType<{ size?: number; className?: string }> };

export const CARD_SECTIONS: Meta[] = [
  { key: "about", label: "About Us", icon: Info },
  { key: "products", label: "Products / Services", icon: ShoppingBag },
  { key: "offers", label: "Offers", icon: Tags },
  { key: "payment", label: "Payments", icon: Wallet },
  { key: "gallery", label: "Gallery", icon: Images },
  { key: "video", label: "Videos", icon: Video },
  { key: "reviews", label: "Google Reviews", icon: Star },
  { key: "enquiry", label: "Enquiry Form", icon: MessageSquare },
  { key: "cardqr", label: "Scan My Card (QR)", icon: QrCode },
];
export const DEFAULT_SECTION_ORDER = CARD_SECTIONS.map((s) => s.key);
const META = Object.fromEntries(CARD_SECTIONS.map((s) => [s.key, s]));

/** Resolve a stored order string into a complete, de-duped key list. */
export function resolveSectionOrder(value?: string): string[] {
  const v = (value || "").split(",").map((x) => x.trim()).filter((k) => k in META);
  return [...v, ...DEFAULT_SECTION_ORDER.filter((k) => !v.includes(k))];
}

function Row({ id }: { id: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const m = META[id];
  const Icon = m.icon;
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-3 bg-white border rounded-xl px-3 py-2.5 select-none ${isDragging ? "border-[#F7B31C] shadow-premium-lg z-10 relative" : "border-[#E2E8F0]"}`}
    >
      <button
        type="button"
        className="touch-none cursor-grab active:cursor-grabbing text-[#94A3B8] hover:text-[#475569] -ml-1 p-1"
        aria-label={`Drag ${m.label}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical size={18} />
      </button>
      <span className="w-8 h-8 rounded-lg bg-[#F8FAFC] flex items-center justify-center text-[#64748B] shrink-0"><Icon size={15} /></span>
      <span className="text-[13px] font-semibold text-[#0F172A] flex-1 min-w-0 truncate">{m.label}</span>
    </div>
  );
}

export default function SectionArranger({ value, onChange }: { value?: string; onChange: (v: string) => void }) {
  const order = useMemo(() => resolveSectionOrder(value), [value]);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = order.indexOf(String(active.id));
    const newIndex = order.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    onChange(arrayMove(order, oldIndex, newIndex).join(","));
  };

  return (
    <div className="space-y-2">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {order.map((k) => <Row key={k} id={k} />)}
          </div>
        </SortableContext>
      </DndContext>
      <button type="button" onClick={() => onChange(DEFAULT_SECTION_ORDER.join(","))} className="text-[11px] font-semibold text-[#94A3B8] hover:text-[#475569] transition-colors">Reset to default order</button>
    </div>
  );
}
