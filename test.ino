#include <MAX30105.h>
#include "heartRate.h"   // SparkFun HR algorithm
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <TinyGPSPlus.h>
#include <HardwareSerial.h>
#include <time.h>

// ===== WiFi Credentials =====
const char* ssid = "wifi_name";
const char* password = "wifi_password";

// ===== Firebase Credentials =====
#define DATABASE_URL "https://senseguardian-c01d9-default-rtdb.firebaseio.com"
#define DATABASE_SECRET "GCRzEq4lrDBpVIhwzd8ETIlEqG1fWrWE0Zov8hH3"

// ===== Objects =====
Adafruit_MPU6050 mpu;
MAX30105 particleSensor;
TinyGPSPlus gps;
HardwareSerial SerialGPS(2); // UART2 for GPS
HTTPClient http;


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




// ===== JSON Document =====
DynamicJsonDocument jsonDoc(2048);

// ===== Setup =====
void setup() {
  Serial.begin(115200);
  Wire.begin(21,22);

  // WiFi
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while(WiFi.status()!=WL_CONNECTED){ delay(500); Serial.print("."); }
  Serial.println("\nConnected! IP: "+WiFi.localIP().toString());


  // ===== Time for timestamp =====
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");

  // ===== Test Firebase Connection =====
  Serial.println("Testing Firebase connection...");
  String testUrl = String(DATABASE_URL) + "/test.json?auth=" + String(DATABASE_SECRET);
  http.begin(testUrl);
  http.addHeader("Content-Type", "application/json");

  int testResponse = http.PUT("\"connection_test\"");
  if (testResponse == 200) {
    Serial.println("Firebase connection successful!");
    // Clean up test data
    http.begin(testUrl);
   http.sendRequest("DELETE");
  } else {
    Serial.println("Firebase connection failed. Response code: " + String(testResponse));
  }
  http.end();


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
 SerialGPS.begin(9600, SERIAL_8N1, 16, 17);

 
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
  while(SerialGPS.available() > 0){gps.encode(SerialGPS.read());
  if(gps.location.isUpdated()){
    latitude=gps.location.lat();
    longitude=gps.location.lng();
    satellites=gps.satellites.value();
  }
  }

  struct tm timeinfo;
  char timestamp[25];
  if(getLocalTime(&timeinfo)){
    strftime(timestamp, sizeof(timestamp), "%Y-%m-%d %H:%M:%S", &timeinfo);
  } else {
    strcpy(timestamp, "0000-00-00 00:00:00");
  }

  // ===== Prepare JSON =====
  jsonDoc.clear();
  jsonDoc["mpu6050"]["ax"] = ax;
  jsonDoc["mpu6050"]["ay"] = ay;
  jsonDoc["mpu6050"]["az"] = az;
  jsonDoc["mpu6050"]["gx"] = gx;
  jsonDoc["mpu6050"]["gy"] = gy;
  jsonDoc["mpu6050"]["gz"] = gz;

  jsonDoc["max30102"]["irValue"] = irValue;
  jsonDoc["max30102"]["heartRate"] = beatAvg;

  jsonDoc["sound"]["detected"] = soundDetected;
  jsonDoc["sound"]["level"] = soundLevel;

  jsonDoc["gps"]["latitude"] = latitude;
  jsonDoc["gps"]["longitude"] = longitude;
  jsonDoc["gps"]["satellites"] = satellites;

  jsonDoc["timestamp"] = String(timestamp);

  // ===== Send to Firebase using HTTP =====
  String url = String(DATABASE_URL) + "/sensor_data/latest.json?auth=" + String(DATABASE_SECRET);
  String jsonString;
  serializeJson(jsonDoc, jsonString);

  http.begin(url);
  http.addHeader("Content-Type", "application/json");

  int httpResponseCode = http.PUT(jsonString);

  if (httpResponseCode == 200) {
    Serial.println("Data sent to Firebase successfully!");
  } else {
    Serial.println("Firebase error. HTTP Response code: " + String(httpResponseCode));
    if (httpResponseCode == -1) {
      Serial.println("Connection failed - check internet connection");
    } else if (httpResponseCode == 401) {
      Serial.println("Unauthorized - check database secret");
    } else if (httpResponseCode == 404) {
      Serial.println("Database not found - check database URL");
    }
  }

  http.end();

  delay(2000); // send every 2 seconds
}
