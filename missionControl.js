/**
 * NASA Lost Signals - Mission Control & DSN Recovery Simulator
 * Lógica del minijuego de rastreo, sintonizador de radiofrecuencia y comunicación con backend Python.
 */

class MissionControl {
    constructor() {
        this.satellites = [];
        this.planets = [];
        this.currentFilter = 'all';
        this.activeTarget = null;
        this.recoveredIds = new Set();

        // Estado del sintonizador DSN
        this.tunedFrequency = 2200.0;
        this.carrierLocked = false;
        this.lastPingResponse = null;

        // Cargar rescatados de almacenamiento local
        this.loadProgress();
        this.setupEventListeners();
    }

    loadProgress() {
        try {
            const saved = localStorage.getItem('nasa_recovered_satellites');
            if (saved) {
                this.recoveredIds = new Set(JSON.parse(saved));
            }
        } catch (e) {
            console.warn("No se pudo leer localStorage:", e);
        }
    }

    saveProgress() {
        try {
            localStorage.setItem('nasa_recovered_satellites', JSON.stringify(Array.from(this.recoveredIds)));
        } catch (e) {
            console.warn("No se pudo guardar en localStorage:", e);
        }
    }

    init(satellitesData, planetsData) {
        this.satellites = satellitesData;
        this.planets = planetsData;

        // Sincronizar estado previo de satélites recuperados
        this.satellites.forEach(sat => {
            if (this.recoveredIds.has(sat.id)) {
                sat.statusType = 'recovered';
                sat.status = 'ENLACE DSN RESTABLECIDO';
                if (window.satellitesMgr) {
                    window.satellitesMgr.markAsRecovered(sat.id);
                }
            }
        });

        this.renderCatalog();
        this.updateRecoveredCounter();
        this.renderRecoveredLogbook();
    }

    setupEventListeners() {
        // 1. Selector de Pestañas
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetTab = btn.getAttribute('data-tab');
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                btn.classList.add('active');
                document.getElementById(targetTab)?.classList.add('active');
            });
        });

        // 2. Filtros de catálogo
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentFilter = btn.getAttribute('data-filter');
                this.renderCatalog();
            });
        });

        // 3. Búsqueda en catálogo
        const searchInput = document.getElementById('catalog-search');
        if (searchInput) {
            searchInput.addEventListener('input', () => this.renderCatalog());
        }

        // 4. Dial de sintonización de frecuencia
        const freqSlider = document.getElementById('freq-slider');
        const freqDisplay = document.getElementById('freq-display');
        if (freqSlider && freqDisplay) {
            freqSlider.addEventListener('input', (e) => {
                this.tunedFrequency = parseFloat(e.target.value);
                freqDisplay.textContent = `${this.tunedFrequency.toFixed(1)} MHz`;
                this.evaluateSignalResonance();
            });
        }

        // 5. Botones de ajuste fino
        document.querySelectorAll('.tune-step-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const delta = parseFloat(btn.getAttribute('data-delta'));
                this.tunedFrequency = Math.max(100, Math.min(9000, this.tunedFrequency + delta));
                if (freqSlider) freqSlider.value = this.tunedFrequency;
                if (freqDisplay) freqDisplay.textContent = `${this.tunedFrequency.toFixed(1)} MHz`;
                this.evaluateSignalResonance();
            });
        });

        // 6. Transmitir pulso de radio DSN (Llamada al backend Python)
        const transmitBtn = document.getElementById('transmit-ping-btn');
        if (transmitBtn) {
            transmitBtn.addEventListener('click', () => this.sendDSNPing());
        }

        // 7. Enviar clave de Handshake / Recuperación
        const handshakeSubmit = document.getElementById('handshake-submit-btn');
        if (handshakeSubmit) {
            handshakeSubmit.addEventListener('click', () => this.submitHandshake());
        }

        // 8. Evento personalizado cuando se hace clic en un objeto 3D
        window.addEventListener('spaceObjectClicked', (e) => {
            const objData = e.detail;
            this.selectObject(objData.id);
        });

        // 9. Modales de cierre
        document.getElementById('modal-close-btn')?.addEventListener('click', () => {
            document.getElementById('mission-modal').style.display = 'none';
        });
        document.getElementById('modal-continue-btn')?.addEventListener('click', () => {
            document.getElementById('mission-modal').style.display = 'none';
        });

        document.getElementById('help-modal-btn')?.addEventListener('click', () => {
            document.getElementById('help-modal').style.display = 'flex';
        });
        document.getElementById('help-modal-close-btn')?.addEventListener('click', () => {
            document.getElementById('help-modal').style.display = 'none';
        });
        document.getElementById('help-continue-btn')?.addEventListener('click', () => {
            document.getElementById('help-modal').style.display = 'none';
        });
    }

    renderCatalog() {
        const listContainer = document.getElementById('satellites-list');
        if (!listContainer) return;

        const searchText = (document.getElementById('catalog-search')?.value || '').toLowerCase();
        listContainer.innerHTML = '';

        // Juntar satélites y planetas según filtro
        let items = [];
        if (this.currentFilter === 'all' || this.currentFilter === 'lost' || this.currentFilter === 'recovered') {
            this.satellites.forEach(s => {
                if (this.currentFilter === 'all' || s.statusType === this.currentFilter) {
                    items.push({ type: 'satellite', item: s });
                }
            });
        }
        if (this.currentFilter === 'all' || this.currentFilter === 'planets') {
            this.planets.forEach(p => {
                items.push({ type: 'planet', item: p });
            });
        }

        // Filtro de texto
        if (searchText) {
            items = items.filter(({ item }) => {
                return item.name.toLowerCase().includes(searchText) ||
                       (item.fullName && item.fullName.toLowerCase().includes(searchText)) ||
                       (item.description && item.description.toLowerCase().includes(searchText));
            });
        }

        items.forEach(({ type, item }) => {
            const card = document.createElement('div');
            card.className = `catalog-card ${this.activeTarget?.id === item.id ? 'selected' : ''}`;
            
            const badgeClass = type === 'planet' ? 'planet' : (item.statusType === 'recovered' ? 'recovered' : 'lost');
            const badgeText = type === 'planet' ? 'PLANETA' : (item.statusType === 'recovered' ? 'RESCATADO' : 'PERDIDO');

            card.innerHTML = `
                <div class="card-top">
                    <span class="card-title">${item.name}</span>
                    <span class="card-badge ${badgeClass}">${badgeText}</span>
                </div>
                <div class="card-details">
                    <span>${type === 'satellite' ? `Freq: ${item.frequency} MHz` : `Dist: ${item.distanceAU} AU`}</span>
                    <span>${type === 'satellite' ? `Banda: ${item.frequencyBand}` : `Tipo: ${item.type}`}</span>
                </div>
                <div class="card-actions">
                    <button class="hud-btn view-btn">ENFOCAR 3D</button>
                    ${type === 'satellite' ? '<button class="hud-btn tune-btn">SINTONIZAR DSN</button>' : ''}
                </div>
            `;

            // Clic en toda la tarjeta
            card.addEventListener('click', (e) => {
                if (e.target.classList.contains('tune-btn')) {
                    this.selectObject(item.id, true);
                } else {
                    this.selectObject(item.id, false);
                }
            });

            listContainer.appendChild(card);
        });
    }

    selectObject(id, openDSN = false) {
        // Buscar satélite o planeta
        let sat = this.satellites.find(s => s.id === id);
        let planet = this.planets.find(p => p.id === id);
        const obj = sat || planet;
        if (!obj) return;

        this.activeTarget = obj;
        this.renderCatalog();

        // Mover cámara 3D hacia el objetivo
        if (sat && window.satellitesMgr?.satelliteObjects[id]) {
            window.solarSystem.focusOn(window.satellitesMgr.satelliteObjects[id].group);
        } else if (planet && window.solarSystem?.bodies[id]) {
            window.solarSystem.focusOn(window.solarSystem.bodies[id].group);
        }

        // Si es satélite, activar consola DSN
        if (sat) {
            this.setupDSNTarget(sat);
            if (openDSN) {
                // Cambiar a pestaña DSN
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                document.querySelector('.tab-btn[data-tab="dsn-tab"]')?.classList.add('active');
                document.getElementById('dsn-tab')?.classList.add('active');
            }
        }

        this.logTerminal(`[TARGET_LOCK] Objetivo enfocado: ${obj.name} (${sat ? 'Satélite/Sonda' : 'Cuerpo Mayor'}).`, 'info');
    }

    setupDSNTarget(sat) {
        const cardContainer = document.getElementById('active-target-card');
        const tunerBox = document.getElementById('tuner-box');
        const hintCode = document.getElementById('hint-key-code');

        if (!cardContainer || !tunerBox) return;

        tunerBox.style.display = 'flex';
        const isRecovered = sat.statusType === 'recovered';

        cardContainer.innerHTML = `
            <div class="target-active-info">
                <div class="target-title-row">
                    <span class="target-name">${sat.name}</span>
                    <span class="card-badge ${isRecovered ? 'recovered' : 'lost'}">${sat.status}</span>
                </div>
                <div class="target-stat-grid">
                    <div class="stat-item"><span class="stat-label">Distancia:</span> <span class="stat-val">${sat.distanceKm || sat.distanceAU + ' AU'}</span></div>
                    <div class="stat-item"><span class="stat-label">Banda:</span> <span class="stat-val">${sat.frequencyBand}</span></div>
                    <div class="stat-item"><span class="stat-label">Lanzamiento:</span> <span class="stat-val">${sat.launchDate}</span></div>
                    <div class="stat-item"><span class="stat-label">Pérdida/Silencio:</span> <span class="stat-val">${sat.lostDate}</span></div>
                </div>
            </div>
        `;

        if (hintCode) {
            hintCode.textContent = sat.signalChallenge.encryptionKey;
        }

        // Sintonizador cerca de la frecuencia objetivo
        const slider = document.getElementById('freq-slider');
        const display = document.getElementById('freq-display');
        const targetFreq = sat.signalChallenge.targetFreq;

        // Iniciar un poco desfasado para que el jugador sintonice
        this.tunedFrequency = isRecovered ? targetFreq : Math.round(targetFreq + (Math.random() > 0.5 ? 4.5 : -4.5));
        if (slider) slider.value = this.tunedFrequency;
        if (display) display.textContent = `${this.tunedFrequency.toFixed(1)} MHz`;

        this.evaluateSignalResonance();
    }

    evaluateSignalResonance() {
        if (!this.activeTarget || !this.activeTarget.signalChallenge) return;

        const targetFreq = this.activeTarget.signalChallenge.targetFreq;
        const delta = Math.abs(this.tunedFrequency - targetFreq);
        
        let quality = 0;
        if (delta <= 5.0) {
            quality = Math.max(0, 100 - (delta / 5.0) * 100);
        }

        const qualityEl = document.getElementById('signal-quality');
        const meterBar = document.getElementById('carrier-meter-bar');
        const badge = document.getElementById('carrier-status-badge');
        const handshakeSec = document.getElementById('handshake-section');

        if (qualityEl) qualityEl.textContent = `${quality.toFixed(0)}%`;
        if (meterBar) meterBar.style.width = `${quality}%`;

        // Audio reactivo continuo
        window.audioMgr?.setTuningResonance(quality, this.tunedFrequency);

        if (quality >= 85.0) {
            this.carrierLocked = true;
            if (badge) {
                badge.className = 'carrier-status-badge locked';
                badge.textContent = 'PORTADORA BLOQUEADA (CARRIER LOCKED)';
            }
            if (handshakeSec) handshakeSec.style.display = 'flex';
        } else {
            this.carrierLocked = false;
            if (badge) {
                badge.className = 'carrier-status-badge';
                badge.textContent = 'DESCONECTADO (NO CARRIER)';
            }
            if (handshakeSec) handshakeSec.style.display = 'none';
        }
    }

    /**
     * Enviar Ping al backend Python
     */
    async sendDSNPing() {
        if (!this.activeTarget) return;

        window.audioMgr?.playPingPulse();
        this.logTerminal(`[DSN_TX] Transmitiendo pulso de radio en ${this.tunedFrequency.toFixed(1)} MHz hacia ${this.activeTarget.name}...`, 'warn');

        try {
            const resp = await fetch(`/api/satellites/${this.activeTarget.id}/ping`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    frequency: this.tunedFrequency,
                    station: 'goldstone'
                })
            });

            const data = await resp.json();
            this.lastPingResponse = data;

            // Actualizar métricas del HUD
            document.getElementById('signal-power').textContent = `${data.powerDbm} dBm`;
            document.getElementById('signal-latency').textContent = data.latencyFormatted;

            if (data.carrierLock) {
                window.audioMgr?.playCarrierLock();
                this.logTerminal(`[CARRIER_LOCK] ¡Señal recibida de ${data.satelliteName}! RTT: ${data.latencyFormatted} | SNR: ${data.powerDbm} dBm.`, 'success');
                this.logTerminal(`[TELEMETRY] ${data.telemetrySnippet}`, 'info');
            } else {
                this.logTerminal(`[DSN_NO_ECHO] Sin eco coherente en ${this.tunedFrequency.toFixed(1)} MHz (Delta: ${data.frequencyDeltaMHz} MHz). Ajusta la frecuencia.`, 'alert');
            }

        } catch (err) {
            console.error("Error al conectar con el backend Python:", err);
            this.logTerminal(`[SERVER_ERR] Error en el enlace con el servidor de la NASA.`, 'alert');
        }
    }

    /**
     * Enviar clave de Handshake / Recuperación al backend Python
     */
    async submitHandshake() {
        if (!this.activeTarget) return;
        const keyInput = document.getElementById('handshake-key-input');
        const keyVal = keyInput?.value?.trim();

        if (!keyVal) {
            alert("Ingresa la clave de encriptación histórica de la misión.");
            return;
        }

        this.logTerminal(`[HANDSHAKE] Enviando vector de recuperación '${keyVal}' hacia ${this.activeTarget.name}...`, 'warn');

        try {
            const resp = await fetch('/api/telemetry/decode', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    satelliteId: this.activeTarget.id,
                    authKey: keyVal,
                    commandSequence: "COLD_REBOOT_DSN_PULSE"
                })
            });

            const result = await resp.json();

            if (resp.ok && result.status === 'success') {
                window.audioMgr?.playSuccessFanfare();
                this.recoveredIds.add(this.activeTarget.id);
                this.saveProgress();

                // Marcar en Three.js y catálogo
                this.activeTarget.statusType = 'recovered';
                this.activeTarget.status = 'ENLACE DSN RESTABLECIDO';
                window.satellitesMgr?.markAsRecovered(this.activeTarget.id);

                this.renderCatalog();
                this.updateRecoveredCounter();
                this.renderRecoveredLogbook();
                this.setupDSNTarget(this.activeTarget);

                this.logTerminal(`[RECOVERY_SUCCESS] ¡${this.activeTarget.name} RESCATADO! Telemetría histórica restablecida.`, 'success');

                // Mostrar Modal de Certificado
                this.showSuccessModal(this.activeTarget, result);
            } else {
                this.logTerminal(`[AUTH_REJECTED] ${result.message}`, 'alert');
                alert(result.message + "\n\n" + (result.hint || ''));
            }

        } catch (err) {
            console.error("Error al decodificar telemetría:", err);
            this.logTerminal(`[DECODE_ERR] Fallo de comunicación con el decodificador en Python.`, 'alert');
        }
    }

    showSuccessModal(satellite, recoveryData) {
        document.getElementById('modal-sat-name').textContent = satellite.fullName || satellite.name;
        document.getElementById('modal-story').textContent = satellite.story;
        document.getElementById('modal-legacy').textContent = satellite.scientificMission;
        document.getElementById('modal-telemetry-raw').textContent = recoveryData.fullTelemetry;
        document.getElementById('mission-modal').style.display = 'flex';
    }

    updateRecoveredCounter() {
        const counter = document.getElementById('recovered-counter');
        if (counter) {
            const total = this.satellites.length;
            const recovered = this.recoveredIds.size;
            counter.textContent = `${recovered}/${total}`;
        }
    }

    renderRecoveredLogbook() {
        const container = document.getElementById('recovered-list');
        if (!container) return;

        if (this.recoveredIds.size === 0) {
            container.innerHTML = `
                <div class="empty-logbook">
                    <p>Aún no has reconectado con ningún satélite perdido.</p>
                    <p>Sintoniza frecuencias con el dial DSN para restaurar expedientes históricos de la NASA.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = '';
        this.satellites.forEach(sat => {
            if (this.recoveredIds.has(sat.id)) {
                const item = document.createElement('div');
                item.className = 'recovered-item-card';
                item.innerHTML = `
                    <div class="card-top">
                        <span class="card-title">${sat.name}</span>
                        <span class="card-badge recovered">RECONECTADO</span>
                    </div>
                    <p style="font-size: 11px; color: var(--text-secondary); margin-top: 4px;">${sat.fullName}</p>
                `;
                item.addEventListener('click', () => {
                    this.selectObject(sat.id, true);
                });
                container.appendChild(item);
            }
        });
    }

    logTerminal(text, type = 'info') {
        const body = document.getElementById('terminal-body');
        if (!body) return;

        const line = document.createElement('div');
        line.className = `log-line ${type}`;
        line.textContent = text;
        body.appendChild(line);

        // Mantener como máximo 30 líneas
        while (body.children.length > 30) {
            body.removeChild(body.firstChild);
        }
    }
}
