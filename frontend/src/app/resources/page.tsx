'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { BookOpen, Shield, AlertCircle } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { MainLayout } from '@/components/layout/MainLayout'
import { ResourceBrowser } from '@/components/resources/ResourceBrowser'

export default function ResourcesPage() {
  const { user } = useAuthStore()

  // Check if user has resource access
  const hasResourceAccess = user && (
    user.role === 'COLLEGE_USER' || 
    user.role === 'MODERATOR' || 
    user.role === 'ADMIN'
  )

  // Access denied for non-college users
  if (!hasResourceAccess) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-16">
            <Shield className="w-16 h-16 text-gray-300 dark:text-dark-700 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Resource Access Required
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              This section is only available to college users, moderators, and administrators.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Register with a college email address to access academic resources.
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
        <div className="max-w-4xl mx-auto">
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
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/80 dark:bg-dark-950/80 backdrop-blur-xl border-b border-gray-200 dark:border-dark-800">
          <div className="px-4 py-4">
            <div className="flex items-center gap-3">
              <BookOpen className="w-6 h-6 text-primary-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  Academic Resources
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Browse and access study materials across colleges
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Resource Browser */}
        <div className="p-4">
          <ResourceBrowser defaultCollegeId={user.collegeId} />
        </div>
      </div>
    </MainLayout>
  )
}