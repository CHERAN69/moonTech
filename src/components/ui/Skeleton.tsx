import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
  /** Number of rows to render (for list skeletons) */
  rows?: number
}

/** Animated shimmer placeholder for loading states. */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-lg bg-gray-100',
        className
      )}
    />
  )
}

/** A row of skeleton cells that mimics a table row. */
export function SkeletonRow() {
  return (
    <div className="flex items-center px-5 py-4 gap-4 border-b border-gray-50 last:border-0">
      <Skeleton className="w-2 h-2 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3.5 w-2/5" />
        <Skeleton className="h-2.5 w-1/4" />
      </div>
      <Skeleton className="h-3.5 w-16 flex-shrink-0" />
      <Skeleton className="h-5 w-12 rounded-full flex-shrink-0" />
      <div className="flex gap-1.5 flex-shrink-0">
        <Skeleton className="w-7 h-7 rounded-lg" />
        <Skeleton className="w-7 h-7 rounded-lg" />
      </div>
    </div>
  )
}

/** A card-level skeleton for stat panels. */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('bg-white rounded-xl border border-gray-100 px-4 py-3', className)}>
      <Skeleton className="h-7 w-12 mb-1" />
      <Skeleton className="h-3 w-20" />
    </div>
  )
}

/** A generic block skeleton — useful for table/list loading states. */
export function SkeletonList({ rows = 5 }: { rows?: number }) {
  return (
    <div>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  )
}
