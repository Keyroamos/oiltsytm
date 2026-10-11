# ProTrack365 Fleet Telematics & Integration Package

This document contains everything needed to integrate, copy, or migrate the **NEXTWAVE ENERGY** fleet of 9 GPS-tracked road tankers into any other external system, ERP, backend service, or third-party telematics platform.

---

## 1. Quick Credentials & API Endpoints

| Item | Value |
| :--- | :--- |
| **API Provider** | ProTrack365 Open API |
| **Base URL** | `https://api.protrack365.com` |
| **API Documentation** | `https://www.protrack365.com/api.jsp` |
| **Account Username** | `NEXTWAVEENERGY` |
| **Account Password** | `100100` |
| **Token Validity** | 7,200 seconds (2 hours) — auto-refresh recommended at 90 minutes |
| **Signature Formula** | `md5( md5(password) + unix_time_in_seconds )` |

---

## 2. Complete Fleet Telematics Specifications (All 9 Trucks)

| Plate Number | Model | 15-Digit IMEI | SIM Card Number | SIM ICCID | Activation Date | Expiration Date | Real Latitude | Real Longitude | Last Known Area |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **KDT 991Q** | VT05S | `355139086515480` | `+254798845827` | `89254021434289636592` | 2026-09-10 | 2027-09-17 | `-1.502064` | `37.086905` | Machakos Depot Area |
| **KDT 992Q** | VT05S | `355139086522742` | `+254799394359` | `89254021434289637210` | 2026-09-10 | 2027-09-17 | `-1.502009` | `37.086814` | Machakos Depot Area |
| **KDT 993Q** | VT05S | `355139086516587` | `+254791543972` | `89254021434289635834` | 2026-09-11 | 2027-09-18 | `-1.307059` | `36.884890` | Nairobi Terminal Area |
| **KDX 991B** | VT05S | `355139086520134` | `+254799395721` | `89254021434289634563` | 2026-09-10 | 2027-09-17 | `-1.501990` | `37.086794` | Machakos Depot Area |
| **KDX 992B** | VT05S | `355139086522650` | `+254799467056` | `89254021434289637863` | 2026-09-10 | 2027-09-17 | `-1.502157` | `37.086765` | Machakos Depot Area |
| **KDX 993B** | VT05S | `355139086523427` | `+254799466128` | `89254021434289634720` | 2026-09-10 | 2027-09-17 | `-1.502042` | `37.086875` | Machakos Depot Area |
| **KDX 994B** | VT05S | `355139086522866` | `+254791641462` | `89254021434289635842` | 2026-09-10 | 2027-09-17 | `-1.501957` | `37.086929` | Machakos Depot Area |
| **KDX 996B** | VT05S | `355139086518948` | `+254799466373` | `89254021434289637830` | 2026-09-11 | 2027-09-17 | `-1.306727` | `36.885242` | Nairobi Terminal Area |
| **KDX 997B** | VT05S | `355139086520019` | `+254796256055` | `89254021434289635347` | 2026-09-10 | 2027-09-17 | `-1.502015` | `37.086845` | Machakos Depot Area |

---

## 3. ProTrack365 Open API Integration Spec

### 3.1 Authentication (Step 1)
To call any ProTrack API endpoint, first request an `access_token`:

- **Endpoint:** `GET https://api.protrack365.com/api/authorization`
- **Parameters:**
  - `time`: Current UNIX timestamp in seconds (e.g. `Math.floor(Date.now() / 1000)`)
  - `account`: `NEXTWAVEENERGY`
  - `signature`: `md5( md5("100100") + time )`
- **Response Format:**
  ```json
  {
    "code": 0,
    "record": {
      "access_token": "A17893704311854ac951b4f8ee527b515d9f2d80781ebfe",
      "expires_in": 7200
    }
  }
  ```

---

### 3.2 Live Location Tracking (Step 2)
Retrieve live GPS coordinates, speed, heading, engine (ACC), battery, and external voltage for one or all 9 trucks simultaneously:

- **Endpoint:** `GET https://api.protrack365.com/api/track`
- **Parameters:**
  - `access_token`: Token from Step 1
  - `imeis`: Comma-separated list of IMEIs:
    `355139086515480,355139086522742,355139086516587,355139086520134,355139086522650,355139086523427,355139086522866,355139086518948,355139086520019`
- **Key Response Fields:**
  - `latitude`, `longitude`: Exact decimal GPS coordinates (e.g. `-1.502064, 37.086905`)
  - `speed`: Current speed in km/h
  - `course`: Heading in degrees (0 = North, clockwise)
  - `accstatus`: `1` = Engine/Ignition ON, `0` = Engine/Ignition OFF
  - `datastatus`: `2` = Online (Moving/Active), `4` = Offline (Parked/Ignition Off, last GPS fix)
  - `battery`: Internal battery % (`10` to `100`)
  - `externalpower`: Vehicle battery voltage in Volts (e.g. `"12.4"`, `"24.1"`)
  - `gpstime`: UNIX timestamp of the GPS satellite lock

---

### 3.3 Historical Route Playback (Step 3)
Retrieve the exact path traveled by any truck between two timestamps:

- **Endpoint:** `GET https://api.protrack365.com/api/playback`
- **Parameters:**
  - `access_token`: Token from Step 1
  - `imei`: Device IMEI (e.g. `355139086515480`)
  - `begintime`: Start UNIX timestamp
  - `endtime`: End UNIX timestamp
- **Response Format:**
  A semicolon-delimited string of records: `longitude,latitude,gpstime,speed,course;...`

---

### 3.4 Remote Engine Control (Optional)
Cut or restore fuel to a tanker remotely:

- **Endpoint:** `POST https://api.protrack365.com/api/command/send`
- **Parameters:**
  - `access_token`: Token
  - `imei`: Target IMEI
  - `command`:
    - `RELAY,1`: Stop Engine (cut fuel)
    - `RELAY,0`: Restore Engine (restore fuel)

---

## 4. Plug-and-Play Integration Code (Copy to Any System)

### Standalone Node.js / TypeScript Service
This module has **zero external dependencies** (uses native `fetch` and `crypto`):

```typescript
import crypto from 'crypto';

export interface ProtrackDevice {
  imei: string;
  latitude: number;
  longitude: number;
  speed: number;
  course: number;
  accstatus: number;  // 1 = ON, 0 = OFF
  datastatus: number; // 2 = Online, 4 = Parked/Offline
  battery: number;
  externalpower: string;
}

export class ProtrackClient {
  private account = 'NEXTWAVEENERGY';
  private password = '100100';
  private baseUrl = 'https://api.protrack365.com';
  private cachedToken: string | null = null;
  private tokenExpiry = 0;

  private md5(str: string): string {
    return crypto.createHash('md5').update(str).digest('hex');
  }

  async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.cachedToken && this.tokenExpiry - now > 600000) {
      return this.cachedToken;
    }

    const time = Math.floor(now / 1000);
    const signature = this.md5(this.md5(this.password) + time);
    const url = `${this.baseUrl}/api/authorization?time=${time}&account=${encodeURIComponent(this.account)}&signature=${signature}`;

    const res = await fetch(url);
    const json = await res.json();
    if (json.code !== 0) throw new Error(`ProTrack auth failed: ${json.message}`);

    this.cachedToken = json.record.access_token;
    this.tokenExpiry = now + json.record.expires_in * 1000;
    return this.cachedToken;
  }

  async getLiveTracks(imeis: string[]): Promise<ProtrackDevice[]> {
    const token = await this.getAccessToken();
    const url = `${this.baseUrl}/api/track?access_token=${token}&imeis=${imeis.join(',')}`;
    const res = await fetch(url);
    const json = await res.json();
    return json.record || [];
  }
}
```

---

## 5. Python Integration Example

```python
import hashlib
import time
import requests

ACCOUNT = "NEXTWAVEENERGY"
PASSWORD = "100100"
BASE_URL = "https://api.protrack365.com"

FLEET_IMEIS = [
    "355139086515480", "355139086522742", "355139086516587",
    "355139086520134", "355139086522650", "355139086523427",
    "355139086522866", "355139086518948", "355139086520019"
]

def get_token():
    t = str(int(time.time()))
    pass_md5 = hashlib.md5(PASSWORD.encode()).hexdigest()
    signature = hashlib.md5((pass_md5 + t).encode()).hexdigest()
    
    url = f"{BASE_URL}/api/authorization?time={t}&account={ACCOUNT}&signature={signature}"
    res = requests.get(url).json()
    return res["record"]["access_token"]

def get_fleet_gps():
    token = get_token()
    url = f"{BASE_URL}/api/track?access_token={token}&imeis={','.join(FLEET_IMEIS)}"
    res = requests.get(url).json()
    return res.get("record", [])

if __name__ == "__main__":
    devices = get_fleet_gps()
    for d in devices:
        print(f"IMEI: {d['imei']} | Lat: {d['latitude']} | Lng: {d['longitude']} | Engine: {'ON' if d['accstatus'] == 1 else 'OFF'}")
```

---

## 6. Files Created in Your Workspace

1. **[PROTRACK_FLEET_EXPORT.json](file:///c:/Users/Admin/OneDrive/Desktop/oilsystem/PROTRACK_FLEET_EXPORT.json)** — Full JSON structure ready for REST APIs, MongoDB, Firebase, or app imports.
2. **[PROTRACK_FLEET_EXPORT.csv](file:///c:/Users/Admin/OneDrive/Desktop/oilsystem/PROTRACK_FLEET_EXPORT.csv)** — Full CSV spreadsheet for Excel, Google Sheets, or ERP bulk import.
3. **[011_tanker_tracker_imei.sql](file:///c:/Users/Admin/OneDrive/Desktop/oilsystem/supabase/migrations/011_tanker_tracker_imei.sql)** — PostgreSQL / Supabase SQL schema & update statements.
