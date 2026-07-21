/* ─── Skeleton Loading Screens ─── */

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-premium border border-[#F1F5F9] space-y-3">
      <div className="flex items-center gap-3">
        <div className="skeleton w-12 h-12 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-4 w-3/5 rounded" />
          <div className="skeleton h-3 w-2/5 rounded" />
        </div>
      </div>
      <div className="skeleton h-3 w-full rounded" />
      <div className="skeleton h-3 w-4/5 rounded" />
    </div>
  );
}

export function SkeletonStats() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-white rounded-2xl p-4 shadow-premium border border-[#F1F5F9] space-y-2">
          <div className="skeleton w-10 h-10 rounded-xl" />
          <div className="skeleton h-6 w-16 rounded" />
          <div className="skeleton h-3 w-20 rounded" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable() {
  return (
    <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] overflow-hidden space-y-0">
      <div className="p-4 border-b border-[#F1F5F9] flex items-center gap-3">
        <div className="skeleton w-9 h-9 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-3 w-1/3 rounded" />
          <div className="skeleton h-2.5 w-1/2 rounded" />
        </div>
        <div className="skeleton h-6 w-16 rounded-lg" />
      </div>
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="p-4 border-b border-[#F1F5F9] last:border-0 flex items-center gap-3">
          <div className="skeleton w-9 h-9 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-3 w-2/5 rounded" />
            <div className="skeleton h-2.5 w-3/5 rounded" />
          </div>
          <div className="skeleton h-6 w-14 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-premium border border-[#F1F5F9] space-y-4">
      <div className="flex items-center justify-between">
        <div className="skeleton h-4 w-32 rounded" />
        <div className="skeleton h-8 w-24 rounded-lg" />
      </div>
      <div className="skeleton h-48 w-full rounded-xl" />
    </div>
  );
}

export function SkeletonProfile() {
  return (
    <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] p-6 space-y-4">
      <div className="flex items-center gap-4">
        <div className="skeleton w-16 h-16 rounded-2xl" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-4 w-32 rounded" />
          <div className="skeleton h-3 w-48 rounded" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton h-10 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export function SkeletonBottomNav() {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#F1F5F9] px-2 pt-2 pb-3 flex items-center justify-around md:hidden">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex flex-col items-center gap-1 py-1 px-3">
          <div className="skeleton w-6 h-6 rounded" />
          <div className="skeleton h-2 w-10 rounded" />
        </div>
      ))}
    </div>
  );
}
