

class AudioManager {
    constructor() {
        this.ctx = null;
        this.isMuted = false;
        this.initialized = false;
        this.audioProfile = {
            system: 'DSN Relay Audio System',
            description: 'Ruido cósmico de fondo, portadora sintonizada y alertas de misión.',
            features: [
                'ruido cósmico de fondo',
                'estática radiofiltrada',
                'portadora con modulación Doppler',
                'Carrier Lock chime',
                'fanfarria de rescate',
                'silenciado por usuario'
            ]
        };

        this.noiseNode = null;
        this.noiseGain = null;
        this.carrierOsc = null;
        this.carrierGain = null;
    }

    init() {
        if (this.initialized) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
            this.initNoiseGenerator();
            this.initialized = true;
        } catch (e) {
            console.warn("Web Audio API no soportado o bloqueado por el navegador:", e);
        }
    }

    ensureContext() {
        if (!this.initialized) {
            this.init();
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    initNoiseGenerator() {
        const bufferSize = this.ctx.sampleRate * 2;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = buffer.getChannelData(0);

        let b0 = 0, b1 = 0, b2 = 0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            output[i] = (b0 + b1 + b2 + white * 0.05) * 0.11;
        }

        const whiteNoise = this.ctx.createBufferSource();
        whiteNoise.buffer = buffer;
        whiteNoise.loop = true;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 850;
        filter.Q.value = 1.2;

        this.noiseGain = this.ctx.createGain();
        this.noiseGain.gain.value = 0.03;

        whiteNoise.connect(filter);
        filter.connect(this.noiseGain);
        this.noiseGain.connect(this.ctx.destination);
        whiteNoise.start(0);

        this.carrierOsc = this.ctx.createOscillator();
        this.carrierOsc.type = 'sine';
        this.carrierOsc.frequency.value = 440;

        this.carrierGain = this.ctx.createGain();
        this.carrierGain.gain.value = 0.0;

        this.carrierOsc.connect(this.carrierGain);
        this.carrierGain.connect(this.ctx.destination);
        this.carrierOsc.start(0);
    }

    setTuningResonance(qualityPercent, frequencyMHz) {
        if (!this.initialized || this.isMuted) return;
        this.ensureContext();

        const q = Math.max(0, Math.min(100, qualityPercent)) / 100;
        const now = this.ctx.currentTime;
        if (this.noiseGain) {
            this.noiseGain.gain.setTargetAtTime(0.04 * (1 - q * 0.8), now, 0.05);
        }

        if (this.carrierGain && this.carrierOsc) {
            const audioPitch = 300 + (frequencyMHz % 1000) * 0.6;
            this.carrierOsc.frequency.setTargetAtTime(audioPitch, now, 0.05);
            this.carrierGain.gain.setTargetAtTime(q * 0.08, now, 0.05);
        }
    }

    playPingPulse() {
        if (this.isMuted) return;
        this.ensureContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.35);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.35);
    }

    playCarrierLock() {
        if (this.isMuted) return;
        this.ensureContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.50];

        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + i * 0.08);

            gain.gain.setValueAtTime(0.12, now + i * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.4);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now + i * 0.08);
            osc.stop(now + i * 0.08 + 0.4);
        });
    }

    playSuccessFanfare() {
        if (this.isMuted) return;
        this.ensureContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const chord = [440, 554.37, 659.25, 880];

        chord.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.12);

            gain.gain.setValueAtTime(0.15, now + idx * 0.12);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.9);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now + idx * 0.12);
            osc.stop(now + idx * 0.12 + 0.9);
        });
    }

    getAudioProfile() {
        return {
            ...this.audioProfile,
            initialized: this.initialized,
            muted: this.isMuted,
            output: this.ctx ? 'Web Audio API activo' : 'Web Audio API inactivo'
        };
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.ctx && this.noiseGain && this.carrierGain) {
            const now = this.ctx.currentTime;
            if (this.isMuted) {
                this.noiseGain.gain.setValueAtTime(0, now);
                this.carrierGain.gain.setValueAtTime(0, now);
            } else {
                this.noiseGain.gain.setValueAtTime(0.03, now);
                this.carrierGain.gain.setValueAtTime(0.04, now);
            }
        }
        return this.isMuted;
    }
}

window.audioMgr = new AudioManager();
