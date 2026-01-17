'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Heart, MessageCircle, Flag, MoreHorizontal, Eye, EyeOff, AlertTriangle } from 'lucide-react'
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
  const [isProcessing, setIsProcessing] = useState(false)

  // Check if user is a moderator for college posts
  const isModerator = user?.role === 'MODERATOR' && post.panelType === 'COLLEGE'
  const isAdmin = user?.role === 'ADMIN'
  const canModerate = isModerator || isAdmin

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

  const handleFlag = async () => {
    if (!canModerate) return
    
    const reason = prompt('Please provide a reason for flagging this post:')
    if (!reason) return

    setIsProcessing(true)
    try {
      await api.post(`/posts/${post.id}/flag`, { reason })
      alert('Post flagged successfully')
      setShowMenu(false)
      onUpdate()
    } catch (error) {
      console.error('Failed to flag post:', error)
      alert('Failed to flag post')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleHide = async () => {
    if (!canModerate) return
    
    if (!confirm('Are you sure you want to hide this post? It will be hidden from regular users.')) {
      return
    }

    setIsProcessing(true)
    try {
      await api.post(`/posts/${post.id}/hide`)
      alert('Post hidden successfully')
      setShowMenu(false)
      onUpdate()
    } catch (error) {
      console.error('Failed to hide post:', error)
      alert('Failed to hide post')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleUnhide = async () => {
    if (!canModerate) return
    
    setIsProcessing(true)
    try {
      await api.post(`/posts/${post.id}/unhide`)
      alert('Post unhidden successfully')
      setShowMenu(false)
      onUpdate()
    } catch (error) {
      console.error('Failed to unhide post:', error)
      alert('Failed to unhide post')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <article className={`post-card p-6 ${post.isHidden ? 'opacity-60 border-l-4 border-yellow-400' : ''} ${post.isFlagged ? 'border-l-4 border-red-400' : ''}`}>
      {/* Moderation Status Indicators */}
      {(post.isFlagged || post.isHidden) && canModerate && (
        <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-center gap-2">
            {post.isFlagged && (
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-medium">Flagged</span>
                {post.flagReason && (
                  <span className="text-sm">- {post.flagReason}</span>
                )}
              </div>
            )}
            {post.isHidden && (
              <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                <EyeOff className="w-4 h-4" />
                <span className="text-sm font-medium">Hidden from users</span>
              </div>
            )}
          </div>
        </div>
      )}

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
              disabled={isProcessing}
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>

            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute right-0 mt-2 w-48 bg-white dark:bg-dark-900 rounded-xl shadow-luxury border border-gray-200 dark:border-dark-800 overflow-hidden z-10"
              >
                {/* Regular user actions */}
                <button
                  onClick={handleReport}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-dark-800 transition-colors text-left"
                >
                  <Flag className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  <span className="text-gray-900 dark:text-white">Report</span>
                </button>

                {/* Moderator actions for college posts */}
                {canModerate && post.panelType === 'COLLEGE' && (
                  <>
                    <div className="border-t border-gray-200 dark:border-dark-800"></div>
                    
                    <button
                      onClick={handleFlag}
                      disabled={isProcessing}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-dark-800 transition-colors text-left disabled:opacity-50"
                    >
                      <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                      <span className="text-gray-900 dark:text-white">Flag Post</span>
                    </button>

                    {post.isHidden ? (
                      <button
                        onClick={handleUnhide}
                        disabled={isProcessing}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-dark-800 transition-colors text-left disabled:opacity-50"
                      >
                        <Eye className="w-4 h-4 text-green-600 dark:text-green-400" />
                        <span className="text-gray-900 dark:text-white">Unhide Post</span>
                      </button>
                    ) : (
                      <button
                        onClick={handleHide}
                        disabled={isProcessing}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-dark-800 transition-colors text-left disabled:opacity-50"
                      >
                        <EyeOff className="w-4 h-4 text-red-600 dark:text-red-400" />
                        <span className="text-gray-900 dark:text-white">Hide Post</span>
                      </button>
                    )}
                  </>
                )}
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
