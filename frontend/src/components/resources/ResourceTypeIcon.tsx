'use client'

import { 
  BookOpen, 
  FileText, 
  Trophy, 
  Presentation, 
  Target 
} from 'lucide-react'

interface ResourceTypeIconProps {
  type: string
  className?: string
}

export function ResourceTypeIcon({ type, className = "w-5 h-5" }: ResourceTypeIconProps) {
  const getIcon = () => {
    switch (type) {
      case 'TOPPER_NOTES':
        return <Trophy className={`${className} text-yellow-500`} />
      case 'PYQS':
        return <FileText className={`${className} text-blue-500`} />
      case 'CASE_DECKS':
        return <Presentation className={`${className} text-purple-500`} />
      case 'PRESENTATIONS':
        return <Presentation className={`${className} text-green-500`} />
      case 'STRATEGIES':
        return <Target className={`${className} text-red-500`} />
      default:
        return <BookOpen className={`${className} text-gray-500`} />
    }
  }

  return getIcon()
}

export function getResourceTypeLabel(type: string): string {
  switch (type) {
    case 'TOPPER_NOTES':
      return 'Topper Notes'
    case 'PYQS':
      return 'Previous Year Questions'
    case 'CASE_DECKS':
      return 'Case Competition Decks'
    case 'PRESENTATIONS':
      return 'Presentations'
    case 'STRATEGIES':
      return 'Study Strategies'
    default:
      return type.replace('_', ' ')
  }
}