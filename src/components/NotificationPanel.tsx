import { AlertTriangle, X } from "lucide-react";
import { Button } from "./ui/button";

interface Notification {
  id: string;
  sensor: string;
  message: string;
  timestamp: Date;
  type: 'warning' | 'alert';
}

interface NotificationPanelProps {
  notifications: Notification[];
  onDismiss: (id: string) => void;
}

export function NotificationPanel({ notifications, onDismiss }: NotificationPanelProps) {
  if (notifications.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
        <p className="text-green-700">All sensors are within normal range</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="font-medium text-gray-800 mb-3">Recent Alerts</h3>
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`p-3 rounded-lg border flex items-start justify-between ${
            notification.type === 'alert' 
              ? 'bg-red-50 border-red-200' 
              : 'bg-yellow-50 border-yellow-200'
          }`}
        >
          <div className="flex items-start space-x-2">
            <AlertTriangle 
              className={`w-4 h-4 mt-0.5 ${
                notification.type === 'alert' ? 'text-red-600' : 'text-yellow-600'
              }`} 
            />
            <div>
              <p className={`text-sm font-medium ${
                notification.type === 'alert' ? 'text-red-800' : 'text-yellow-800'
              }`}>
                {notification.sensor}
              </p>
              <p className={`text-xs ${
                notification.type === 'alert' ? 'text-red-700' : 'text-yellow-700'
              }`}>
                {notification.message}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {notification.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDismiss(notification.id)}
            className="p-1 h-auto"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      ))}
    </div>
  );
}