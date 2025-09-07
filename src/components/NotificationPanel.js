import { AlertTriangle, X } from "lucide-react";
import { Button } from "./ui/button.js";

export function NotificationPanel({ notifications, onDismiss }) {
  if (notifications.length === 0) {
    return (
      <div className="bg-gradient-to-r from-emerald-100/80 to-teal-100/80 border border-emerald-300/40 rounded-xl p-5 text-center shadow-sm backdrop-blur-sm">
        <div className="flex items-center justify-center space-x-2">
          <div className="w-2 h-2 bg-emerald-600 rounded-full"></div>
          <p className="text-emerald-800 font-semibold">✅ All sensors are within normal range</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-slate-900 mb-4 flex items-center">
        <div className="w-2 h-2 bg-slate-600 rounded-full mr-2"></div>
        Recent Alerts
      </h3>
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`p-4 rounded-xl border shadow-sm flex items-start justify-between transition-all duration-300 backdrop-blur-sm ${
            notification.persistent 
              ? 'bg-gradient-to-r from-rose-100/80 to-red-100/80 border-rose-300/40 ring-2 ring-rose-200/50 shadow-md' 
              : notification.type === 'alert' 
                ? 'bg-gradient-to-r from-rose-100/80 to-pink-100/80 border-rose-300/40' 
                : 'bg-gradient-to-r from-amber-100/80 to-yellow-100/80 border-amber-300/40'
          }`}
        >
          <div className="flex items-start space-x-3">
            <div className={`p-1.5 rounded-lg shadow-sm border border-slate-300/30 ${
              notification.persistent
                ? 'bg-rose-200/80'
                : notification.type === 'alert' ? 'bg-rose-200/80' : 'bg-amber-200/80'
            }`}>
              <AlertTriangle 
                className={`w-4 h-4 ${
                  notification.persistent
                    ? 'text-rose-800'
                    : notification.type === 'alert' ? 'text-rose-700' : 'text-amber-700'
                }`} 
              />
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <p className={`text-sm font-semibold ${
                  notification.persistent
                    ? 'text-rose-900'
                    : notification.type === 'alert' ? 'text-rose-900' : 'text-amber-900'
                }`}>
                  {notification.sensor}
                </p>
                {notification.persistent && (
                  <span className="bg-rose-300/80 text-rose-900 text-xs font-bold px-2 py-0.5 rounded-full border border-rose-400/40">
                    PERSISTENT
                  </span>
                )}
              </div>
              <p className={`text-sm mt-1 leading-relaxed ${
                notification.persistent
                  ? 'text-rose-800'
                  : notification.type === 'alert' ? 'text-rose-800' : 'text-amber-800'
              }`}>
                {notification.message}
              </p>
              {notification.persistent && (
                <div className="bg-slate-100/80 rounded-lg px-3 py-2 mt-2 border border-slate-300/40">
                  <p className="text-xs text-rose-800 font-medium">
                    {notification.id === 'loud-noise-persistent' 
                      ? "🔊 This alert will remain until sound drops to 20dB or below"
                      : notification.id === 'abnormal-heart-rate'
                      ? "💓 This alert will remain until heart rate pattern stabilizes"
                      : "⚠️ This is a persistent alert"
                    }
                  </p>
                </div>
              )}
              <p className="text-xs text-slate-600 mt-2 font-medium">
                🕐 {notification.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDismiss(notification.id)}
            className={`p-2 h-auto rounded-lg transition-all duration-200 border border-slate-300/40 ${
              notification.persistent 
                ? 'opacity-40 cursor-not-allowed hover:bg-transparent' 
                : 'hover:bg-slate-200/80 hover:shadow-sm'
            }`}
            disabled={notification.persistent}
          >
            <X className="w-4 h-4 text-slate-700" />
          </Button>
        </div>
      ))}
    </div>
  );
}