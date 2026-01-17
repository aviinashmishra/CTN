'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { 
  X, 
  CreditCard, 
  Lock, 
  FileText, 
  DollarSign,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import api from '@/lib/api'

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

interface PaymentModalProps {
  file: ResourceFile
  onClose: () => void
  onSuccess: () => void
}

interface PaymentSession {
  sessionId: string
  resourceId: string
  userId: string
  amount: number
  currency: string
  status: string
  createdAt: string
  expiresAt: string
}

export function PaymentModal({ file, onClose, onSuccess }: PaymentModalProps) {
  const [paymentStep, setPaymentStep] = useState<'initiate' | 'processing' | 'success' | 'error'>('initiate')
  const [paymentSession, setPaymentSession] = useState<PaymentSession | null>(null)
  const [errorMessage, setErrorMessage] = useState('')

  // Initiate payment mutation
  const initiatePaymentMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/resources/payment/initiate/${file.id}`)
      return response.data.paymentSession
    },
    onSuccess: (session: PaymentSession) => {
      setPaymentSession(session)
      setPaymentStep('processing')
      // Simulate payment processing
      simulatePaymentProcessing(session.sessionId)
    },
    onError: (error: any) => {
      setErrorMessage(error.response?.data?.message || 'Failed to initiate payment')
      setPaymentStep('error')
    }
  })

  // Verify payment mutation
  const verifyPaymentMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await api.post('/resources/payment/verify', { sessionId })
      return response.data.result
    },
    onSuccess: (result) => {
      if (result.success) {
        setPaymentStep('success')
        setTimeout(() => {
          onSuccess()
        }, 2000)
      } else {
        setErrorMessage(result.message || 'Payment verification failed')
        setPaymentStep('error')
      }
    },
    onError: (error: any) => {
      setErrorMessage(error.response?.data?.message || 'Payment verification failed')
      setPaymentStep('error')
    }
  })

  // Simulate payment processing (in real app, this would be handled by payment provider)
  const simulatePaymentProcessing = (sessionId: string) => {
    setTimeout(() => {
      verifyPaymentMutation.mutate(sessionId)
    }, 3000) // Simulate 3 second processing time
  }

  const handleInitiatePayment = () => {
    initiatePaymentMutation.mutate()
  }

  const handleUnlockForDemo = async () => {
    try {
      await api.post(`/resources/unlock/${file.id}`, { paymentAmount: 10.00 })
      setPaymentStep('success')
      setTimeout(() => {
        onSuccess()
      }, 2000)
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || 'Failed to unlock resource')
      setPaymentStep('error')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-white dark:bg-dark-900 rounded-2xl shadow-luxury border border-gray-200 dark:border-dark-800 w-full max-w-md"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-dark-800">
          <div className="flex items-center gap-3">
            <Lock className="w-6 h-6 text-red-500" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Unlock Resource
            </h2>
          </div>
          <button
            onClick={onClose}
            className="btn-ghost p-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* File Info */}
          <div className="bg-gray-50 dark:bg-dark-800 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-gray-500 mt-0.5" />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                  {file.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {file.description}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                  By {file.uploadedBy} • {new Date(file.uploadDate).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Payment Steps */}
          {paymentStep === 'initiate' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                <DollarSign className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="font-semibold text-blue-900 dark:text-blue-100">
                    Payment Required
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    This resource requires a one-time payment of $10.00 to unlock.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleInitiatePayment}
                  disabled={initiatePaymentMutation.isPending}
                  className="w-full btn-primary flex items-center justify-center gap-2"
                >
                  {initiatePaymentMutation.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <CreditCard className="w-5 h-5" />
                  )}
                  {initiatePaymentMutation.isPending ? 'Processing...' : 'Pay $10.00'}
                </button>

                <div className="text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    Or for demo purposes:
                  </p>
                  <button
                    onClick={handleUnlockForDemo}
                    className="text-sm text-primary-600 hover:text-primary-700 underline"
                  >
                    Unlock for Demo (Free)
                  </button>
                </div>
              </div>
            </div>
          )}

          {paymentStep === 'processing' && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Processing Payment
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Please wait while we verify your payment...
                </p>
                {paymentSession && (
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                    Session: {paymentSession.sessionId}
                  </p>
                )}
              </div>
            </div>
          )}

          {paymentStep === 'success' && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Payment Successful!
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  The resource has been unlocked. You can now view and download it.
                </p>
              </div>
            </div>
          )}

          {paymentStep === 'error' && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-900 dark:text-red-100">
                    Payment Failed
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    {errorMessage}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setPaymentStep('initiate')
                    setErrorMessage('')
                  }}
                  className="flex-1 btn-secondary"
                >
                  Try Again
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 btn-ghost"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {paymentStep === 'initiate' && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-dark-800">
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              Secure payment powered by CTN. Your payment information is encrypted and secure.
            </p>
          </div>
        )}
      </motion.div>
    </div>
  )
}