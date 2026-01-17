export function PostSkeleton() {
  return (
    <div className="p-6 animate-pulse">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-dark-800" />
        <div className="flex-1">
          <div className="h-4 bg-gray-200 dark:bg-dark-800 rounded w-32 mb-2" />
          <div className="h-3 bg-gray-200 dark:bg-dark-800 rounded w-24" />
        </div>
      </div>

      <div className="space-y-3 mb-4">
        <div className="h-6 bg-gray-200 dark:bg-dark-800 rounded w-3/4" />
        <div className="h-4 bg-gray-200 dark:bg-dark-800 rounded w-full" />
        <div className="h-4 bg-gray-200 dark:bg-dark-800 rounded w-5/6" />
      </div>

      <div className="flex items-center gap-6 pt-4 border-t border-gray-200 dark:border-dark-800">
        <div className="h-8 bg-gray-200 dark:bg-dark-800 rounded w-16" />
        <div className="h-8 bg-gray-200 dark:bg-dark-800 rounded w-16" />
      </div>
    </div>
  )
}
