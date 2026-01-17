'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Building2, Check } from 'lucide-react'
import api from '@/lib/api'

interface College {
  id: string
  name: string
  emailDomain: string
  logoUrl: string
}

interface CollegeSelectorProps {
  selectedCollegeId: string
  onCollegeChange: (collegeId: string) => void
  defaultCollegeId: string
}

export function CollegeSelector({ selectedCollegeId, onCollegeChange, defaultCollegeId }: CollegeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Fetch all colleges
  const { data: collegesData, isLoading } = useQuery({
    queryKey: ['colleges'],
    queryFn: async () => {
      const response = await api.get('/resources/colleges')
      return response.data
    },
  })

  const colleges: College[] = collegesData?.colleges || []
  const selectedCollege = colleges.find(c => c.id === selectedCollegeId)

  const handleCollegeSelect = (collegeId: string) => {
    onCollegeChange(collegeId)
    setIsOpen(false)
  }

  return (
    <div className="relative">
      {/* Selector Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-white dark:bg-dark-900 border border-gray-200 dark:border-dark-800 rounded-2xl hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
      >
        <div className="flex items-center gap-3">
          {selectedCollege?.logoUrl ? (
            <img
              src={selectedCollege.logoUrl}
              alt={`${selectedCollege.name} logo`}
              className="w-8 h-8 rounded-lg object-cover"
            />
          ) : (
            <Building2 className="w-8 h-8 text-gray-400" />
          )}
          <div className="text-left">
            <p className="font-semibold text-gray-900 dark:text-white">
              {selectedCollege?.name || 'Select College'}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {selectedCollegeId === defaultCollegeId ? 'Your College' : 'Cross-College Access'}
            </p>
          </div>
        </div>
        <ChevronDown 
          className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-dark-900 border border-gray-200 dark:border-dark-800 rounded-2xl shadow-luxury z-50 max-h-80 overflow-y-auto"
          >
            {isLoading ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                Loading colleges...
              </div>
            ) : colleges.length === 0 ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                No colleges available
              </div>
            ) : (
              <div className="p-2">
                {colleges.map((college) => (
                  <button
                    key={college.id}
                    onClick={() => handleCollegeSelect(college.id)}
                    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-dark-800 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      {college.logoUrl ? (
                        <img
                          src={college.logoUrl}
                          alt={`${college.name} logo`}
                          className="w-8 h-8 rounded-lg object-cover"
                        />
                      ) : (
                        <Building2 className="w-8 h-8 text-gray-400" />
                      )}
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {college.name}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {college.emailDomain}
                        </p>
                        {college.id === defaultCollegeId && (
                          <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded-lg">
                            Your College
                          </span>
                        )}
                      </div>
                    </div>
                    {selectedCollegeId === college.id && (
                      <Check className="w-5 h-5 text-primary-600" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}