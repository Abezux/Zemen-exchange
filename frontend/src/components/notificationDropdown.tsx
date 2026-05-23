import React, { useState, useRef, useEffect } from 'react';
import { useNotificationStore, Notification } from '../store/notificationStore.ts';
import { Bell, Volume2, VolumeX, MailOpen, Terminal, CheckCircle2, AlertTriangle, Play, Flame, X, Check } from 'lucide-react';

export const NotificationDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    notifications,
    unreadCount,
    soundEnabled,
    toastNotification,
    pushPermissionStatus,
    toggleSound,
    markAsRead,
    markAllAsRead,
    dismissToast,
    requestPushPermission
  } = useNotificationStore();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format date helper
  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getNotificationStyles = (type: string) => {
    switch (type) {
      case 'ORDER_CREATED':
        return { bg: 'bg-blue-950/40 border-blue-800', text: 'text-blue-400', icon: <Play className="w-4 h-4" /> };
      case 'ORDER_PAID':
        return { bg: 'bg-yellow-950/40 border-yellow-800', text: 'text-yellow-400', icon: <Check className="w-4 h-4" /> };
      case 'ORDER_RELEASED':
        return { bg: 'bg-emerald-950/40 border-emerald-800', text: 'text-emerald-400', icon: <CheckCircle2 className="w-4 h-4" /> };
      case 'ORDER_CANCELLED':
      case 'ORDER_EXPIRED':
        return { bg: 'bg-zinc-900 border-zinc-800', text: 'text-zinc-400', icon: <X className="w-4 h-4" /> };
      case 'ORDER_DISPUTED':
        return { bg: 'bg-red-950/40 border-red-800', text: 'text-red-400', icon: <AlertTriangle className="w-4 h-4" /> };
      default:
        return { bg: 'bg-zinc-900 border-zinc-800', text: 'text-zinc-100', icon: <Terminal className="w-4 h-4" /> };
    }
  };

  return (
    <div className="relative" ref={dropdownRef} id="zemen-notification-element">
      {/* Sound / Bell HUD for standard interaction */}
      <div className="flex items-center gap-2">
        {/* Toggle Sound Settings */}
        <button
          onClick={toggleSound}
          className="p-1.5 transition-all duration-200 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white"
          title={soundEnabled ? "Mute audio alerts" : "Unmute audio alerts"}
        >
          {soundEnabled ? <Volume2 className="w-4.5 h-4.5 text-orange-500" /> : <VolumeX className="w-4.5 h-4.5 text-zinc-500" />}
        </button>

        {/* Bell Trigger */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative p-2 transition-all duration-200 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-full focus:outline-none"
          aria-label="View notifications"
        >
          <Bell className={`w-5 h-5 ${unreadCount > 0 ? "animate-wiggle" : ""}`} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-orange-600 text-[10px] font-bold text-white shadow-lg ring-2 ring-zinc-900 animate-pulse">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Floating Dropdown Card */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 md:w-96 rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl ring-1 ring-black/50 z-50 overflow-hidden transform origin-top-right transition-all">
          
          {/* Header */}
          <div className="p-3.5 bg-zinc-900/60 border-b border-zinc-800 flex justify-between items-center">
            <h2 className="text-sm font-bold text-zinc-100 flex items-center gap-1.5">
              Notifications
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-md bg-orange-600/20 text-orange-500 text-xs font-semibold">
                  {unreadCount} unread
                </span>
              )}
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={markAllAsRead}
                className="text-xs text-orange-500 hover:text-orange-400 font-medium transition-colors"
                title="Mark all notifications as read"
              >
                Mark all read
              </button>
            </div>
          </div>

          {/* FCM Push Notification Configuration Area */}
          <div className="px-3.5 py-2.5 bg-orange-950/20 border-b border-zinc-800 flex items-center justify-between text-xs">
            <span className="text-zinc-400">Desktop Push Notifications</span>
            {pushPermissionStatus === 'granted' ? (
              <span className="text-emerald-500 font-semibold flex items-center gap-1">
                ● Connected
              </span>
            ) : (
              <button
                onClick={requestPushPermission}
                className="px-2 py-1 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded text-[10px] transition-colors"
              >
                Enable
              </button>
            )}
          </div>

          {/* List Section */}
          <div className="max-h-[350px] overflow-y-auto divide-y divide-zinc-900 custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-zinc-600">
                <MailOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-medium">Inbox is empty</p>
                <p className="text-[11px] mt-1 text-zinc-700">Notifications will appear here in real-time.</p>
              </div>
            ) : (
              notifications.map((notif) => {
                const style = getNotificationStyles(notif.type);
                return (
                  <div
                    key={notif.id}
                    onClick={() => {
                      if (!notif.isRead) markAsRead(notif.id);
                    }}
                    className={`p-3.5 flex gap-3 transition-colors duration-150 cursor-pointer hover:bg-zinc-900/40 relative ${(!notif.isRead) ? 'bg-zinc-900/25' : ''}`}
                  >
                    {!notif.isRead && (
                      <span className="absolute top-4 left-1.5 w-1.5 h-1.5 bg-orange-500 rounded-full"></span>
                    )}
                    <div className={`mt-0.5 p-1.5 rounded-lg border h-8 w-8 flex items-center justify-center shrink-0 ${style.bg} ${style.text}`}>
                      {style.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-0.5">
                        <h3 className={`text-xs font-bold leading-none truncate ${!notif.isRead ? 'text-zinc-100' : 'text-zinc-400'}`}>
                          {notif.title}
                        </h3>
                        <span className="text-[10px] text-zinc-600 leading-none">
                          {formatTime(notif.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 leading-relaxed break-words">
                        {notif.message}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Floating HUD notification slide toast banner context */}
      {toastNotification && (
        <div className="fixed bottom-6 right-6 max-w-sm w-full bg-zinc-950 border border-orange-500/40 hover:border-orange-500 rounded-xl shadow-2xl p-4 z-[9999] flex gap-3 animate-slide-in-right transform duration-300">
          <div className="p-2 bg-orange-600/10 text-orange-500 rounded-xl border border-orange-500/10 flex items-center justify-center h-10 w-10 shrink-0">
            <Flame className="w-5 h-5 text-orange-500 animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-zinc-100 uppercase tracking-wider mb-0.5">
              {toastNotification.title}
            </h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              {toastNotification.message}
            </p>
          </div>
          <button
            onClick={dismissToast}
            className="p-1 hover:bg-zinc-900 rounded-full h-fit text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
