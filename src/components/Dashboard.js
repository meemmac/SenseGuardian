import { useState, useEffect } from "react";
import { SensorCard } from "./SensorCard";
import { NotificationPanel } from "./NotificationPanel";
import { Logo } from "./Logo";
import { Bell } from "lucide-react";
import { Badge } from "./ui/badge.js";
import { db, auth } from "../firebase";   // ✅ Import Firebase and auth
import { ref, onValue } from "firebase/database";
import { onAuthStateChanged } from "firebase/auth";

const thresholds = {
  heartbeat: { low: 60, high: 100 },
  motion: { low: 1.0, high: 3.0 }, // m/s² - more realistic acceleration thresholds
  sound: { low: 40, high: 80 }
};

export function Dashboard() {
  const [sensorData, setSensorData] = useState({
    gps: { 
      lat: 0, 
      lng: 0, 
      address: "Waiting for GPS signal...", 
      satellites: 0, 
      mapsUrl: "", 
      formattedLat: "0.000000", 
      formattedLng: "0.000000" 
    },
    heartbeat: 0,
    motion: 0,
    sound: 0
  });

  const [notifications, setNotifications] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState("Initializing...");
  const [lastUpdate, setLastUpdate] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Sound monitoring states - 1-minute rolling average approach
  const [soundRollingAverage, setSoundRollingAverage] = useState({
    readings: [], // Store sound readings with timestamps for 1-minute window
    currentAverage: 0, // Current 1-minute average
    notificationActive: false,
    averageStartTime: null // Track when we started monitoring average
  });

  // Heart rate monitoring states
  const [heartRateMonitoring, setHeartRateMonitoring] = useState({
    readings: [], // Store last 10 readings with timestamps
    increases: 0, // Count of consecutive increases
    abnormalNotificationActive: false,
    lastReading: null,
    abnormalStartTime: null, // Track when abnormal pattern started
    isAbnormalPattern: false, // Track if we're in an abnormal pattern
    graceStartTime: null, // Track when grace period started for normal readings
    isInGracePeriod: false // Track if we're in a grace period
  });

  // Motion monitoring states
  const [motionMonitoring, setMotionMonitoring] = useState({
    readings: [], // Store last 10 motion readings with timestamps
    lastReading: null,
    rapidChanges: 0, // Count of rapid motion changes
    isIntenseMotion: false, // Track if we're in intense motion period
    intenseStartTime: null, // Track when intense motion started
    notificationActive: false, // Track if notification is active
    changeThreshold: 1.0, // Motion change threshold in m/s² to be considered "intense"
    consecutiveChangesThreshold: 4 // Number of consecutive changes to trigger alert
  });

useEffect(() => {
  // Wait for authentication before trying to access Firebase data
  const authUnsubscribe = onAuthStateChanged(auth, (user) => {
    if (user) {
      console.log("User authenticated:", user.uid);
      setIsAuthenticated(true);
    } else {
      console.log("No user authenticated");
      setConnectionStatus("Not authenticated");
      setIsAuthenticated(false);
    }
  });

  return () => authUnsubscribe();
}, []);

useEffect(() => {
  // Only try to access Firebase data if authenticated
  if (!isAuthenticated) {
    console.log("Waiting for authentication...");
    return;
  }

  console.log("Setting up Firebase real-time listener");
  // Try different paths in case the data structure changed
 // const paths = ["sensor_data/latest", "sensors", "sensor_readings"];
  const paths = ["sensor_data/latest"];

  
  let unsubscribe = null;
  let connected = false;

  // Try each path until we find data
  for (let i = 0; i < paths.length && !connected; i++) {
    // Skip empty paths to avoid Firebase errors
    if (!paths[i]) continue;
    
    const sensorRef = ref(db, paths[i]);
    
    try {
      unsubscribe = onValue(sensorRef, (snapshot) => {
        if (snapshot.exists()) {
          connected = true;
          const data = snapshot.val();
          console.log("Firebase data received:", data);
          // Log accelerometer values specifically to debug motion issues
          if (data.mpu6050) {
            console.log("MPU6050 values:", {
              ax: data.mpu6050.ax,
              ay: data.mpu6050.ay,
              az: data.mpu6050.az,
              raw_magnitude: Math.sqrt(
                Math.pow(data.mpu6050.ax || 0, 2) + 
                Math.pow(data.mpu6050.ay || 0, 2) + 
                Math.pow(data.mpu6050.az || 0, 2)
              ),
              normalized: Math.sqrt(
                Math.pow(data.mpu6050.ax || 0, 2) + 
                Math.pow(data.mpu6050.ay || 0, 2) + 
                Math.pow(data.mpu6050.az || 0, 2)
              ) - 9.8
            });
          } else if (data.ax !== undefined) {
            console.log("Direct accelerometer values:", {
              ax: data.ax,
              ay: data.ay,
              az: data.az,
              raw_magnitude: Math.sqrt(
                Math.pow(data.ax || 0, 2) + 
                Math.pow(data.ay || 0, 2) + 
                Math.pow(data.az || 0, 2)
              ),
              normalized: Math.sqrt(
                Math.pow(data.ax || 0, 2) + 
                Math.pow(data.ay || 0, 2) + 
                Math.pow(data.az || 0, 2)
              ) - 9.8
            });
          }
          setConnectionStatus("Connected");
          setLastUpdate(new Date());

          // Handle different data structures
          // Case 1: ESP32 format from your Arduino code
          if (data.mpu6050 && data.max30102 && data.sound && data.gps) {
            // Calculate acceleration magnitude from MPU6050 accelerometer data
            const ax = data.mpu6050.ax || 0;
            const ay = data.mpu6050.ay || 0;
            const az = data.mpu6050.az || 0;
            const motionMagnitude = Math.sqrt(ax*ax + ay*ay + az*az);
            
            // Calculate motion acceleration using the specified formula: Math.sqrt(ax*ax + ay*ay + az*az) - 9.8
            // This gives us the net acceleration in m/s² by removing gravity component
            const motionValue = Math.sqrt(ax*ax + ay*ay + az*az) - 9.8;
            
            console.log("Calculated motion acceleration:", {
              motionMagnitude,
              motionValue,
              formattedValue: parseFloat(motionValue.toFixed(2))
            });

            // Enhanced GPS data processing
            const lat = data.gps.latitude || 0;
            const lng = data.gps.longitude || 0;
            const satellites = data.gps.satellites || data.gps.sat || 0; // Check both possible field names
            
            // Format coordinates with better precision
            const formattedLat = lat.toFixed(6);
            const formattedLng = lng.toFixed(6);
            
            // Create Google Maps link
            const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
            
            // Create enhanced address display
            let addressDisplay;
            if (lat === 0 && lng === 0) {
              addressDisplay = "Waiting for GPS signal...";
            } else if (satellites > 0) {
              addressDisplay = `${formattedLat}, ${formattedLng} • ${satellites} sats`;
            } else {
              addressDisplay = `${formattedLat}, ${formattedLng}`;
            }

            setSensorData({
              gps: {
                lat: lat,
                lng: lng,
                address: addressDisplay,
                satellites: satellites,
                mapsUrl: mapsUrl,
                formattedLat: formattedLat,
                formattedLng: formattedLng
              },
              heartbeat: parseFloat((data.max30102.heartRate || 0).toFixed(1)),
              motion: parseFloat(motionValue.toFixed(2)), // acceleration in m/s² (net motion excluding gravity)
              sound: parseFloat((data.sound.level || 0).toFixed(1))
            });
            
            checkThresholds({
              heartbeat: parseFloat((data.max30102.heartRate || 0).toFixed(1)),
              motion: parseFloat(motionValue.toFixed(2)),
              sound: parseFloat((data.sound.level || 0).toFixed(1))
            });
          }
          // Case 2: Direct sensor values with accelerometer components
          else if (data.ax !== undefined && data.ay !== undefined && data.az !== undefined) {
            // Calculate acceleration magnitude from accelerometer data
            const ax = data.ax || 0;
            const ay = data.ay || 0;
            const az = data.az || 0;
            const motionMagnitude = Math.sqrt(ax*ax + ay*ay + az*az);
            
            // Calculate net acceleration by removing gravity (9.8 m/s²) to get actual motion acceleration
            const motionValue = Math.max(0, Math.abs(motionMagnitude - 9.8));
            
            console.log("Calculated motion acceleration (Case 2):", {
              motionMagnitude,
              motionValue,
              formattedValue: parseFloat(motionValue.toFixed(2))
            });

            // Enhanced GPS data processing for alternate data structure
            const lat = data.latitude || data.lat || 0;
            const lng = data.longitude || data.lng || 0;
            const satellites = data.satellites || data.sat || 0;
            
            // Format coordinates with better precision
            const formattedLat = lat.toFixed(6);
            const formattedLng = lng.toFixed(6);
            
            // Create Google Maps link
            const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
            
            // Create enhanced address display
            let addressDisplay;
            if (lat === 0 && lng === 0) {
              addressDisplay = "Waiting for GPS signal...";
            } else if (satellites > 0) {
              addressDisplay = `${formattedLat}, ${formattedLng} • ${satellites} sats`;
            } else if (data.location) {
              addressDisplay = data.location;
            } else {
              addressDisplay = `${formattedLat}, ${formattedLng}`;
            }

            setSensorData({
              gps: {
                lat: lat,
                lng: lng,
                address: addressDisplay,
                satellites: satellites,
                mapsUrl: mapsUrl,
                formattedLat: formattedLat,
                formattedLng: formattedLng
              },
              heartbeat: parseFloat((data.heartbeat || data.heart_rate || data.bpm || 0).toFixed(1)),
              motion: parseFloat(motionValue.toFixed(2)), // acceleration in m/s² (net motion excluding gravity)
              sound: parseFloat((data.sound || data.noise || data.sound_level || 0).toFixed(1))
            });

            checkThresholds({
              heartbeat: parseFloat((data.heartbeat || data.heart_rate || data.bpm || 0).toFixed(1)),
              motion: parseFloat(motionValue.toFixed(2)),
              sound: parseFloat((data.sound || data.noise || data.sound_level || 0).toFixed(1))
            });
          } 
          // Case 3: Direct sensor values without accelerometer components
          else if (data.heartbeat !== undefined || data.heart_rate !== undefined) {
            const heartValue = data.heartbeat || data.heart_rate || data.bpm || 0;
            const motionValue = data.motion || data.acceleration || 0;
            const soundValue = data.sound || data.noise || data.sound_level || 0;
            
            // Enhanced GPS data processing for case 3
            const lat = data.latitude || data.lat || 0;
            const lng = data.longitude || data.lng || 0;
            const satellites = data.satellites || data.sat || 0;
            
            // Format coordinates with better precision
            const formattedLat = lat.toFixed(6);
            const formattedLng = lng.toFixed(6);
            
            // Create Google Maps link
            const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
            
            // Create enhanced address display
            let addressDisplay;
            if (lat === 0 && lng === 0) {
              addressDisplay = "Waiting for GPS signal...";
            } else if (satellites > 0) {
              addressDisplay = `${formattedLat}, ${formattedLng} • ${satellites} sats`;
            } else if (data.location) {
              addressDisplay = data.location;
            } else {
              addressDisplay = `${formattedLat}, ${formattedLng}`;
            }
            
            setSensorData({
              gps: {
                lat: lat,
                lng: lng,
                address: addressDisplay,
                satellites: satellites,
                mapsUrl: mapsUrl,
                formattedLat: formattedLat,
                formattedLng: formattedLng
              },
              heartbeat: parseFloat((heartValue).toFixed(1)),
              motion: parseFloat((motionValue).toFixed(2)),
              sound: parseFloat((soundValue).toFixed(1))
            });
            
            checkThresholds({
              heartbeat: parseFloat((heartValue).toFixed(1)),
              motion: parseFloat((motionValue).toFixed(2)),
              sound: parseFloat((soundValue).toFixed(1))
            });
          }
          // Case 3: Nested under key
          else {
            // Try to find the first object with sensor data
            Object.values(data).forEach(value => {
              if (typeof value === 'object' && value !== null) {
                if (value.heartbeat || value.heart_rate || value.bpm || 
                    value.mpu6050 || value.max30102) {
                  // Recursively call onValue with this object
                  onValue(ref(db, `${paths[i]}/${Object.keys(data).find(key => data[key] === value)}`), 
                    snapshot => {
                      const nestedData = snapshot.val();
                      setLastUpdate(new Date());
                      
                      // Enhanced GPS data processing for nested data
                      const lat = nestedData.latitude || nestedData.lat || 0;
                      const lng = nestedData.longitude || nestedData.lng || 0;
                      const satellites = nestedData.satellites || nestedData.sat || 0;
                      
                      // Format coordinates with better precision
                      const formattedLat = lat.toFixed(6);
                      const formattedLng = lng.toFixed(6);
                      
                      // Create Google Maps link
                      const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
                      
                      // Create enhanced address display
                      let addressDisplay;
                      if (lat === 0 && lng === 0) {
                        addressDisplay = "Waiting for GPS signal...";
                      } else if (satellites > 0) {
                        addressDisplay = `${formattedLat}, ${formattedLng} • ${satellites} sats`;
                      } else if (nestedData.location) {
                        addressDisplay = nestedData.location;
                      } else {
                        addressDisplay = `${formattedLat}, ${formattedLng}`;
                      }
                      
                      setSensorData({
                        gps: {
                          lat: lat,
                          lng: lng,
                          address: addressDisplay,
                          satellites: satellites,
                          mapsUrl: mapsUrl,
                          formattedLat: formattedLat,
                          formattedLng: formattedLng
                        },
                        heartbeat: parseFloat((nestedData.heartbeat || nestedData.heart_rate || nestedData.bpm || 0).toFixed(1)),
                        motion: parseFloat((nestedData.motion || nestedData.acceleration || 0).toFixed(2)),
                        sound: parseFloat((nestedData.sound || nestedData.noise || nestedData.sound_level || 0).toFixed(1))
                      });
                    });
                }
              }
            });
          }
        } else {
          console.log(`No data at path: ${paths[i]}`);
          if (i === paths.length - 1) {
            setConnectionStatus("No data found");
          }
        }
      }, (error) => {
        console.error(`Firebase error for path ${paths[i]}:`, error);
        
        // Check if this is a permission error
        if (error.code === 'PERMISSION_DENIED') {
          console.log("Permission denied. Please check Firebase rules.");
          setConnectionStatus("Permission denied");
          
          // If this is the last path we tried, show permission error
          if (i === paths.length - 1) {
            alert("Firebase access denied. Please check your database rules in the Firebase console.");
          }
        } else if (i === paths.length - 1) {
          setConnectionStatus(`Error: ${error.message}`);
          
          // Try to reconnect after 5 seconds
          setTimeout(() => {
            console.log("Attempting to reconnect to Firebase...");
            setConnectionStatus("Reconnecting...");
            // This will trigger the useEffect hook again
            const sensorRef = ref(db, paths[0]);
            onValue(sensorRef, () => {}, (error) => {
              console.error("Reconnection failed:", error);
            });
          }, 5000);
        }
      });
      
      // Give a brief timeout to see if data comes in
      setTimeout(() => {
        if (!connected && i === paths.length - 1) {
          setConnectionStatus("No data connection");
        }
      }, 3000);
    } catch (error) {
      console.error(`Error setting up Firebase listener for path ${paths[i]}:`, error);
    }
  }

  return () => {
    if (unsubscribe) unsubscribe();
  };
}, [isAuthenticated]);

  // Function to analyze heart rate patterns for abnormal increases
  const analyzeHeartRatePattern = (currentHeartRate, currentTime) => {
    setHeartRateMonitoring(prev => {
      const newState = { ...prev };
      
      // Add current reading to the array
      const newReading = { value: currentHeartRate, timestamp: currentTime };
      newState.readings = [...prev.readings, newReading].slice(-10); // Keep last 10 readings
      
      // Check for consecutive increases
      if (prev.lastReading && currentHeartRate > prev.lastReading + 2) {
        // Heart rate increased by more than 2 BPM
        newState.increases = prev.increases + 1;
        
        // Clear grace period if heart rate is increasing again
        if (prev.isInGracePeriod) {
          newState.isInGracePeriod = false;
          newState.graceStartTime = null;
          console.log("Heart rate increasing again during grace period, resuming abnormal pattern tracking");
        }
        
        // Start tracking abnormal pattern if we hit 3 consecutive increases
        if (newState.increases >= 3 && !prev.isAbnormalPattern) {
          newState.isAbnormalPattern = true;
          newState.abnormalStartTime = currentTime;
          console.log("Abnormal heart rate pattern started, starting 30-second timer");
        }
      } else if (prev.lastReading && currentHeartRate <= prev.lastReading) {
        // Heart rate stabilized or decreased
        if (prev.isAbnormalPattern && !prev.isInGracePeriod && !prev.abnormalNotificationActive) {
          // Start grace period for brief stabilization (allow 5 seconds)
          newState.increases = 0;
          newState.isInGracePeriod = true;
          newState.graceStartTime = currentTime;
          console.log("Heart rate stabilized, starting 5-second grace period");
        } else if (prev.isInGracePeriod && prev.graceStartTime) {
          // Check if grace period has expired (5 seconds)
          const graceElapsed = currentTime - prev.graceStartTime;
          if (graceElapsed >= 5000) { // 5 seconds = 5,000 milliseconds
            console.log("Heart rate grace period expired, resetting abnormal pattern tracking");
            newState.increases = 0;
            newState.isAbnormalPattern = false;
            newState.abnormalStartTime = null;
            newState.isInGracePeriod = false;
            newState.graceStartTime = null;
          }
        } else if (prev.abnormalNotificationActive) {
          // Continue checking for stabilization after notification is active
          newState.increases = 0;
        }
      }
      
      newState.lastReading = currentHeartRate;
      
      // Check if abnormal pattern has persisted for 30 seconds (30,000 ms)
      if (newState.isAbnormalPattern && newState.abnormalStartTime && !prev.abnormalNotificationActive) {
        const timeElapsed = currentTime - newState.abnormalStartTime;
        if (timeElapsed >= 30000) { // 30 seconds = 30,000 milliseconds
          newState.abnormalNotificationActive = true;
          
          // Determine if this is during loud noise or independent
          const isDuringLoudNoise = soundRollingAverage.notificationActive;
          const message = isDuringLoudNoise 
            ? `Abnormal heart rate pattern for 30+ seconds during loud noise: ${currentHeartRate.toFixed(1)} BPM`
            : `Abnormal heart rate pattern for 30+ seconds: ${currentHeartRate.toFixed(1)} BPM`;
          
          // Add persistent abnormal heart rate notification
          setNotifications(prevNotifications => {
            // Remove any existing abnormal heart rate notifications
            const filteredNotifications = prevNotifications.filter(n => n.id !== 'abnormal-heart-rate');
            
            return [{
              id: 'abnormal-heart-rate',
              sensor: "Heart Rate",
              message: message,
              timestamp: currentTime,
              type: "alert",
              persistent: true,
              context: isDuringLoudNoise ? 'loud-noise' : 'independent'
            }, ...filteredNotifications];
          });
          
          console.log("30-second abnormal heart rate notification activated:", {
            increases: newState.increases,
            duringLoudNoise: isDuringLoudNoise,
            currentRate: currentHeartRate
          });
        }
      }
      
      // Reset abnormal notification if heart rate stabilizes for 5 consecutive readings
      if (newState.increases === 0 && prev.abnormalNotificationActive) {
        const recentReadings = newState.readings.slice(-5);
        if (recentReadings.length >= 5) {
          const isStable = recentReadings.every((reading, index) => {
            if (index === 0) return true;
            return Math.abs(reading.value - recentReadings[index - 1].value) <= 2;
          });
          
          if (isStable) {
            newState.abnormalNotificationActive = false;
            newState.isAbnormalPattern = false;
            newState.abnormalStartTime = null;
            
            // Remove the persistent abnormal heart rate notification
            setNotifications(prevNotifications => 
              prevNotifications.filter(n => n.id !== 'abnormal-heart-rate')
            );
            
            console.log("Heart rate pattern normalized, removing abnormal notification");
          }
        }
      }
      
      return newState;
    });
  };

  // Function to analyze sound levels using 1-minute rolling average
  const analyzeSoundLevel = (currentSound, currentTime) => {
    setSoundRollingAverage(prev => {
      const newState = { ...prev };
      
      // Add current reading to the array with timestamp
      const newReading = { value: currentSound, timestamp: currentTime };
      newState.readings = [...prev.readings, newReading];
      
      // Keep only readings from the last 60 seconds (1 minute)
      const oneMinuteAgo = new Date(currentTime.getTime() - 60000);
      newState.readings = newState.readings.filter(reading => reading.timestamp >= oneMinuteAgo);
      
      // Calculate average of readings in the last minute
      if (newState.readings.length > 0) {
        const sum = newState.readings.reduce((total, reading) => total + reading.value, 0);
        newState.currentAverage = sum / newState.readings.length;
      } else {
        newState.currentAverage = currentSound;
      }
      
      console.log("Sound analysis:", {
        currentSound: currentSound.toFixed(1),
        readingsCount: newState.readings.length,
        oneMinuteAverage: newState.currentAverage.toFixed(1),
        threshold: "80dB"
      });
      
      // Check if 1-minute average is above 80dB and we have enough data (at least 10 readings)
      if (newState.currentAverage >= 80 && newState.readings.length >= 10 && !prev.notificationActive) {
        newState.notificationActive = true;
        newState.averageStartTime = currentTime;
        
        // Add persistent loud noise notification
        setNotifications(prevNotifications => {
          // Remove any existing loud noise notifications
          const filteredNotifications = prevNotifications.filter(n => n.id !== 'loud-noise-persistent');
          
          return [{
            id: 'loud-noise-persistent',
            sensor: "Sound Level",
            message: `Loud noise detected: 1-minute average ${newState.currentAverage.toFixed(1)}dB (threshold: 80dB)`,
            timestamp: currentTime,
            type: "alert",
            persistent: true
          }, ...filteredNotifications];
        });
        
        console.log("1-minute average loud noise notification activated:", {
          average: newState.currentAverage.toFixed(1),
          readingsCount: newState.readings.length
        });
      }
      
      // Clear notification if 1-minute average drops below 80dB
      else if (newState.currentAverage < 80 && prev.notificationActive && newState.readings.length >= 10) {
        newState.notificationActive = false;
        newState.averageStartTime = null;
        
        // Remove the persistent loud noise notification
        setNotifications(prevNotifications => 
          prevNotifications.filter(n => n.id !== 'loud-noise-persistent')
        );
        
        console.log("1-minute average dropped below 80dB, removing notification:", {
          average: newState.currentAverage.toFixed(1)
        });
      }
      
      return newState;
    });
  };

  // Function to analyze motion patterns for intense or frequent changes
  const analyzeMotionPattern = (currentMotion, currentTime) => {
    setMotionMonitoring(prev => {
      const newState = { ...prev };
      
      // Add current reading to the array
      const newReading = { value: currentMotion, timestamp: currentTime };
      newState.readings = [...prev.readings, newReading].slice(-10); // Keep last 10 readings
      
      // Check for rapid motion changes
      if (prev.lastReading !== null) {
        const motionChange = Math.abs(currentMotion - prev.lastReading);
        
        // If motion change is above threshold, count it as rapid change
        if (motionChange > newState.changeThreshold) {
          newState.rapidChanges = prev.rapidChanges + 1;
          console.log(`Rapid motion change detected: ${motionChange.toFixed(2)} (threshold: ${newState.changeThreshold})`);
          
          // Start tracking intense motion if we hit the threshold
          if (newState.rapidChanges >= newState.consecutiveChangesThreshold && !prev.isIntenseMotion) {
            newState.isIntenseMotion = true;
            newState.intenseStartTime = currentTime;
            console.log("Intense motion pattern started, starting 30-second timer");
          }
        } else {
          // Motion change is small, reset rapid change counter
          if (prev.rapidChanges > 0) {
            newState.rapidChanges = Math.max(0, prev.rapidChanges - 1); // Gradually decrease instead of immediate reset
          }
          
          // If we're in intense motion but changes have slowed down significantly
          if (prev.isIntenseMotion && newState.rapidChanges === 0 && !prev.notificationActive) {
            newState.isIntenseMotion = false;
            newState.intenseStartTime = null;
            console.log("Motion pattern stabilized before 30 seconds, resetting intense motion tracking");
          }
        }
      }
      
      newState.lastReading = currentMotion;
      
      // Check if intense motion has persisted for 30 seconds (30,000 ms)
      if (newState.isIntenseMotion && newState.intenseStartTime && !prev.notificationActive) {
        const timeElapsed = currentTime - newState.intenseStartTime;
        if (timeElapsed >= 30000) { // 30 seconds = 30,000 milliseconds
          newState.notificationActive = true;
          
          // Add persistent intense motion notification
          setNotifications(prevNotifications => {
            // Remove any existing intense motion notifications
            const filteredNotifications = prevNotifications.filter(n => n.id !== 'intense-motion');
            
            return [{
              id: 'intense-motion',
              sensor: "Motion Sensor",
              message: `Slow down, you are moving too much! Motion level: ${currentMotion.toFixed(2)}`,
              timestamp: currentTime,
              type: "alert",
              persistent: true
            }, ...filteredNotifications];
          });
          
          console.log("30-second intense motion notification activated:", {
            rapidChanges: newState.rapidChanges,
            currentMotion: currentMotion,
            timeElapsed: timeElapsed
          });
        }
      }
      
      // Reset intense motion notification if movement stabilizes for 5 consecutive stable readings
      if (newState.rapidChanges === 0 && prev.notificationActive) {
        const recentReadings = newState.readings.slice(-5);
        if (recentReadings.length >= 5) {
          const isStable = recentReadings.every((reading, index) => {
            if (index === 0) return true;
            return Math.abs(reading.value - recentReadings[index - 1].value) <= newState.changeThreshold;
          });
          
          if (isStable) {
            newState.notificationActive = false;
            newState.isIntenseMotion = false;
            newState.intenseStartTime = null;
            newState.rapidChanges = 0;
            
            // Remove the persistent intense motion notification
            setNotifications(prevNotifications => 
              prevNotifications.filter(n => n.id !== 'intense-motion')
            );
            
            console.log("Motion pattern normalized, removing intense motion notification");
          }
        }
      }
      
      return newState;
    });
  };


  const checkThresholds = (data) => {
    const newNotifications = [];
    const currentTime = new Date();

    // Analyze heart rate pattern for abnormal increases
    if (data.heartbeat && data.heartbeat > 0) {
      analyzeHeartRatePattern(data.heartbeat, currentTime);
    }

    // Analyze motion pattern for intense or frequent changes
    if (data.motion !== undefined && data.motion >= 0) {
      analyzeMotionPattern(data.motion, currentTime);
    }

    // Check heart rate thresholds (standard notifications)
    if (data.heartbeat < thresholds.heartbeat.low) {
      newNotifications.push({
        id: `heart-low-${Date.now()}`,
        sensor: "Heart Rate",
        message: `Low heart rate detected: ${(data.heartbeat || 0).toFixed(1)} BPM`,
        timestamp: currentTime,
        type: "warning"
      });
    } else if (data.heartbeat > thresholds.heartbeat.high) {
      newNotifications.push({
        id: `heart-high-${Date.now()}`,
        sensor: "Heart Rate",
        message: `High heart rate detected: ${(data.heartbeat || 0).toFixed(1)} BPM`,
        timestamp: currentTime,
        type: "alert"
      });
    }

    // Check motion thresholds
    if (data.motion > thresholds.motion.high) {
      newNotifications.push({
        id: `motion-high-${Date.now()}`,
        sensor: "Motion Sensor",
        message: `High motion detected: ${(data.motion || 0).toFixed(2)}`,
        timestamp: currentTime,
        type: "alert"
      });
    }

    // Use rolling average sound monitoring (1-minute window)
    const soundLevel = data.sound || 0;
    analyzeSoundLevel(soundLevel, currentTime);

    // Add regular sound threshold notifications (for immediate high sound)
    if (soundLevel > thresholds.sound.high && soundLevel < 80) {
      newNotifications.push({
        id: `sound-high-${Date.now()}`,
        sensor: "Sound Level",
        message: `High noise level: ${soundLevel.toFixed(1)} dB`,
        timestamp: currentTime,
        type: "warning"
      });
    }

    // Add new notifications (excluding the persistent one which is handled separately)
    if (newNotifications.length > 0) {
      setNotifications((prev) => [...newNotifications, ...prev].slice(0, 10));
    }
  };

  const getStatus = (value, type) => {
    const threshold = thresholds[type];
    if (value < threshold.low) return "low";
    if (value > threshold.high) return "high";
    return "medium";
  };

  const dismissNotification = (id) => {
    // Prevent dismissing persistent notifications
    if (id === 'loud-noise-persistent') {
      console.log("Cannot dismiss persistent loud noise notification - sound level must drop to 20dB or below");
      return;
    }
    
    if (id === 'abnormal-heart-rate') {
      console.log("Cannot dismiss abnormal heart rate notification - heart rate pattern must stabilize");
      return;
    }
    
    if (id === 'intense-motion') {
      console.log("Cannot dismiss intense motion notification - movement pattern must stabilize");
      return;
    }
    
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-blue-100 to-emerald-100 !bg-gradient-to-br !from-pink-100 !via-blue-100 !to-emerald-100" style={{background: 'linear-gradient(to bottom right, rgb(252 231 243), rgb(219 234 254), rgb(209 250 229))'}}>
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-800/90 to-green-700/90 backdrop-blur-sm shadow-lg border-b border-emerald-600/30" style={{background: 'linear-gradient(to right, rgba(6, 95, 70, 0.90), rgba(21, 128, 61, 0.90))'}}>
        <div className="max-w-md mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <Logo size="md" variant="dark" />
            <div className="flex items-center space-x-4">
              <div className="flex items-center bg-emerald-700/70 rounded-full px-3 py-1 border border-emerald-600/50">
                <div className={`w-2.5 h-2.5 rounded-full mr-2 ${connectionStatus === "Connected" ? "bg-lime-400 animate-pulse" : "bg-rose-400"}`}></div>
                <span className="text-xs font-medium text-emerald-100">{connectionStatus}</span>
              </div>
              <div className="relative flex items-center">
                <Bell className="w-5 h-5 text-emerald-200" />
                {notifications.length > 0 && (
                  <Badge className="absolute -top-2 -right-2 bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs min-w-5 h-5 flex items-center justify-center rounded-full shadow-lg">
                    {notifications.length}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          {lastUpdate && (
            <div className="text-xs text-emerald-200 text-right mt-2 font-medium">
              Last update: {lastUpdate.toLocaleTimeString()}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-md mx-auto p-6 space-y-6">
        {/* Sensor Cards Grid */}
        <div className="grid grid-cols-2 gap-5">
          <SensorCard
            type="gps"
            value={sensorData.gps.address}
            status="normal"
            gpsData={sensorData.gps}
          />
          <SensorCard
            type="heartbeat"
            value={sensorData.heartbeat}
            status={getStatus(sensorData.heartbeat, "heartbeat")}
            threshold={thresholds.heartbeat.high}
          />
          <SensorCard
            type="motion"
            value={sensorData.motion}
            status={getStatus(sensorData.motion, "motion")}
            threshold={thresholds.motion.high}
          />
          <SensorCard
            type="sound"
            value={sensorData.sound}
            status={getStatus(sensorData.sound, "sound")}
            threshold={thresholds.sound.high}
          />
        </div>

        {/* Sound Monitoring Status */}
        {soundRollingAverage.readings.length > 0 && (
          <div className="bg-gradient-to-r from-amber-50/90 to-orange-50/90 border border-amber-200/60 rounded-xl p-5 shadow-lg backdrop-blur-sm">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full animate-pulse shadow-lg"></div>
              <h3 className="font-semibold text-amber-900">Sound Monitoring (1-Minute Average)</h3>
            </div>
            <p className="text-sm text-amber-800 mt-2 leading-relaxed">
              {soundRollingAverage.notificationActive 
                ? `🔊 Sustained loud noise alert active - 1-minute average: ${soundRollingAverage.currentAverage.toFixed(1)}dB`
                : `📊 Current 1-minute average: ${soundRollingAverage.currentAverage.toFixed(1)}dB (${soundRollingAverage.readings.length} readings)`
              }
            </p>
            <p className="text-xs text-amber-700 mt-2 bg-amber-100/60 rounded-lg px-3 py-1">
              {soundRollingAverage.notificationActive 
                ? "⚠️ Alert will clear when 1-minute average drops below 80dB"
                : "⏰ Alert triggers when 1-minute average ≥ 80dB"
              }
            </p>
          </div>
        )}

        {/* Heart Rate Monitoring Status */}
        {(heartRateMonitoring.increases > 0 || heartRateMonitoring.abnormalNotificationActive || heartRateMonitoring.isAbnormalPattern) && (
          <div className="bg-gradient-to-r from-rose-50/90 to-red-50/90 border border-rose-200/60 rounded-xl p-5 shadow-lg backdrop-blur-sm">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-gradient-to-r from-rose-500 to-red-500 rounded-full animate-pulse shadow-lg"></div>
              <h3 className="font-semibold text-rose-900">Heart Rate Pattern Monitoring</h3>
            </div>
            <p className="text-sm text-rose-800 mt-2 leading-relaxed">
              {heartRateMonitoring.abnormalNotificationActive 
                ? `💓 Abnormal pattern active - persisted for 30+ seconds`
                : heartRateMonitoring.isAbnormalPattern 
                  ? `📈 Abnormal pattern detected - tracking for ${heartRateMonitoring.abnormalStartTime ? 
                      Math.floor((new Date() - heartRateMonitoring.abnormalStartTime) / 1000) : 0} seconds (30s threshold)`
                  : `📊 Monitoring increases: ${heartRateMonitoring.increases} consecutive`
              }
            </p>
            <p className="text-xs text-rose-700 mt-2 bg-rose-100/60 rounded-lg px-3 py-1">
              {heartRateMonitoring.abnormalNotificationActive 
                ? "⚕️ Alert will clear when heart rate stabilizes for 5 readings"
                : heartRateMonitoring.isAbnormalPattern
                  ? "⏰ Persistent alert will trigger if pattern continues for 30 seconds"
                  : "📈 Pattern tracking starts after 3 consecutive increases (>2 BPM each)"
              }
            </p>
            <div className="text-xs text-rose-600 mt-3 bg-white/60 rounded-lg px-3 py-2">
              📋 Recent readings: {heartRateMonitoring.readings.slice(-5).map(r => r.value.toFixed(1)).join(' → ')} BPM
            </div>
          </div>
        )}

        {/* Motion Monitoring Status */}
        {(motionMonitoring.rapidChanges > 0 || motionMonitoring.notificationActive || motionMonitoring.isIntenseMotion) && (
          <div className="bg-gradient-to-r from-violet-50/90 to-purple-50/90 border border-violet-200/60 rounded-xl p-5 shadow-lg backdrop-blur-sm">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-gradient-to-r from-violet-500 to-purple-500 rounded-full animate-pulse shadow-lg"></div>
              <h3 className="font-semibold text-violet-900">Motion Pattern Monitoring</h3>
            </div>
            <p className="text-sm text-violet-800 mt-2 leading-relaxed">
              {motionMonitoring.notificationActive 
                ? `🏃‍♂️ Intense motion active - persisted for 30+ seconds`
                : motionMonitoring.isIntenseMotion 
                  ? `📈 Intense motion detected - tracking for ${motionMonitoring.intenseStartTime ? 
                      Math.floor((new Date() - motionMonitoring.intenseStartTime) / 1000) : 0} seconds (30s threshold)`
                  : `📊 Monitoring rapid changes: ${motionMonitoring.rapidChanges} detected`
              }
            </p>
            <p className="text-xs text-violet-700 mt-2 bg-violet-100/60 rounded-lg px-3 py-1">
              {motionMonitoring.notificationActive 
                ? "🛑 Alert will clear when movement stabilizes for 5 readings"
                : motionMonitoring.isIntenseMotion
                  ? "⏰ Persistent alert will trigger if intense motion continues for 30 seconds"
                  : `🎯 Tracking triggers after ${motionMonitoring.consecutiveChangesThreshold} rapid changes (>${motionMonitoring.changeThreshold.toFixed(1)} threshold)`
              }
            </p>
            <div className="text-xs text-violet-600 mt-3 bg-white/60 rounded-lg px-3 py-2">
              📋 Recent readings: {motionMonitoring.readings.slice(-5).map(r => r.value.toFixed(2)).join(' → ')}
            </div>
          </div>
        )}

        {/* Notifications */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 shadow-lg border border-purple-200/40">
          <NotificationPanel
            notifications={notifications}
            onDismiss={dismissNotification}
          />
        </div>

        {/* Status Summary */}
        <div className="bg-gradient-to-r from-emerald-50/90 to-teal-50/90 border border-emerald-200/60 rounded-xl p-5 shadow-lg backdrop-blur-sm">
          <h3 className="font-semibold text-emerald-900 mb-3 flex items-center">
            <div className="w-2 h-2 bg-emerald-600 rounded-full mr-2"></div>
            System Status
          </h3>
          <div className="flex items-center justify-between">
            <span className="text-sm text-emerald-800 font-medium">All Sensors</span>
            <Badge className={`px-3 py-1 rounded-full font-semibold ${notifications.length === 0 ? "bg-emerald-100/80 text-emerald-900" : "bg-amber-100/80 text-amber-900"}`}>
              {notifications.length === 0 ? "✅ NORMAL" : "🔍 MONITORING"}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}