'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Sparkles, Plus } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import api from '@/lib/api'
import { MainLayout } from '@/components/layout/MainLayout'
import { PostCard } from '@/components/post/PostCard'
import { CreatePostModal } from '@/components/post/CreatePostModal'
import { PostSkeleton } from '@/components/post/PostSkeleton'

export default function FeedPage() {
  const { user } = useAuthStore()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [page, setPage] = useState(1)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['national-feed', page],
    queryFn: async () => {
      const response = await api.get(`/posts/national?page=${page}&limit=20`)
      return response.data
    },
  })

  const handlePostCreated = () => {
    setIsCreateModalOpen(false)
    refetch()
  }

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/80 dark:bg-dark-950/80 backdrop-blur-xl border-b border-gray-200 dark:border-dark-800">
          <div className="px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sparkles className="w-6 h-6 text-primary-600" />
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  National Feed
                </h1>
              </div>
              
              {user && (
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="btn-primary flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  <span className="hidden sm:inline">Post</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Feed */}
        <div className="divide-y divide-gray-200 dark:divide-dark-800">
          {isLoading ? (
            <>
              <PostSkeleton />
              <PostSkeleton />
              <PostSkeleton />
            </>
          ) : data?.posts?.length > 0 ? (
            data.posts.map((post: any, index: number) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <PostCard post={post} onUpdate={refetch} />
              </motion.div>
            ))
          ) : (
            <div className="py-16 text-center">
              <Sparkles className="w-16 h-16 text-gray-300 dark:text-dark-700 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No posts yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Be the first to start a discussion!
              </p>
              {user && (
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="btn-primary"
                >
                  Create Post
                </button>
              )}
            </div>
          )}
        </div>

        {/* Pagination */}
        {data?.pagination && data.pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 py-8">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-secondary disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Page {page} of {data.pagination.totalPages}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= data.pagination.totalPages}
              className="btn-secondary disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Create Post Modal */}
      {isCreateModalOpen && (
        <CreatePostModal
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={handlePostCreated}
        />
      )}
    </MainLayout>
  )
}
