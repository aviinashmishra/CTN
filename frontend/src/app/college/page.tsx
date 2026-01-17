'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { GraduationCap, Plus, Shield, AlertCircle } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import api from '@/lib/api'
import { MainLayout } from '@/components/layout/MainLayout'
import { PostCard } from '@/components/post/PostCard'
import { CreatePostModal } from '@/components/post/CreatePostModal'
import { PostSkeleton } from '@/components/post/PostSkeleton'

interface CollegeFeedData {
  college: {
    id: string
    name: string
    logoUrl?: string
  }
  posts: any[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export default function CollegePage() {
  const { user } = useAuthStore()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [page, setPage] = useState(1)

  // Check if user has college access
  const hasCollegeAccess = user && (
    user.role === 'COLLEGE_USER' || 
    user.role === 'MODERATOR' || 
    user.role === 'ADMIN'
  )

  const { data, isLoading, refetch, error } = useQuery<CollegeFeedData>({
    queryKey: ['college-feed', user?.collegeId, page],
    queryFn: async () => {
      if (!user?.collegeId) {
        throw new Error('No college ID available')
      }
      const response = await api.get(`/posts/college/${user.collegeId}?page=${page}&limit=20`)
      return response.data
    },
    enabled: Boolean(hasCollegeAccess && user?.collegeId),
  })

  const handlePostCreated = () => {
    setIsCreateModalOpen(false)
    refetch()
  }

  // Access denied for non-college users
  if (!hasCollegeAccess) {
    return (
      <MainLayout>
        <div className="max-w-2xl mx-auto">
          <div className="text-center py-16">
            <Shield className="w-16 h-16 text-gray-300 dark:text-dark-700 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              College Panel Access Required
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              This section is only available to college users, moderators, and administrators.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Register with a college email address to access your college's discussion panel.
            </p>
          </div>
        </div>
      </MainLayout>
    )
  }

  // No college ID available
  if (!user?.collegeId) {
    return (
      <MainLayout>
        <div className="max-w-2xl mx-auto">
          <div className="text-center py-16">
            <AlertCircle className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              College Information Missing
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Your account doesn't have college information associated with it.
            </p>
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto">
        {/* Header with College Branding */}
        <div className="sticky top-0 z-10 bg-white/80 dark:bg-dark-950/80 backdrop-blur-xl border-b border-gray-200 dark:border-dark-800">
          <div className="px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {data?.college?.logoUrl ? (
                  <img
                    src={data.college.logoUrl}
                    alt={`${data.college.name} logo`}
                    className="w-8 h-8 rounded-lg object-cover"
                  />
                ) : (
                  <GraduationCap className="w-8 h-8 text-primary-600" />
                )}
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                    {data?.college?.name || 'College Panel'}
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    College Discussion
                  </p>
                </div>
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

        {/* Error State */}
        {error && (
          <div className="p-4 m-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              <p className="text-red-600 dark:text-red-400">
                Failed to load college feed. Please try again.
              </p>
            </div>
          </div>
        )}

        {/* Feed */}
        <div className="divide-y divide-gray-200 dark:divide-dark-800">
          {isLoading ? (
            <>
              <PostSkeleton />
              <PostSkeleton />
              <PostSkeleton />
            </>
          ) : data?.posts && data.posts.length > 0 ? (
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
              <GraduationCap className="w-16 h-16 text-gray-300 dark:text-dark-700 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No posts yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Be the first to start a discussion in your college!
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
          panelType="COLLEGE"
        />
      )}
    </MainLayout>
  )
}