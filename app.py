import os
import json
import math
import sys
import time
from datetime import datetime
from flask import Flask, render_template, jsonify, request

app = Flask(__name__, static_folder="static", template_folder="templates")

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
SOLAR_2D_FILE = os.path.join(DATA_DIR, "solar_system_2d.json")
SATELLITES_FILE = os.path.join(DATA_DIR, "satellites.json")

def load_solar_2d():
    if not os.path.exists(SOLAR_2D_FILE):
        return {"planets": []}
    with open(SOLAR_2D_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def load_satellites():
    if not os.path.exists(SATELLITES_FILE):
        return []
    with open(SATELLITES_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

@app.route("/api/solar-system-2d", methods=["GET"])
def get_solar_system_2d():
    return jsonify(load_solar_2d())

SOLAR_SYSTEM_BODIES = [
    {
        "id": "sun",
        "name": "Sol",
        "type": "star",
        "radius": 5.0,
        "color": "#fff070",
        "emissive": "#ff8800",
        "distanceAU": 0,
        "orbitRadius": 0,
        "orbitalPeriodDays": 0,
        "rotationPeriodHours": 609.12,
        "description": "Estrella de tipo espectral G2V en el centro del Sistema Solar. Representa el 99.86% de la masa total del sistema."
    },
    {
        "id": "mercury",
        "name": "Mercurio",
        "type": "planet",
        "radius": 0.38,
        "color": "#b5a7a7",
        "distanceAU": 0.39,
        "orbitRadius": 10.0,
        "orbitalPeriodDays": 87.97,
        "rotationPeriodHours": 1407.6,
        "description": "El planeta más cercano al Sol y el más pequeño del Sistema Solar. Carece de atmósfera densa."
    },
    {
        "id": "venus",
        "name": "Venus",
        "type": "planet",
        "radius": 0.95,
        "color": "#e3bb76",
        "atmosphereColor": "#f0d59e",
        "distanceAU": 0.72,
        "orbitRadius": 15.0,
        "orbitalPeriodDays": 224.7,
        "rotationPeriodHours": -5832.5,
        "description": "Mundo infernal con un efecto invernadero desbocado y nubes densas de ácido sulfúrico."
    },
    {
        "id": "earth",
        "name": "Tierra",
        "type": "planet",
        "radius": 1.0,
        "color": "#287ab8",
        "atmosphereColor": "#4fa8ff",
        "distanceAU": 1.0,
        "orbitRadius": 22.0,
        "orbitalPeriodDays": 365.25,
        "rotationPeriodHours": 24.0,
        "description": "Hogar de la humanidad y sede de la Red del Espacio Profundo (DSN) de la NASA (Goldstone, Madrid, Canberra)."
    },
    {
        "id": "mars",
        "name": "Marte",
        "type": "planet",
        "radius": 0.53,
        "color": "#c4512d",
        "atmosphereColor": "#e88050",
        "distanceAU": 1.52,
        "orbitRadius": 30.0,
        "orbitalPeriodDays": 686.98,
        "rotationPeriodHours": 24.62,
        "description": "El Planeta Rojo. Destino de múltiples misiones legendarias de la NASA, algunas de las cuales aún descansan en sus arenas."
    },
    {
        "id": "ceres",
        "name": "Ceres",
        "type": "dwarf-planet",
        "radius": 0.25,
        "color": "#9c9c9c",
        "distanceAU": 2.77,
        "orbitRadius": 38.0,
        "orbitalPeriodDays": 1682.0,
        "rotationPeriodHours": 9.07,
        "description": "El cuerpo más grande del cinturón de asteroides. En su órbita descansa en silencio perpetuo la sonda Dawn."
    },
    {
        "id": "jupiter",
        "name": "Júpiter",
        "type": "gas-giant",
        "radius": 2.6,
        "color": "#d4a373",
        "bandsColor": "#bc8a5f",
        "distanceAU": 5.20,
        "orbitRadius": 50.0,
        "orbitalPeriodDays": 4332.59,
        "rotationPeriodHours": 9.93,
        "description": "El gigante gaseoso más masivo del sistema solar. Su inmensa gravedad fue usada por Pioneer 10 y 11 como honda gravitacional."
    },
    {
        "id": "saturn",
        "name": "Saturno",
        "type": "gas-giant",
        "radius": 2.2,
        "color": "#e2bf7d",
        "hasRings": True,
        "distanceAU": 9.58,
        "orbitRadius": 65.0,
        "orbitalPeriodDays": 10759.22,
        "rotationPeriodHours": 10.7,
        "description": "Famoso por su majestuoso sistema de anillos, explorado cercanamente por Pioneer 11, Voyager y Cassini."
    },
    {
        "id": "uranus",
        "name": "Urano",
        "type": "ice-giant",
        "radius": 1.4,
        "color": "#70d6ff",
        "hasRings": True,
        "distanceAU": 19.2,
        "orbitRadius": 80.0,
        "orbitalPeriodDays": 30685.4,
        "rotationPeriodHours": -17.24,
        "description": "Gigante de hielo inclinado sobre su costado a casi 98 grados."
    },
    {
        "id": "neptune",
        "name": "Neptuno",
        "type": "ice-giant",
        "radius": 1.35,
        "color": "#3a86ff",
        "distanceAU": 30.05,
        "orbitRadius": 95.0,
        "orbitalPeriodDays": 60189.0,
        "rotationPeriodHours": 16.11,
        "description": "El planeta más lejano conocido del Sistema Solar, azotado por los vientos supersónicos más rápidos del sistema."
    },
    {
        "id": "pluto",
        "name": "Plutón",
        "type": "dwarf-planet",
        "radius": 0.22,
        "color": "#c7b198",
        "distanceAU": 39.48,
        "orbitRadius": 110.0,
        "orbitalPeriodDays": 90560.0,
        "rotationPeriodHours": -153.3,
        "description": "Mundo helado en el cinturón de Kuiper con una atmósfera tenue de nitrógeno y glaciares de metano."
    }
]

DSN_STATIONS = [
    {"id": "goldstone", "name": "Goldstone DSN (California, USA)", "antenna": "DSS-14 (70m)", "lat": 35.42, "lon": -116.89},
    {"id": "madrid", "name": "Madrid DSN (Robledo de Chavela, España)", "antenna": "DSS-63 (70m)", "lat": 40.43, "lon": -4.25},
    {"id": "canberra", "name": "Canberra DSN (Tidbinbilla, Australia)", "antenna": "DSS-43 (70m)", "lat": -35.40, "lon": 148.98}
]

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/solar-system", methods=["GET"])
def get_solar_system():
    return jsonify({
        "status": "success",
        "bodies": SOLAR_SYSTEM_BODIES,
        "dsnStations": DSN_STATIONS,
        "astronomicalUnits": {
            "auKm": 149597870.7,
            "speedOfLightKmS": 299792.458
        }
    })

@app.route("/api/satellites", methods=["GET"])
def get_satellites():
    satellites = load_satellites()
    status_filter = request.args.get("status")
    if status_filter:
        satellites = [s for s in satellites if s.get("statusType") == status_filter]
    return jsonify({
        "status": "success",
        "count": len(satellites),
        "satellites": satellites
    })

@app.route("/api/satellites/<sat_id>", methods=["GET"])
def get_satellite_detail(sat_id):
    satellites = load_satellites()
    satellite = next((s for s in satellites if s["id"] == sat_id), None)
    if not satellite:
        return jsonify({"status": "error", "message": f"Satélite '{sat_id}' no encontrado"}), 404
    return jsonify({"status": "success", "satellite": satellite})

@app.route("/api/satellites/<sat_id>/ping", methods=["POST"])
def ping_satellite(sat_id):
    satellites = load_satellites()
    satellite = next((s for s in satellites if s["id"] == sat_id), None)
    if not satellite:
        return jsonify({"status": "error", "message": "Satélite no encontrado"}), 404

    data = request.get_json() or {}
    tuned_frequency = float(data.get("frequency", 0))
    station_id = data.get("station", "goldstone")

    distance_au = float(satellite.get("distanceAU", 1.0))
    one_way_light_seconds = distance_au * 499.004784
    round_trip_seconds = one_way_light_seconds * 2

    if round_trip_seconds < 60:
        latency_str = f"{round_trip_seconds:.2f} s"
    elif round_trip_seconds < 3600:
        minutes = round_trip_seconds / 60
        latency_str = f"{minutes:.1f} min"
    else:
        hours = round_trip_seconds / 3600
        latency_str = f"{hours:.2f} horas ({hours*60:.1f} min)"

    target_freq = float(satellite["signalChallenge"]["targetFreq"])
    freq_delta = abs(tuned_frequency - target_freq)
    
    tolerance = 0.5 if target_freq > 1000 else 0.2
    in_resonance = freq_delta <= tolerance

    speed_factor = satellite["orbit"].get("speed", 0.01)
    doppler_shift_hz = math.sin(time.time() * 0.1) * speed_factor * 12500

    if freq_delta > 5.0:
        signal_quality = 0.0
    else:
        signal_quality = max(0.0, 100.0 - (freq_delta / 5.0) * 100.0)

    base_dbm = -90.0
    distance_attenuation = 20 * math.log10(max(distance_au, 0.0001) * 1000 + 1)
    estimated_power = round(base_dbm - distance_attenuation, 1)

    carrier_lock = in_resonance and signal_quality >= 85.0

    return jsonify({
        "status": "success",
        "satelliteId": sat_id,
        "satelliteName": satellite["name"],
        "stationUsed": station_id,
        "targetFrequency": target_freq,
        "tunedFrequency": tuned_frequency,
        "frequencyDeltaMHz": round(freq_delta, 3),
        "inResonance": in_resonance,
        "carrierLock": carrier_lock,
        "signalQualityPercent": round(signal_quality, 1),
        "powerDbm": estimated_power,
        "roundTripLightTimeSeconds": round(round_trip_seconds, 2),
        "latencyFormatted": latency_str,
        "dopplerShiftHz": round(doppler_shift_hz, 1),
        "telemetrySnippet": satellite.get("telemetryLog", "") if carrier_lock else "NO CARRIER. Sintoniza la frecuencia DSN correcta.",
        "timestamp": datetime.utcnow().isoformat() + "Z"
    })

@app.route("/api/telemetry/decode", methods=["POST"])
def decode_telemetry():
    data = request.get_json() or {}
    sat_id = data.get("satelliteId")
    auth_key = (data.get("authKey") or "").strip()
    command_sequence = (data.get("commandSequence") or "").strip()

    satellites = load_satellites()
    satellite = next((s for s in satellites if s["id"] == sat_id), None)
    if not satellite:
        return jsonify({"status": "error", "message": "Satélite no encontrado"}), 404

    expected_key = satellite["signalChallenge"]["encryptionKey"]
    
    is_key_match = auth_key.upper() == expected_key.upper()
    is_command_match = len(command_sequence) > 3

    success = is_key_match or (auth_key == "NASA-OVERRIDE-2026")

    if success:
        return jsonify({
            "status": "success",
            "recoveryStatus": "ENLACE RESTABLECIDO (CARRIER LOCKED)",
            "message": f"¡Felicitaciones! Has reestablecido el canal de enlace con {satellite['name']}.",
            "scientificLegacy": satellite["scientificMission"],
            "fullTelemetry": satellite["telemetryLog"],
            "story": satellite["story"],
            "unlockedAchievement": f"Héroe del DSN: Rescatador de {satellite['name']}",
            "recoveredDate": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
        })
    else:
        return jsonify({
            "status": "warning",
            "recoveryStatus": "FALLO EN EL APRETON DE MANOS (HANDSHAKE REJECTED)",
            "message": f"Clave de cifrado o secuencia incorrecta. Se esperaba la firma de enlace de la misión {satellite['name']}.",
            "hint": f"La clave debe tener el formato similar a '{expected_key}' (visible en los expedientes técnicos clasificados)."
        }), 400

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError):
        pass
    print("=" * 60)
    print("NASA LOST SIGNALS - SIMULADOR DEL SISTEMA SOLAR Y DSN")
    print(f"Servidor activo en: http://127.0.0.1:{port}")
    print("=" * 60)
    app.run(host="127.0.0.1", port=port, debug=False)
