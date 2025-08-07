import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { MapPin, Heart, Activity, Volume2 } from "lucide-react";

const sensorConfig = {
  gps: {
    icon: MapPin,
    title: 'GPS Location',
    unit: '',
    color: 'text-blue-600'
  },
  heartbeat: {
    icon: Heart,
    title: 'Heart Rate',
    unit: 'BPM',
    color: 'text-red-600'
  },
  motion: {
    icon: Activity,
    title: 'Motion Sensor',
    unit: '',
    color: 'text-purple-600'
  },
  sound: {
    icon: Volume2,
    title: 'Sound Level',
    unit: 'dB',
    color: 'text-orange-600'
  }
};

const statusColors = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-red-100 text-red-800',
  normal: 'bg-blue-100 text-blue-800'
};

export function SensorCard({ type, value, status, threshold }) {
  const config = sensorConfig[type];
  const Icon = config.icon;

  return (
    <Card className="p-4 bg-white shadow-md hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Icon className={`w-5 h-5 ${config.color}`} />
          <h3 className="font-medium text-gray-800">{config.title}</h3>
        </div>
        <Badge className={statusColors[status]}>
          {status.toUpperCase()}
        </Badge>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-baseline space-x-1">
          <span className="text-2xl font-bold text-gray-900">
            {typeof value === 'number' ? value.toFixed(1) : value}
          </span>
          {config.unit && (
            <span className="text-sm text-gray-500">{config.unit}</span>
          )}
        </div>
        
        {threshold && type !== 'gps' && (
          <p className="text-xs text-gray-500">
            Threshold: {threshold} {config.unit}
          </p>
        )}
      </div>
    </Card>
  );
}