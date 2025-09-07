import { Card } from "./ui/card.js";
import { Badge } from "./ui/badge.js";
import { MapPin, Heart, Activity, Volume2 } from "lucide-react";

const sensorConfig = {
  gps: {
    icon: MapPin,
    title: 'GPS Location',
    unit: '',
    color: 'text-blue-700',
    bgGradient: 'from-blue-50/90 to-cyan-50/90',
    iconBg: 'bg-blue-200/60'
  },
  heartbeat: {
    icon: Heart,
    title: 'Heart Rate',
    unit: 'BPM',
    color: 'text-rose-700',
    bgGradient: 'from-rose-50/90 to-pink-50/90',
    iconBg: 'bg-rose-200/60'
  },
  motion: {
    icon: Activity,
    title: 'Motion Sensor',
    unit: 'm/s²',
    color: 'text-violet-700',
    bgGradient: 'from-violet-50/90 to-purple-50/90',
    iconBg: 'bg-violet-200/60'
  },
  sound: {
    icon: Volume2,
    title: 'Sound Level',
    unit: 'dB',
    color: 'text-amber-700',
    bgGradient: 'from-amber-50/90 to-orange-50/90',
    iconBg: 'bg-amber-200/60'
  }
};

const statusColors = {
  low: 'bg-emerald-200/80 text-emerald-900 border-emerald-300/60',
  medium: 'bg-amber-200/80 text-amber-900 border-amber-300/60',
  high: 'bg-rose-200/80 text-rose-900 border-rose-300/60',
  normal: 'bg-blue-200/80 text-blue-900 border-blue-300/60'
};

export function SensorCard({ type, value, status, threshold, gpsData }) {
  const config = sensorConfig[type];
  const Icon = config.icon;

  // Handle GPS special case
  const handleGpsClick = () => {
    if (type === 'gps' && gpsData && gpsData.mapsUrl && gpsData.lat !== 0 && gpsData.lng !== 0) {
      window.open(gpsData.mapsUrl, '_blank');
    }
  };

  // Check if GPS has valid coordinates
  const hasValidGPS = gpsData && gpsData.lat !== 0 && gpsData.lng !== 0;

  return (
    <Card className={`relative overflow-hidden bg-gradient-to-br ${config.bgGradient} border border-white/40 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 backdrop-blur-sm ${type === 'gps' && hasValidGPS ? 'cursor-pointer' : ''}`} onClick={type === 'gps' && hasValidGPS ? handleGpsClick : undefined}>
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`${config.iconBg} p-2 rounded-lg shadow-sm border border-white/30`}>
              <Icon className={`w-5 h-5 ${config.color}`} />
            </div>
            <h3 className="font-semibold text-slate-900 text-sm">{config.title}</h3>
          </div>
          <Badge className={`${statusColors[status]} px-2 py-1 text-xs font-semibold rounded-full border`}>
            {status.toUpperCase()}
          </Badge>
        </div>
        
        <div className="space-y-3">
          {type === 'gps' && gpsData ? (
            // Enhanced GPS display
            <div className="space-y-2">
              {hasValidGPS ? (
                <>
                  <div className="bg-white/70 rounded-md px-3 py-2 border border-white/40">
                    <div className="text-xs font-medium text-slate-600 mb-1">Coordinates</div>
                    <div className="text-sm font-mono text-slate-900">
                      {gpsData.formattedLat}, {gpsData.formattedLng}
                    </div>
                  </div>
                  
                  {gpsData.satellites > 0 && (
                    <div className="bg-white/70 rounded-md px-3 py-2 border border-white/40">
                      <div className="text-xs font-medium text-slate-600 mb-1">Satellites</div>
                      <div className="text-sm font-semibold text-slate-900">
                        {gpsData.satellites} connected
                      </div>
                    </div>
                  )}
                  
                  <div className="text-xs text-blue-600 font-medium mt-2 flex items-center space-x-1">
                    <span>🗺️</span>
                    <span>Click to open in Google Maps</span>
                  </div>
                </>
              ) : (
                <div className="bg-white/70 rounded-md px-3 py-2 border border-white/40">
                  <div className="text-sm text-slate-600 text-center">
                    📍 Waiting for GPS signal...
                  </div>
                  <div className="text-xs text-slate-500 text-center mt-1">
                    No location data available
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Regular sensor display
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold text-slate-900">
                {typeof value === 'number' 
                  ? type === 'motion' 
                    ? value.toFixed(2) 
                    : value.toFixed(1) 
                  : value}
              </span>
              {config.unit && (
                <span className="text-sm font-medium text-slate-700">{config.unit}</span>
              )}
            </div>
          )}
          
          {threshold && type !== 'gps' && (
            <div className="bg-white/70 rounded-md px-3 py-1 border border-white/40">
              <p className="text-xs font-medium text-slate-700">
                Threshold: {threshold} {config.unit}
              </p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}