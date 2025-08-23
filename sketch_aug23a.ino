#include <MAX30105.h>
#include "heartRate.h"   // SparkFun HR algorithm
#include <WiFi.h>
#include <WebServer.h>
#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <TinyGPSPlus.h>

// ===== WiFi Credentials =====
const char* ssid = "Milton";
const char* password = "01713754958";

// ===== Objects =====
Adafruit_MPU6050 mpu;
MAX30105 particleSensor;
TinyGPSPlus gps;
HardwareSerial gpsSerial(1);  // UART1 for GPS

WebServer server(80);

// ===== Variables =====
float ax, ay, az, gx, gy, gz;
long irValue;
int beatsPerMinute;
int beatAvg;
long lastBeat = 0;
const byte RATE_SIZE = 4; // average over last N beats
byte rates[RATE_SIZE]; 
byte rateSpot = 0;

bool soundDetected = false;
int soundLevel = 0;
double latitude = 0.0, longitude = 0.0;
int satellites = 0;

// ===== HTML Dashboard (your design) =====
String htmlPage = R"rawliteral(
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ESP32 Sensor Dashboard</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      margin: 0;
      padding: 0;
      background-color: #f5f5f5;
      color: #333;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    
    header {
      background-color: #2c3e50;
      color: white;
      padding: 20px;
      border-radius: 5px 5px 0 0;
      margin-bottom: 20px;
    }
    
    h1 {
      margin: 0;
      font-size: 24px;
    }
    
    .status-bar {
      display: flex;
      justify-content: space-between;
      margin-bottom: 20px;
    }
    
    .badge {
      padding: 5px 10px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: bold;
    }
    
    .connected {
      background-color: #2ecc71;
      color: white;
    }
    
    .disconnected {
      background-color: #e74c3c;
      color: white;
    }
    
    .dashboard {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
      margin-bottom: 20px;
    }
    
    .card {
      background-color: white;
      border-radius: 5px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.1);
      padding: 20px;
    }
    
    .card h2 {
      margin-top: 0;
      font-size: 18px;
      color: #2c3e50;
      border-bottom: 1px solid #eee;
      padding-bottom: 10px;
    }
    
    .value {
      font-size: 32px;
      font-weight: bold;
      margin: 10px 0;
      color: #3498db;
    }
    
    .progress-bar {
      height: 20px;
      background-color: #ecf0f1;
      border-radius: 10px;
      overflow: hidden;
      margin: 10px 0;
    }
    
    .progress {
      height: 100%;
      background-color: #3498db;
      width: 0%;
      transition: width 0.3s;
    }
    
    .tabs {
      display: flex;
      margin-bottom: -1px;
    }
    
    .tab-button {
      padding: 10px 20px;
      background-color: #eee;
      border: none;
      cursor: pointer;
      border-radius: 5px 5px 0 0;
      margin-right: 5px;
    }
    
    .tab-button.active {
      background-color: white;
      font-weight: bold;
    }
    
    .tab-content {
      display: none;
      background-color: white;
      padding: 20px;
      border-radius: 0 5px 5px 5px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    }
    
    .tab-content.active {
      display: block;
    }
    
    .sensor-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
    }
    
    .sensor-item {
      margin-bottom: 15px;
    }
    
    .sensor-label {
      font-weight: bold;
      margin-bottom: 5px;
      color: #7f8c8d;
    }
    
    .sensor-value {
      font-size: 18px;
    }
    
    .timestamp {
      text-align: right;
      font-size: 12px;
      color: #95a5a6;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>ESP32 Sensor Dashboard</h1>
    </header>
    
    <div class="status-bar">
      <div>
        <span class="badge" id="connectionStatus">Disconnected</span>
      </div>
      <div class="timestamp">
        Last update: <span id="lastUpdate">--:--:--</span>
      </div>
    </div>
    
    <div class="dashboard">
      <div class="card">
        <h2>Acceleration</h2>
        <div class="value" id="totalAcceleration">0.0 m/s²</div>
        <div class="sensor-grid">
          <div class="sensor-item">
            <div class="sensor-label">X-axis</div>
            <div class="sensor-value" id="accel-x">0.00</div>
          </div>
          <div class="sensor-item">
            <div class="sensor-label">Y-axis</div>
            <div class="sensor-value" id="accel-y">0.00</div>
          </div>
          <div class="sensor-item">
            <div class="sensor-label">Z-axis</div>
            <div class="sensor-value" id="accel-z">0.00</div>
          </div>
        </div>
      </div>
      
      <div class="card">
        <h2>Heart Rate</h2>
        <div class="value" id="heartRate">0 BPM</div>
        <div class="sensor-item">
          <div class="sensor-label">IR Value</div>
          <div class="sensor-value" id="irValueShort">0</div>
        </div>
      </div>
      
      <div class="card">
        <h2>Sound</h2>
        <div class="value" id="soundStatus">Quiet</div>
        <div class="progress-bar">
          <div class="progress" id="soundProgress" style="width: 0%"></div>
        </div>
      </div>
      
      <div class="card">
        <h2>GPS</h2>
        <div class="sensor-item">
          <div class="sensor-label">Latitude</div>
          <div class="sensor-value" id="latitude">0.000000°</div>
        </div>
        <div class="sensor-item">
          <div class="sensor-label">Longitude</div>
          <div class="sensor-value" id="longitude">0.000000°</div>
        </div>
        <div class="sensor-item">
          <div class="sensor-label">Satellites</div>
          <div class="sensor-value" id="satelliteCount">0 Sats</div>
        </div>
      </div>
    </div>
    
    <div class="tabs">
      <button class="tab-button active" onclick="showTab('details-tab')">Details</button>
      <button class="tab-button" onclick="showTab('gyro-tab')">Gyroscope</button>
    </div>
    
    <div id="details-tab" class="tab-content active">
      <div class="sensor-grid">
        <div>
          <h3>Heart Sensor</h3>
          <div class="sensor-item">
            <div class="sensor-label">Heart Rate</div>
            <div class="sensor-value" id="heartRateDetail">0</div>
          </div>
          <div class="sensor-item">
            <div class="sensor-label">IR Value</div>
            <div class="sensor-value" id="irValueDetail">0</div>
          </div>
        </div>
        
        <div>
          <h3>Sound Sensor</h3>
          <div class="sensor-item">
            <div class="sensor-label">Status</div>
            <div class="sensor-value" id="soundStatusDetail">No Sound</div>
          </div>
          <div class="sensor-item">
            <div class="sensor-label">Level</div>
            <div class="progress-bar">
              <div class="progress" id="soundProgressDetail" style="width: 0%"></div>
            </div>
            <div class="sensor-value" id="soundLevelDetail">0</div>
          </div>
        </div>
        
        <div>
          <h3>GPS</h3>
          <div class="sensor-item">
            <div class="sensor-label">Satellites</div>
            <div class="sensor-value" id="satellites">0</div>
          </div>
        </div>
      </div>
    </div>
    
    <div id="gyro-tab" class="tab-content">
      <div class="sensor-grid">
        <div class="sensor-item">
          <div class="sensor-label">Gyro X</div>
          <div class="sensor-value" id="gyro-x">0.000</div>
        </div>
        <div class="sensor-item">
          <div class="sensor-label">Gyro Y</div>
          <div class="sensor-value" id="gyro-y">0.000</div>
        </div>
        <div class="sensor-item">
          <div class="sensor-label">Gyro Z</div>
          <div class="sensor-value" id="gyro-z">0.000</div>
        </div>
      </div>
    </div>
  </div>
  <script>
    let sensorData = {};
    async function fetchData(){
      try{
        let res = await fetch("/data");
        sensorData = await res.json();
        updateDisplay();
        document.getElementById("connectionStatus").textContent="Connected";
        document.getElementById("connectionStatus").className="badge connected";
      }catch(e){
        document.getElementById("connectionStatus").textContent="Disconnected";
        document.getElementById("connectionStatus").className="badge disconnected";
      }
    }
    function updateDisplay(){
      // Total acceleration
      const totalAccel = Math.sqrt(
        sensorData.mpu6050.ax**2 +
        sensorData.mpu6050.ay**2 +
        sensorData.mpu6050.az**2
      ).toFixed(1);
      document.getElementById("totalAcceleration").textContent = totalAccel+" m/s²";
      // Heart
      document.getElementById("heartRate").textContent = sensorData.max30102.heartRate+" BPM";
      document.getElementById("irValueShort").textContent = sensorData.max30102.irValue;
      document.getElementById("heartRateDetail").textContent = sensorData.max30102.heartRate;
      document.getElementById("irValueDetail").textContent = sensorData.max30102.irValue;
      // Sound
      document.getElementById("soundStatus").textContent = sensorData.sound.detected ? "Detected":"Quiet";
      document.getElementById("soundProgress").style.width = sensorData.sound.level+"%";
      document.getElementById("soundStatusDetail").textContent = sensorData.sound.detected ? "Sound Detected":"No Sound";
      document.getElementById("soundLevelDetail").textContent = sensorData.sound.level;
      document.getElementById("soundProgressDetail").style.width = sensorData.sound.level+"%";
      // GPS
      document.getElementById("latitude").textContent = sensorData.gps.latitude.toFixed(6)+"°";
      document.getElementById("longitude").textContent = sensorData.gps.longitude.toFixed(6)+"°";
      document.getElementById("satellites").textContent = sensorData.gps.satellites;
      document.getElementById("satelliteCount").textContent = sensorData.gps.satellites+" Sats";
      // MPU
      document.getElementById("accel-x").textContent = sensorData.mpu6050.ax.toFixed(2);
      document.getElementById("accel-y").textContent = sensorData.mpu6050.ay.toFixed(2);
      document.getElementById("accel-z").textContent = sensorData.mpu6050.az.toFixed(2);
      document.getElementById("gyro-x").textContent = sensorData.mpu6050.gx.toFixed(3);
      document.getElementById("gyro-y").textContent = sensorData.mpu6050.gy.toFixed(3);
      document.getElementById("gyro-z").textContent = sensorData.mpu6050.gz.toFixed(3);
      // Timestamp
      document.getElementById("lastUpdate").textContent = new Date().toLocaleTimeString();
    }
    function showTab(tabName){
      document.querySelectorAll(".tab-content").forEach(t=>t.classList.remove("active"));
      document.querySelectorAll(".tab-button").forEach(b=>b.classList.remove("active"));
      document.getElementById(tabName).classList.add("active");
      event.target.classList.add("active");
    }
    function initialize(){
      fetchData();
      setInterval(fetchData,1000);
    }
    document.addEventListener("DOMContentLoaded", initialize);
  </script>
</body>
</html>
)rawliteral";

// ===== Return JSON =====
String getJSON() {
  String json = "{";
  json += "\"mpu6050\":{";
  json += "\"ax\":" + String(ax,2) + ",";
  json += "\"ay\":" + String(ay,2) + ",";
  json += "\"az\":" + String(az,2) + ",";
  json += "\"gx\":" + String(gx,3) + ",";
  json += "\"gy\":" + String(gy,3) + ",";
  json += "\"gz\":" + String(gz,3) + "},";
  json += "\"max30102\":{";
  json += "\"irValue\":" + String(irValue) + ",";
  json += "\"heartRate\":" + String(beatAvg) + "},";
  json += "\"sound\":{";
  json += "\"detected\":" + String(soundDetected ? "true":"false") + ",";
  json += "\"level\":" + String(soundLevel) + "},";
  json += "\"gps\":{";
  json += "\"latitude\":" + String(latitude,6) + ",";
  json += "\"longitude\":" + String(longitude,6) + ",";
  json += "\"satellites\":" + String(satellites) + "}";
  json += "}";
  return json;
}

// ===== Setup =====
void setup() {
  Serial.begin(115200);
  Wire.begin(21,22);

  // WiFi
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while(WiFi.status()!=WL_CONNECTED){ delay(500); Serial.print("."); }
  Serial.println("\nConnected! IP: "+WiFi.localIP().toString());

  // MPU6050
  if(!mpu.begin()){ Serial.println("MPU6050 not found!"); while(1); }

  // MAX30105 (Heart sensor)
  if(!particleSensor.begin(Wire, I2C_SPEED_STANDARD)){ Serial.println("MAX30105 not found!"); while(1); }
  particleSensor.setup(); 
  particleSensor.setPulseAmplitudeRed(0x0A); // Turn Red LED low
  particleSensor.setPulseAmplitudeGreen(0);  // Turn Green LED off

  // Sound sensor pin
  pinMode(15, INPUT);

  // GPS (Neo-6M on UART1, RX=16, TX=17)
  gpsSerial.begin(9600, SERIAL_8N1, 16, 17);

  // Web routes
  server.on("/", [](){ server.send(200,"text/html",htmlPage); });
  server.on("/data", [](){ server.send(200,"application/json",getJSON()); });
  server.begin();
}

// ===== Loop =====
void loop() {
  // MPU6050
  sensors_event_t a,g,t;
  mpu.getEvent(&a,&g,&t);
  ax=a.acceleration.x; ay=a.acceleration.y; az=a.acceleration.z;
  gx=g.gyro.x; gy=g.gyro.y; gz=g.gyro.z;

  // Heart Sensor
  irValue = particleSensor.getIR();
  if (checkForBeat(irValue)) {
    long delta = millis() - lastBeat;
    lastBeat = millis();
    beatsPerMinute = 60 / (delta / 1000.0);

    if (beatsPerMinute < 255 && beatsPerMinute > 20) {
      rates[rateSpot++] = (byte)beatsPerMinute;
      rateSpot %= RATE_SIZE;

      beatAvg = 0;
      for (byte x = 0 ; x < RATE_SIZE ; x++)
        beatAvg += rates[x];
      beatAvg /= RATE_SIZE;
    }
  }

  // Sound
  soundDetected = digitalRead(15);
  soundLevel = soundDetected ? 80 : 20; // simple % scale

  // GPS
  while(gpsSerial.available()){ gps.encode(gpsSerial.read()); }
  if(gps.location.isUpdated()){
    latitude=gps.location.lat();
    longitude=gps.location.lng();
    satellites=gps.satellites.value();
  }

  server.handleClient();
}
