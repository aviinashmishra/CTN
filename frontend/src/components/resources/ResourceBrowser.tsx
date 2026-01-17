'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ChevronDown, 
  ChevronRight, 
  FolderOpen, 
  FileText, 
  Lock, 
  Unlock,
  Download,
  Eye,
  Building2,
  AlertCircle,
  Loader2
} from 'lucide-react'
import api from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { CollegeSelector } from '@/components/resources/CollegeSelector'
import { PaymentModal } from '@/components/resources/PaymentModal'
import { ResourceTypeIcon } from '@/components/resources/ResourceTypeIcon'

interface College {
  id: string
  name: string
  emailDomain: string
  logoUrl: string
}

interface ResourceFile {
  id: string
  name: string
  uploadedBy: string
  batch: string
  description: string
  uploadDate: string
  isLocked: boolean
  isUnlocked: boolean
}

interface BatchNode {
  name: string
  files: ResourceFile[]
}

interface DepartmentNode {
  name: string
  batches: BatchNode[]
}

interface ResourceTypeNode {
  type: string
  departments: DepartmentNode[]
}

interface ResourceHierarchy {
  college: College
  resourceTypes: ResourceTypeNode[]
}

interface ResourceBrowserProps {
  defaultCollegeId: string
}

export function ResourceBrowser({ defaultCollegeId }: ResourceBrowserProps) {
  const { user } = useAuthStore()
  const [selectedCollegeId, setSelectedCollegeId] = useState(defaultCollegeId)
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set())
  const [expandedDepartments, setExpandedDepartments] = useState<Set<string>>(new Set())
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set())
  const [paymentModalFile, setPaymentModalFile] = useState<ResourceFile | null>(null)

  // Fetch resource hierarchy for selected college
  const { data: hierarchy, isLoading, error, refetch } = useQuery({
    queryKey: ['resource-hierarchy', selectedCollegeId],
    queryFn: async (): Promise<ResourceHierarchy> => {
      const response = await api.get(`/resources/hierarchy/${selectedCollegeId}`)
      return response.data
    },
    enabled: !!selectedCollegeId,
  })

  const handleCollegeChange = (collegeId: string) => {
    setSelectedCollegeId(collegeId)
    // Reset expanded states when changing colleges
    setExpandedTypes(new Set())
    setExpandedDepartments(new Set())
    setExpandedBatches(new Set())
  }

  const toggleExpanded = (set: Set<string>, setter: (set: Set<string>) => void, key: string) => {
    const newSet = new Set(set)
    if (newSet.has(key)) {
      newSet.delete(key)
    } else {
      newSet.add(key)
    }
    setter(newSet)
  }

  const handleFileAction = async (file: ResourceFile, action: 'view' | 'download') => {
    if (file.isLocked && !file.isUnlocked) {
      // Show payment modal for locked files
      setPaymentModalFile(file)
      return
    }

    try {
      if (action === 'view') {
        const response = await api.get(`/resources/view/${file.id}`)
        // Handle view response - could show file details or open in new tab
        console.log('File view response:', response.data)
      } else if (action === 'download') {
        const response = await api.get(`/resources/download/${file.id}`, {
          responseType: 'blob'
        })
        
        // Create download link
        const url = window.URL.createObjectURL(new Blob([response.data]))
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', file.name)
        document.body.appendChild(link)
        link.click()
        link.remove()
        window.URL.revokeObjectURL(url)
      }
    } catch (error: any) {
      console.error(`Failed to ${action} file:`, error)
      // Handle error - could show toast notification
    }
  }

  const handlePaymentSuccess = () => {
    setPaymentModalFile(null)
    refetch() // Refresh hierarchy to update unlock status
  }

  const isOwnCollege = selectedCollegeId === user?.collegeId
  const isAdmin = user?.role === 'ADMIN'

  if (error) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Failed to Load Resources
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          There was an error loading the resource hierarchy.
        </p>
        <button
          onClick={() => refetch()}
          className="btn-primary"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* College Selector */}
      <CollegeSelector
        selectedCollegeId={selectedCollegeId}
        onCollegeChange={handleCollegeChange}
        defaultCollegeId={defaultCollegeId}
      />

      {/* College Info Banner */}
      {hierarchy && (
        <div className="bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 rounded-2xl p-6 border border-primary-200 dark:border-primary-800">
          <div className="flex items-center gap-4">
            {hierarchy.college.logoUrl ? (
              <img
                src={hierarchy.college.logoUrl}
                alt={`${hierarchy.college.name} logo`}
                className="w-12 h-12 rounded-xl object-cover"
              />
            ) : (
              <Building2 className="w-12 h-12 text-primary-600" />
            )}
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {hierarchy.college.name}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {isOwnCollege ? 'Your College - Free Access' : 
                 isAdmin ? 'Admin Access - Free' : 'Cross-College Access - Payment Required'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading resources...</p>
        </div>
      )}

      {/* Resource Hierarchy */}
      {hierarchy && (
        <div className="bg-white dark:bg-dark-900 rounded-2xl border border-gray-200 dark:border-dark-800 overflow-hidden">
          {hierarchy.resourceTypes.length === 0 ? (
            <div className="text-center py-16">
              <FileText className="w-16 h-16 text-gray-300 dark:text-dark-700 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No Resources Available
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                This college hasn't uploaded any resources yet.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-dark-800">
              {hierarchy.resourceTypes.map((resourceType, typeIndex) => (
                <div key={resourceType.type}>
                  {/* Resource Type Header */}
                  <button
                    onClick={() => toggleExpanded(expandedTypes, setExpandedTypes, resourceType.type)}
                    className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-dark-800 transition-colors text-left"
                  >
                    {expandedTypes.has(resourceType.type) ? (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                    <ResourceTypeIcon type={resourceType.type} />
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {resourceType.type.replace('_', ' ')}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      ({resourceType.departments.reduce((acc, dept) => 
                        acc + dept.batches.reduce((batchAcc, batch) => batchAcc + batch.files.length, 0), 0
                      )} files)
                    </span>
                  </button>

                  {/* Departments */}
                  <AnimatePresence>
                    {expandedTypes.has(resourceType.type) && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="pl-8 divide-y divide-gray-100 dark:divide-dark-700">
                          {resourceType.departments.map((department) => (
                            <div key={`${resourceType.type}-${department.name}`}>
                              {/* Department Header */}
                              <button
                                onClick={() => toggleExpanded(
                                  expandedDepartments, 
                                  setExpandedDepartments, 
                                  `${resourceType.type}-${department.name}`
                                )}
                                className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-dark-800 transition-colors text-left"
                              >
                                {expandedDepartments.has(`${resourceType.type}-${department.name}`) ? (
                                  <ChevronDown className="w-4 h-4 text-gray-400" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-gray-400" />
                                )}
                                <FolderOpen className="w-4 h-4 text-blue-500" />
                                <span className="font-medium text-gray-800 dark:text-gray-200">
                                  {department.name}
                                </span>
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                  ({department.batches.reduce((acc, batch) => acc + batch.files.length, 0)} files)
                                </span>
                              </button>

                              {/* Batches */}
                              <AnimatePresence>
                                {expandedDepartments.has(`${resourceType.type}-${department.name}`) && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="pl-8 divide-y divide-gray-50 dark:divide-dark-600">
                                      {department.batches.map((batch) => (
                                        <div key={`${resourceType.type}-${department.name}-${batch.name}`}>
                                          {/* Batch Header */}
                                          <button
                                            onClick={() => toggleExpanded(
                                              expandedBatches, 
                                              setExpandedBatches, 
                                              `${resourceType.type}-${department.name}-${batch.name}`
                                            )}
                                            className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-dark-800 transition-colors text-left"
                                          >
                                            {expandedBatches.has(`${resourceType.type}-${department.name}-${batch.name}`) ? (
                                              <ChevronDown className="w-4 h-4 text-gray-400" />
                                            ) : (
                                              <ChevronRight className="w-4 h-4 text-gray-400" />
                                            )}
                                            <FolderOpen className="w-4 h-4 text-green-500" />
                                            <span className="font-medium text-gray-700 dark:text-gray-300">
                                              {batch.name}
                                            </span>
                                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                              ({batch.files.length} files)
                                            </span>
                                          </button>

                                          {/* Files */}
                                          <AnimatePresence>
                                            {expandedBatches.has(`${resourceType.type}-${department.name}-${batch.name}`) && (
                                              <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.2 }}
                                                className="overflow-hidden"
                                              >
                                                <div className="pl-8 space-y-2 pb-4">
                                                  {batch.files.map((file) => (
                                                    <div
                                                      key={file.id}
                                                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-800 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
                                                    >
                                                      <div className="flex items-center gap-3 flex-1 min-w-0">
                                                        <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                                        <div className="min-w-0 flex-1">
                                                          <div className="flex items-center gap-2">
                                                            <p className="font-medium text-gray-900 dark:text-white truncate">
                                                              {file.name}
                                                            </p>
                                                            {file.isLocked && !file.isUnlocked && (
                                                              <Lock className="w-4 h-4 text-red-500 flex-shrink-0" />
                                                            )}
                                                            {file.isUnlocked && (
                                                              <Unlock className="w-4 h-4 text-green-500 flex-shrink-0" />
                                                            )}
                                                          </div>
                                                          <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                                                            {file.description}
                                                          </p>
                                                          <p className="text-xs text-gray-500 dark:text-gray-500">
                                                            By {file.uploadedBy} • {new Date(file.uploadDate).toLocaleDateString()}
                                                          </p>
                                                        </div>
                                                      </div>
                                                      
                                                      <div className="flex items-center gap-2 flex-shrink-0">
                                                        <button
                                                          onClick={() => handleFileAction(file, 'view')}
                                                          className="btn-ghost p-2"
                                                          title={file.isLocked && !file.isUnlocked ? 'Payment required' : 'View file'}
                                                        >
                                                          <Eye className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                          onClick={() => handleFileAction(file, 'download')}
                                                          className="btn-ghost p-2"
                                                          title={file.isLocked && !file.isUnlocked ? 'Payment required' : 'Download file'}
                                                        >
                                                          <Download className="w-4 h-4" />
                                                        </button>
                                                      </div>
                                                    </div>
                                                  ))}
                                                </div>
                                              </motion.div>
                                            )}
                                          </AnimatePresence>
                                        </div>
                                      ))}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Payment Modal */}
      {paymentModalFile && (
        <PaymentModal
          file={paymentModalFile}
          onClose={() => setPaymentModalFile(null)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  )
}