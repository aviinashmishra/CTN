'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Heart, MessageCircle, Flag, MoreHorizontal, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useAuthStore } from '@/store/authStore'
import api from '@/lib/api'
import { CommentSection } from './CommentSection'

interface PostCardProps {
  post: any
  onUpdate: () => void
}

export function PostCard({ post, onUpdate }: PostCardProps) {
  const { user } = useAuthStore()
  const [showComments, setShowComments] = useState(false)
  const [isLiking, setIsLiking] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  const handleLike = async () => {
    if (!user || isLiking) return
    
    setIsLiking(true)
    try {
      await api.post(`/posts/${post.id}/like`)
      onUpdate()
    } catch (error) {
      console.error('Failed to like post:', error)
    } finally {
      setIsLiking(false)
    }
  }

  const handleReport = async () => {
    if (!user) return
    
    const reason = prompt('Please provide a reason for reporting this post:')
    if (!reason) return

    try {
      await api.post(`/posts/${post.id}/report`, { reason })
      alert('Post reported successfully')
      setShowMenu(false)
    } catch (error) {
      console.error('Failed to report post:', error)
      alert('Failed to report post')
    }
  }

  return (
    <article className="post-card p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-lg font-semibold">
              {post.authorUsername[0].toUpperCase()}
            </span>
          </div>
          
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900 dark:text-white">
                {post.authorName}
              </span>
              <span className="text-gray-500 dark:text-gray-400">
                @{post.authorUsername}
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
            </p>
          </div>
        </div>

        {user && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="btn-ghost p-2"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>

            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute right-0 mt-2 w-48 bg-white dark:bg-dark-900 rounded-xl shadow-luxury border border-gray-200 dark:border-dark-800 overflow-hidden z-10"
              >
                <button
                  onClick={handleReport}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-dark-800 transition-colors text-left"
                >
                  <Flag className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  <span className="text-gray-900 dark:text-white">Report</span>
                </button>
              </motion.div>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="mb-4">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          {post.title}
        </h3>
        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
          {post.content}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-6 pt-4 border-t border-gray-200 dark:border-dark-800">
        <button
          onClick={handleLike}
          disabled={!user || isLiking}
          className={`flex items-center gap-2 transition-colors ${
            post.isLiked
              ? 'text-red-500'
              : 'text-gray-600 dark:text-gray-400 hover:text-red-500'
          } ${!user ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <Heart
            className={`w-5 h-5 ${post.isLiked ? 'fill-current' : ''}`}
          />
          <span className="text-sm font-medium">{post.likes}</span>
        </button>

        <button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-primary-600 transition-colors"
        >
          <MessageCircle className="w-5 h-5" />
          <span className="text-sm font-medium">{post.commentCount}</span>
        </button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-4 pt-4 border-t border-gray-200 dark:border-dark-800"
        >
          <CommentSection postId={post.id} onUpdate={onUpdate} />
        </motion.div>
      )}
    </article>
  )
}
