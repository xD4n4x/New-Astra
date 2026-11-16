# ✨ New Astra // Simulador del Sistema Solar 3D & Hardware Espacial Abandonado

![New Astra Logo](static/img/logo.jpg)

> **Proyecto para NASA Space Apps Challenge**  
> Simulador interactivo 3D del Sistema Solar y cementerio espacial de artefactos y sondas de la NASA, desarrollado con **Three.js**, **HTML5/CSS3/JS** y **Python (Flask)** bajo el concepto de **New Astra**.

---

## 🌟 Características Principales

1. **Sistema Solar 3D Inmersivo (Three.js)**:
   - **Sol dinámico**: Núcleo ardiente con corona solar volumétrica y luz omnidireccional.
   - **Cuerpos mayores y enanos**: Mercurio, Venus (con atmósfera), Tierra (+ Luna interactiva), Marte, Ceres, Júpiter, Saturno (+ sistema de anillos), Urano (+ anillos), Neptuno y Plutón.
   - **Cinturón de Asteroides**: Más de 3.000 partículas astronómicas en órbita kepleriana entre Marte y Júpiter.
   - **Líneas orbitales elípticas e hiperbólicas**: Trazado visual de trayectorias con colores codificados.
   - **Radar 2D Holográfico**: Minimapa en tiempo real en la esquina inferior con vista cenital (*Top-Down*).

2. **Satélites y Sondas Perdidas de la NASA**:
   - **IMAGE (Explorer 78)**: Perdido en 2005 y redescubierto en 2018 por un astrónomo aficionado mediante una señal portadora periódica en 2271.2 MHz.
   - **Pioneer 10**: En trayectoria hiperbólica hacia la estrella Aldebarán (Tauro) a más de 136 UA de la Tierra con la legendaria Placa de Oro de Carl Sagan.
   - **Pioneer 11**: Silencioso navegante interestelar dirigiéndose a la constelación del Águila (*Aquila*).
   - **Telescopio Espacial Kepler**: El legendario cazador de más de 2.600 exoplanetas en órbita heliocéntrica tras agotar su hidracina en 2018.
   - **STEREO-B**: Sonda de heliofísica en órbita solar que perdió contacto en 2014, reapareció brevemente en 2016 y volvió al silencio en 2018.
   - **SOHO**: El caso testigo del rescate más épico de la historia espacial, rescatado en 1998 usando el radiotelescopio de Arecibo.
   - **Dawn**: En órbita gravitacional eterna y silenciosa alrededor del planeta enano Ceres.
   - **Mars Polar Lander & Deep Space 2**: Descansando en los hielos del polo sur marciano (*Planum Australe*).
   - **Mars Observer**: Pérdida pre-inserción marciana en 1993, vagando en órbita heliocéntrica.
   - **Lunar Prospector**: Impacto controlado en el polo sur lunar que confirmó depósitos de hielo de agua.

3. **Mecánica de Juego y Simulación de Rescate (DSN)**:
   - **Sintonizador de Radiofrecuencia Analógico**: Ajuste continuo y fino de frecuencias (Banda S, Banda X, Banda UHF).
   - **Motor de Audio Procedural (Web Audio API)**:
     - Ruido cósmico de fondo y estática de radiofiltrada.
     - Tono de portadora con modulación Doppler.
     - Efecto acústico de *Carrier Lock* y fanfarria al rescatar.
   - **Cálculo Físico de Retraso de la Luz (One-Way & Round-Trip Light Time)**:
     - El backend en Python calcula en tiempo real los minutos u horas que tarda la señal de radio a la velocidad de la luz según la distancia astronómica real en Unidades Astronómicas (UA).
   - **Descifrado de Telemetría**: El operador ingresa la clave histórica del archivo de la NASA para decodificar los paquetes y desbloquear el Certificado de Misión.
   - **Guardado de Progreso**: Tus satélites rescatados se guardan automáticamente en tu navegador.

---

## 🛠️ Tecnologías Utilizadas

- **Frontend**:
  - `HTML5` semántico con diseño de estación de control espacial.
  - `CSS3` avanzado con *glassmorphism*, efectos scanlines CRT y paleta Sci-Fi de la NASA.
  - `Three.js` (r128) + `OrbitControls` para la renderización 3D por WebGL.
  - `Web Audio API` para síntesis de audio procedural en tiempo real.
- **Backend**:
  - `Python 3.13` & `Flask` para la API REST, cálculos orbitales de Kepler, latencia de la luz y decodificación de telemetría.
  - `JSON` para la base de datos histórica y astronómica.

---

## 🚀 Cómo Ejecutar el Simulador

### Opción 1: Inicio Rápido (Doble Clic en Windows)
Haz doble clic sobre el archivo:
```text
iniciar_simulador.bat
```
Este script iniciará automáticamente el servidor Flask y abrirá tu navegador en `http://127.0.0.1:5000`.

### Opción 2: Desde la Terminal (PowerShell o CMD)
```powershell
# Ejecutar el servidor Python
python app.py
```
*(Si no tienes `python` en tu PATH, puedes usar la ruta completa de Python 3.13 instalada en tu equipo):*
```powershell
& "$env:LOCALAPPDATA\Programs\Python\Python313\python.exe" app.py
```
Luego abre tu navegador en:
```
http://127.0.0.1:5000
```

---

## 🎮 Guía de Controles

| Acción | Control |
|---|---|
| **Rotar cámara orbital** | Arrastrar con clic izquierdo |
| **Hacer Zoom** | Rueda del ratón o pellizco táctil |
| **Desplazar vista (Pan)** | Arrastrar con clic derecho |
| **Seleccionar objeto** | Clic directo sobre el planeta o satélite en 3D |
| **Ajustar velocidad temporal** | Botones de tiempo en la barra superior (⏸, 0.5x, 1x, 5x, 25x, 100x) |
| **Activar/Silenciar audio DSN** | Botón de altavoz (🔊/🔇) en la esquina superior derecha |
