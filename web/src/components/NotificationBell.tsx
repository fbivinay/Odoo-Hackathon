import { Bell } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useNotifications } from '@/lib/useNotifications'

export function NotificationBell() {
  const { unreadCount } = useNotifications()
  const navigate = useNavigate()

  return (
    <button
      type="button"
      onClick={() => navigate('/notifications')}
      aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
      className="relative flex size-8 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
    >
      <Bell className="size-4" />
      {unreadCount > 0 && (
        <span className="absolute top-0.5 right-0.5 flex size-4 items-center justify-center rounded-full bg-rose-600 text-[9px] font-medium text-white">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  )
}
