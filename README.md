# SenseGuardian Mobile App 📱

A Progressive Web App for real-time sensor monitoring including GPS location, heart rate, motion detection, and sound level monitoring.

## 🎯 Features

- **📍 GPS Location Tracking** - Real-time location monitoring
- **❤️ Heart Rate Monitor** - BPM tracking with threshold alerts
- **🏃 Motion Sensor** - Movement detection (Low/Medium/High)
- **🔊 Sound Level Monitor** - Audio level monitoring with dB readings
- **🔔 Smart Notifications** - Instant alerts when thresholds are exceeded
- **📱 Mobile-First Design** - Optimized for mobile devices
- **🌐 PWA Support** - Install as native app on mobile

## 🎨 Design

- **Warm Green Theme** - Beautiful gradient design with #84cc7e primary color
- **Loading Screen** - SenseGuardian logo with leaf icon
- **Responsive Layout** - Works perfectly on all screen sizes
- **Modern UI** - Clean, intuitive interface

## 🚀 Installation

### For Development:

```bash
# Clone the repository
git clone https://github.com/meemmac/SenseGuardian.git
cd SenseGuardian

# Install dependencies
npm install

# Start development server
npm start
```

### For Mobile Installation:

1. Open the app URL in your mobile browser
2. Tap "Add to Home Screen" (Android) or Share → "Add to Home Screen" (iOS)
3. The app will install as a native mobile app

## 🔧 Technology Stack

- **React 19.1.1** - Modern React with latest features
- **Lucide React** - Beautiful icons
- **Custom CSS** - Mobile-optimized styling
- **PWA** - Progressive Web App capabilities
- **Service Worker** - Offline support

## 📱 Mobile Features

- **Installable** - Works as native mobile app
- **Offline Support** - Service worker for offline functionality
- **Push Notifications** - Threshold-based alerts
- **Touch Optimized** - Perfect touch interface

## 🛠️ Development

### Available Scripts:

- `npm start` - Development server
- `npm run build` - Production build
- `npm test` - Run tests
- `npm run eject` - Eject from Create React App

### Project Structure:

```
src/
├── components/
│   ├── Dashboard.js      # Main dashboard
│   ├── LoadingScreen.js  # Loading animation
│   ├── Logo.js          # SenseGuardian logo
│   ├── SensorCard.js    # Individual sensor cards
│   └── ui/              # UI components
├── App.js               # Main app component
└── index.css           # Styling
```

## 🎯 Sensor Thresholds

### Heart Rate:

- **Low**: < 60 BPM
- **Normal**: 60-100 BPM
- **High**: > 100 BPM

### Motion Sensor:

- **Low**: < 2 units
- **Medium**: 2-8 units
- **High**: > 8 units

### Sound Level:

- **Low**: < 40 dB
- **Medium**: 40-80 dB
- **High**: > 80 dB

## 📄 License

Private Repository - All Rights Reserved

## 👨‍💻 Author

**meemmac** - SenseGuardian Mobile App

---

Made with ❤️ for mobile health monitoring
