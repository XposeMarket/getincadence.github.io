'use client'

import { formatDistanceToNow } from 'date-fns'
import { 
  MessageSquare, 
  Phone, 
  Mail, 
  CheckSquare, 
  Handshake,
  UserPlus,
  Edit,
  FileText
} from 'lucide-react'

interface Activity {
  id: string
  type: string
  content: string
  created_at: string
  users: { full_name: string } | null
}

interface ActivityTimelineProps {
  activities: Activity[]
}

export default function ActivityTimeline({ activities }: ActivityTimelineProps) {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'note': return <MessageSquare size={16} />
      case 'call': return <Phone size={16} />
      case 'email': return <Mail size={16} />
      case 'task': return <CheckSquare size={16} />
      case 'deal': return <Handshake size={16} />
      case 'created': return <UserPlus size={16} />
      case 'updated': return <Edit size={16} />
      default: return <FileText size={16} />
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'note': return 'bg-blue-100 text-blue-600'
      case 'call': return 'bg-green-100 text-green-600'
      case 'email': return 'bg-purple-100 text-purple-600'
      case 'task': return 'bg-yellow-100 text-yellow-600'
      case 'deal': return 'bg-pink-100 text-pink-600'
      case 'created': return 'bg-teal-100 text-teal-600'
      case 'updated': return 'bg-gray-100 text-gray-600'
      default: return 'bg-gray-100 text-gray-600'
    }
  }

  const getActivityLabel = (type: string) => {
    switch (type) {
      case 'note': return 'Note added'
      case 'call': return 'Call logged'
      case 'email': return 'Email sent'
      case 'task': return 'Task completed'
      case 'deal': return 'Deal updated'
      case 'created': return 'Contact created'
      case 'updated': return 'Record updated'
      default: return 'Activity'
    }
  }

  if (activities.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        No activity yet
      </div>
    )
  }

  return (
    <div className="divide-y divide-gray-100">
      {activities.map((activity, index) => (
        <div key={activity.id} className="p-4 hover:bg-gray-50 transition-colors">
          <div className="flex gap-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${getActivityColor(activity.type)}`}>
              {getActivityIcon(activity.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-gray-900">
                  {getActivityLabel(activity.type)}
                </span>
                {activity.users && (
                  <>
                    <span className="text-gray-400">by</span>
                    <span className="text-gray-600">{activity.users.full_name}</span>
                  </>
                )}
              </div>
              {activity.content && (
                <p className="mt-1 text-sm text-gray-600 whitespace-pre-wrap">
                  {activity.content}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-400">
                {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
