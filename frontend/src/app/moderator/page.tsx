'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  Upload, 
  FileText, 
  AlertTriangle, 
  Eye, 
  EyeOff, 
  Flag, 
  Trash2,
  Plus,
  BookOpen,
  Users,
  Calendar,
  User
} from 'lucide-react'
import { useAuthStore, UserRole } from '@/store/authStore'
import { MainLayout } from '@/components/layout/MainLayout'
import { api } from '@/lib/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

interface Resource {
  id: string
  fileName: string
  resourceType: string
  department: string
  batch: string
  description: string
  uploadDate: string
  college: {
    id: string
    name: string
  }
  uploader: {
    id: string
    username: string
  }
}

interface CollegePost {
  id: string
  title: string
  content: string
  author: {
    id: string
    username: string
    displayName: string
  }
  createdAt: string
  isFlagged: boolean
  isHidden: boolean
  flagReason?: string
  _count: {
    likes: number
    comments: number
  }
}

interface College {
  id: string
  name: string
  emailDomain: string
}

const RESOURCE_TYPES = [
  'TOPPER_NOTES',
  'PREVIOUS_YEAR_PAPERS',
  'STUDY_MATERIALS',
  'ASSIGNMENTS',
  'PROJECTS'
]

export default function ModeratorDashboard() {
  const router = useRouter()
  const { user, college } = useAuthStore()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'upload' | 'moderation' | 'my-uploads'>('upload')

  // Resource upload form state
  const [uploadForm, setUploadForm] = useState({
    resourceType: '',
    department: '',
    batch: '',
    fileName: '',
    fileUrl: '',
    description: ''
  })

  // Check if user is a moderator
  useEffect(() => {
    if (!user || user.role !== UserRole.MODERATOR) {
      router.push('/feed')
    }
  }, [user, router])

  // Fetch my uploaded resources
  const { data: myResources, isLoading: resourcesLoading } = useQuery({
    queryKey: ['my-uploads'],
    queryFn: async () => {
      const response = await api.get('/resources/my-uploads')
      return response.data.resources as Resource[]
    },
    enabled: !!user && user.role === UserRole.MODERATOR
  })

  // Fetch college posts for moderation
  const { data: collegePosts, isLoading: postsLoading } = useQuery({
    queryKey: ['college-posts', college?.id],
    queryFn: async () => {
      if (!college?.id) return []
      const response = await api.get(`/posts/college/${college.id}`)
      return response.data.posts as CollegePost[]
    },
    enabled: !!college?.id && !!user && user.role === UserRole.MODERATOR
  })

  // Upload resource mutation
  const uploadMutation = useMutation({
    mutationFn: async (data: typeof uploadForm) => {
      if (!college?.id) throw new Error('No college assigned')
      const response = await api.post(`/resources/upload/${college.id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-uploads'] })
      setUploadForm({
        resourceType: '',
        department: '',
        batch: '',
        fileName: '',
        fileUrl: '',
        description: ''
      })
    }
  })

  // Flag post mutation
  const flagPostMutation = useMutation({
    mutationFn: async ({ postId, reason }: { postId: string; reason: string }) => {
      const response = await api.post(`/posts/${postId}/flag`, { reason })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['college-posts'] })
    }
  })

  // Hide post mutation
  const hidePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      const response = await api.post(`/posts/${postId}/hide`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['college-posts'] })
    }
  })

  // Unhide post mutation
  const unhidePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      const response = await api.post(`/posts/${postId}/unhide`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['college-posts'] })
    }
  })

  // Delete resource mutation
  const deleteResourceMutation = useMutation({
    mutationFn: async (resourceId: string) => {
      const response = await api.delete(`/resources/${resourceId}`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-uploads'] })
    }
  })

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!uploadForm.resourceType || !uploadForm.department || !uploadForm.batch || 
        !uploadForm.fileName || !uploadForm.fileUrl) {
      return
    }
    uploadMutation.mutate(uploadForm)
  }

  const handleFlagPost = (postId: string, reason: string) => {
    flagPostMutation.mutate({ postId, reason })
  }

  const handleHidePost = (postId: string) => {
    hidePostMutation.mutate(postId)
  }

  const handleUnhidePost = (postId: string) => {
    unhidePostMutation.mutate(postId)
  }

  const handleDeleteResource = (resourceId: string) => {
    if (confirm('Are you sure you want to delete this resource?')) {
      deleteResourceMutation.mutate(resourceId)
    }
  }

  if (!user || user.role !== UserRole.MODERATOR) {
    return null
  }

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Moderator Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage resources and moderate college discussions for {college?.name}
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 mb-8 bg-gray-100 dark:bg-dark-800 p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'upload'
                ? 'bg-white dark:bg-dark-700 text-primary-600 dark:text-primary-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Upload className="w-5 h-5 inline mr-2" />
            Upload Resources
          </button>
          <button
            onClick={() => setActiveTab('moderation')}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'moderation'
                ? 'bg-white dark:bg-dark-700 text-primary-600 dark:text-primary-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Flag className="w-5 h-5 inline mr-2" />
            Moderate Posts
          </button>
          <button
            onClick={() => setActiveTab('my-uploads')}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'my-uploads'
                ? 'bg-white dark:bg-dark-700 text-primary-600 dark:text-primary-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <FileText className="w-5 h-5 inline mr-2" />
            My Uploads
          </button>
        </div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'upload' && (
            <div className="bg-white dark:bg-dark-900 rounded-2xl shadow-luxury border border-gray-200 dark:border-dark-800 p-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                Upload New Resource
              </h2>
              
              <form onSubmit={handleUploadSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Resource Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Resource Type
                    </label>
                    <select
                      value={uploadForm.resourceType}
                      onChange={(e) => setUploadForm(prev => ({ ...prev, resourceType: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      required
                    >
                      <option value="">Select resource type</option>
                      {RESOURCE_TYPES.map(type => (
                        <option key={type} value={type}>
                          {type.replace(/_/g, ' ')}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Department */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Department
                    </label>
                    <input
                      type="text"
                      value={uploadForm.department}
                      onChange={(e) => setUploadForm(prev => ({ ...prev, department: e.target.value }))}
                      placeholder="e.g., Computer Science, MBA, etc."
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      required
                    />
                  </div>

                  {/* Batch */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Batch
                    </label>
                    <input
                      type="text"
                      value={uploadForm.batch}
                      onChange={(e) => setUploadForm(prev => ({ ...prev, batch: e.target.value }))}
                      placeholder="e.g., 2024, Batch A, etc."
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      required
                    />
                  </div>

                  {/* File Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      File Name
                    </label>
                    <input
                      type="text"
                      value={uploadForm.fileName}
                      onChange={(e) => setUploadForm(prev => ({ ...prev, fileName: e.target.value }))}
                      placeholder="e.g., Data Structures Notes.pdf"
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                {/* File URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    File URL
                  </label>
                  <input
                    type="url"
                    value={uploadForm.fileUrl}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, fileUrl: e.target.value }))}
                    placeholder="https://example.com/path/to/file.pdf"
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    value={uploadForm.description}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description of the resource..."
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={uploadMutation.isPending}
                  className="btn-primary w-full md:w-auto"
                >
                  {uploadMutation.isPending ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5 mr-2" />
                      Upload Resource
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'moderation' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-dark-900 rounded-2xl shadow-luxury border border-gray-200 dark:border-dark-800 p-8">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                  College Posts Moderation
                </h2>
                
                {postsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : collegePosts && collegePosts.length > 0 ? (
                  <div className="space-y-4">
                    {collegePosts.map((post) => (
                      <div
                        key={post.id}
                        className={`p-6 rounded-xl border transition-all ${
                          post.isFlagged
                            ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20'
                            : post.isHidden
                            ? 'border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 opacity-75'
                            : 'border-gray-200 dark:border-dark-700 bg-gray-50 dark:bg-dark-800'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                                <span className="text-white text-sm font-semibold">
                                  {post.author.username[0].toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">
                                  @{post.author.username}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {new Date(post.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                              {post.isFlagged && (
                                <span className="px-2 py-1 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg">
                                  Flagged
                                </span>
                              )}
                              {post.isHidden && (
                                <span className="px-2 py-1 text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-lg">
                                  Hidden
                                </span>
                              )}
                            </div>
                            
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                              {post.title}
                            </h3>
                            <p className="text-gray-700 dark:text-gray-300 mb-4">
                              {post.content}
                            </p>
                            
                            {post.flagReason && (
                              <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                                <p className="text-sm text-red-700 dark:text-red-400">
                                  <strong>Flag Reason:</strong> {post.flagReason}
                                </p>
                              </div>
                            )}
                            
                            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                              <span>{post._count.likes} likes</span>
                              <span>{post._count.comments} comments</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 ml-4">
                            {!post.isFlagged && (
                              <button
                                onClick={() => {
                                  const reason = prompt('Enter flag reason:')
                                  if (reason) handleFlagPost(post.id, reason)
                                }}
                                className="btn-ghost text-red-600 dark:text-red-400 p-2"
                                title="Flag Post"
                              >
                                <Flag className="w-5 h-5" />
                              </button>
                            )}
                            
                            {!post.isHidden ? (
                              <button
                                onClick={() => handleHidePost(post.id)}
                                className="btn-ghost text-yellow-600 dark:text-yellow-400 p-2"
                                title="Hide Post"
                              >
                                <EyeOff className="w-5 h-5" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleUnhidePost(post.id)}
                                className="btn-ghost text-green-600 dark:text-green-400 p-2"
                                title="Unhide Post"
                              >
                                <Eye className="w-5 h-5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Users className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">
                      No posts to moderate at the moment
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'my-uploads' && (
            <div className="bg-white dark:bg-dark-900 rounded-2xl shadow-luxury border border-gray-200 dark:border-dark-800 p-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                My Uploaded Resources
              </h2>
              
              {resourcesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : myResources && myResources.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {myResources.map((resource) => (
                    <div
                      key={resource.id}
                      className="p-6 rounded-xl border border-gray-200 dark:border-dark-700 bg-gray-50 dark:bg-dark-800 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                            <BookOpen className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                              {resource.fileName}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {resource.resourceType.replace(/_/g, ' ')}
                            </p>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => handleDeleteResource(resource.id)}
                          className="btn-ghost text-red-600 dark:text-red-400 p-2"
                          title="Delete Resource"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          <span>{resource.department}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>{resource.batch}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          <span>Uploaded {new Date(resource.uploadDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                      
                      {resource.description && (
                        <p className="mt-4 text-sm text-gray-700 dark:text-gray-300">
                          {resource.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    You haven't uploaded any resources yet
                  </p>
                  <button
                    onClick={() => setActiveTab('upload')}
                    className="btn-primary"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Upload Your First Resource
                  </button>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </MainLayout>
  )
}