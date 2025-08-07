import { useState, useEffect } from "react";
import { SensorCard } from "./SensorCard";
import { NotificationPanel } from "./NotificationPanel";
import { Logo } from "./Logo";
import { Bell } from "lucide-react";
import { Badge } from "./ui/badge.js";

const thresholds = {
  heartbeat: { low: 60, high: 100 },
  motion: { low: 2, high: 8 },
  sound: { low: 40, high: 80 }
};

export function Dashboard() {
  const [sensorData, setSensorData] = useState({
    gps: { lat: 40.7128, lng: -74.0060, address: "New York, NY" },
    heartbeat: 75,
    motion: 3.2,
    sound: 45
  });

  const [notifications, setNotifications] = useState([]);

  // Simulate real-time sensor data
  useEffect(() => {
    const interval = setInterval(() => {
      setSensorData(prev => {
        const newData = {
          ...prev,
          heartbeat: Math.max(50, Math.min(120, prev.heartbeat + (Math.random() - 0.5) * 10)),
          motion: Math.max(0, Math.min(10, prev.motion + (Math.random() - 0.5) * 2)),
          sound: Math.max(20, Math.min(100, prev.sound + (Math.random() - 0.5) * 15))
        };

        // Check thresholds and create notifications
        checkThresholds(newData);
        
        return newData;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const checkThresholds = (data) => {
    const newNotifications = [];

    // Check heartbeat
    if (data.heartbeat < thresholds.heartbeat.low) {
      newNotifications.push({
        id: `heart-low-${Date.now()}`,
        sensor: 'Heart Rate',
        message: `Low heart rate detected: ${data.heartbeat.toFixed(0)} BPM`,
        timestamp: new Date(),
        type: 'warning'
      });
    } else if (data.heartbeat > thresholds.heartbeat.high) {
      newNotifications.push({
        id: `heart-high-${Date.now()}`,
        sensor: 'Heart Rate',
        message: `High heart rate detected: ${data.heartbeat.toFixed(0)} BPM`,
        timestamp: new Date(),
        type: 'alert'
      });
    }

    // Check motion
    if (data.motion > thresholds.motion.high) {
      newNotifications.push({
        id: `motion-high-${Date.now()}`,
        sensor: 'Motion Sensor',
        message: `High motion detected: ${data.motion.toFixed(1)}`,
        timestamp: new Date(),
        type: 'alert'
      });
    }

    // Check sound
    if (data.sound > thresholds.sound.high) {
      newNotifications.push({
        id: `sound-high-${Date.now()}`,
        sensor: 'Sound Level',
        message: `High noise level: ${data.sound.toFixed(0)} dB`,
        timestamp: new Date(),
        type: 'warning'
      });
    }

    if (newNotifications.length > 0) {
      setNotifications(prev => [...newNotifications, ...prev].slice(0, 10));
    }
  };

  const getStatus = (value, type) => {
    const threshold = thresholds[type];
    if (value < threshold.low) return 'low';
    if (value > threshold.high) return 'high';
    return 'medium';
  };

  const dismissNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Logo size="md" variant="dark" />
            <div className="flex items-center space-x-1">
              <Bell className="w-5 h-5 text-gray-600" />
              {notifications.length > 0 && (
                <Badge className="bg-red-500 text-white text-xs">
                  {notifications.length}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-md mx-auto p-4 space-y-6">
        {/* Sensor Cards Grid */}
        <div className="grid grid-cols-2 gap-4">
          <SensorCard
            type="gps"
            value={sensorData.gps.address}
            status="normal"
          />
          <SensorCard
            type="heartbeat"
            value={sensorData.heartbeat}
            status={getStatus(sensorData.heartbeat, 'heartbeat')}
            threshold={thresholds.heartbeat.high}
          />
          <SensorCard
            type="motion"
            value={sensorData.motion}
            status={getStatus(sensorData.motion, 'motion')}
            threshold={thresholds.motion.high}
          />
          <SensorCard
            type="sound"
            value={sensorData.sound}
            status={getStatus(sensorData.sound, 'sound')}
            threshold={thresholds.sound.high}
          />
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <NotificationPanel
            notifications={notifications}
            onDismiss={dismissNotification}
          />
        </div>

        {/* Status Summary */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <h3 className="font-medium text-gray-800 mb-2">System Status</h3>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">All Sensors</span>
            <Badge className="bg-green-100 text-green-800">
              {notifications.length === 0 ? 'NORMAL' : 'MONITORING'}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}