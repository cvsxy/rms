export function SkeletonPulse({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

export function SkeletonText({ lines = 1, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={`animate-pulse bg-gray-200 rounded h-4 ${i === lines - 1 && lines > 1 ? "w-3/4" : "w-full"}`} />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-white rounded-xl border border-gray-200 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="bg-gray-200 rounded h-5 w-16" />
        <div className="bg-gray-200 rounded-full h-5 w-20" />
      </div>
      <div className="bg-gray-200 rounded h-3 w-24 mb-2" />
      <div className="bg-gray-200 rounded h-3 w-16" />
    </div>
  );
}

export function SkeletonRow({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-white rounded-xl border border-gray-100 p-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="bg-gray-200 rounded h-4 w-40 mb-2" />
          <div className="bg-gray-200 rounded h-3 w-24" />
        </div>
        <div className="bg-gray-200 rounded h-4 w-16" />
      </div>
    </div>
  );
}

export function SkeletonTableGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <SkeletonCard key={i} className="h-28" />
      ))}
    </div>
  );
}

export function SkeletonStatCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="animate-pulse bg-white rounded-xl shadow-sm p-6">
          <div className="bg-gray-200 rounded h-4 w-24 mb-3" />
          <div className="bg-gray-200 rounded h-8 w-32" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonMenuItems() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="animate-pulse bg-white rounded-xl border border-gray-100 p-3">
          <div className="bg-gray-200 rounded h-4 w-24 mb-2" />
          <div className="bg-gray-200 rounded h-3 w-full mb-2" />
          <div className="bg-gray-200 rounded h-4 w-16 mt-2" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonOrderItems() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}
