class SolarSystem2D {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');

        this.planetsData = [];
        this.planets = [];
        this.stars = [];
        this.isPaused = false;
        this.timeSpeed = 1.0;
        this.simTime = 0;

        this.zoom = 0.95;
        this.targetZoom = 0.95;
        this.panX = 0;
        this.panY = 0;
        this.targetPanX = 0;
        this.targetPanY = 0;
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;

        this.mouse = { x: -1000, y: -1000 };
        this.hoveredPlanet = null;
        this.hoveredHardware = null;
        this.selectedPlanet = null;

        this.planetCard = document.getElementById('planet-card');
        this.hardwareCard = document.getElementById('hardware-card');

        this.init();
    }

    async init() {
        this.resize();
        this.createStarfield();
        this.setupEventListeners();

        try {
            const resp = await fetch('/api/solar-system-2d');
            const data = await resp.json();
            this.planetsData = data.planets || [];
            this.initPlanets();
        } catch (err) {
            console.error("Error al cargar datos del sistema solar 2D:", err);
        }

        requestAnimationFrame(() => this.loop());
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        if (this.panX === 0 && this.panY === 0) {
            this.panX = this.canvas.width / 2;
            this.panY = this.canvas.height / 2;
            this.targetPanX = this.panX;
            this.targetPanY = this.panY;
        }
    }

    createStarfield() {
        this.stars = [];
        const count = 380;
        for (let i = 0; i < count; i++) {
            
            const colorType = Math.random();
            let color = '#ffffff';
            if (colorType > 0.85) {
                color = '#f472b6'; 
            } else if (colorType > 0.70) {
                color = '#fde047'; 
            }

            this.stars.push({
                x: Math.random() * 3200 - 1600,
                y: Math.random() * 3200 - 1600,
                radius: Math.random() * 1.5 + 0.3,
                baseAlpha: Math.random() * 0.7 + 0.3,
                twinkleSpeed: Math.random() * 0.03 + 0.01,
                color: color
            });
        }
    }

    initPlanets() {
        this.planets = this.planetsData.map((data, index) => {
            const angle = (index * (Math.PI * 2 / this.planetsData.length)) + Math.random();

            const hardwares = (data.hardwares || []).map((h, hIdx) => {
                const totalH = data.hardwares.length;
                
                const offsetAngle = (hIdx / totalH) * Math.PI * 2 + 0.5;
                
                const offsetDistance = data.radius * 1.5 + (hIdx * 12);
                return {
                    ...h,
                    offsetAngle,
                    offsetDistance,
                    screenX: 0,
                    screenY: 0,
                    size: 16
                };
            });

            return {
                ...data,
                angle: angle,
                x: 0,
                y: 0,
                screenX: 0,
                screenY: 0,
                hardwares: hardwares
            };
        });
    }

    setupEventListeners() {
        window.addEventListener('resize', () => this.resize());

        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - rect.left;
            this.mouse.y = e.clientY - rect.top;

            if (this.isDragging) {
                const dx = this.mouse.x - this.dragStartX;
                const dy = this.mouse.y - this.dragStartY;
                this.panX += dx;
                this.panY += dy;
                this.targetPanX = this.panX;
                this.targetPanY = this.panY;
                this.dragStartX = this.mouse.x;
                this.dragStartY = this.mouse.y;
            } else {
                this.checkHover();
            }
        });

        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) {
                this.isDragging = true;
                this.dragStartX = e.clientX;
                this.dragStartY = e.clientY;
            }
        });

        window.addEventListener('mouseup', () => {
            this.isDragging = false;
        });

        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
            this.zoomAtPoint(zoomFactor, this.mouse.x, this.mouse.y);
        }, { passive: false });

        this.canvas.addEventListener('click', () => {
            if (this.hoveredHardware) {
                this.showHardwareCard(this.hoveredHardware);
            } else if (this.hoveredPlanet) {
                this.focusOnPlanet(this.hoveredPlanet);
            }
        });

        const playPauseBtn = document.getElementById('btn-play-pause');
        if (playPauseBtn) {
            playPauseBtn.addEventListener('click', () => {
                this.isPaused = !this.isPaused;
                playPauseBtn.textContent = this.isPaused ? '▶' : '⏸';
            });
        }

        document.querySelectorAll('.sim-speed-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.sim-speed-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.timeSpeed = parseFloat(btn.getAttribute('data-speed'));
            });
        });

        document.getElementById('btn-zoom-in')?.addEventListener('click', () => {
            this.zoomAtPoint(1.25, this.canvas.width / 2, this.canvas.height / 2);
        });

        document.getElementById('btn-zoom-out')?.addEventListener('click', () => {
            this.zoomAtPoint(0.8, this.canvas.width / 2, this.canvas.height / 2);
        });

        document.getElementById('btn-reset-view')?.addEventListener('click', () => {
            this.resetView();
        });

        const planetSelector = document.getElementById('planet-selector');
        if (planetSelector) {
            planetSelector.addEventListener('change', (e) => {
                const id = e.target.value;
                if (!id) {
                    this.resetView();
                    return;
                }
                const p = this.planets.find(pl => pl.id === id);
                if (p) {
                    this.focusOnPlanet(p);
                }
            });
        }
    }

    zoomAtPoint(factor, screenX, screenY) {
        const newZoom = Math.max(0.4, Math.min(3.5, this.targetZoom * factor));
        const worldX = (screenX - this.targetPanX) / this.targetZoom;
        const worldY = (screenY - this.targetPanY) / this.targetZoom;

        this.targetZoom = newZoom;
        this.targetPanX = screenX - worldX * newZoom;
        this.targetPanY = screenY - worldY * newZoom;
    }

    focusOnPlanet(planet) {
        this.selectedPlanet = planet;
        this.targetZoom = 1.6;
        this.targetPanX = this.canvas.width / 2 - planet.x * this.targetZoom;
        this.targetPanY = this.canvas.height / 2 - planet.y * this.targetZoom;
        this.showPlanetCard(planet);
    }

    resetView() {
        this.selectedPlanet = null;
        this.targetZoom = 0.95;
        this.targetPanX = this.canvas.width / 2;
        this.targetPanY = this.canvas.height / 2;
        this.hidePlanetCard();
        this.hideHardwareCard();
        const sel = document.getElementById('planet-selector');
        if (sel) sel.value = '';
    }

    checkHover() {
        let foundHardware = null;
        let foundPlanet = null;

        for (const p of this.planets) {
            const isPlanetActive = (p === this.hoveredPlanet || p === this.selectedPlanet);
            
            const distToPlanet = Math.hypot(this.mouse.x - p.screenX, this.mouse.y - p.screenY);
            const planetInteractionRadius = Math.max(p.radius * this.zoom * 2.8, 55);

            if (distToPlanet < planetInteractionRadius || isPlanetActive) {
                for (const h of p.hardwares) {
                    const distH = Math.hypot(this.mouse.x - h.screenX, this.mouse.y - h.screenY);
                    if (distH < h.size + 8) {
                        foundHardware = h;
                        foundPlanet = p;
                        break;
                    }
                }
            }
            if (foundHardware) break;

            if (distToPlanet < planetInteractionRadius) {
                foundPlanet = p;
            }
        }

        if (foundHardware !== this.hoveredHardware) {
            this.hoveredHardware = foundHardware;
            if (this.hoveredHardware) {
                this.showHardwareCard(this.hoveredHardware);
            } else {
                this.hideHardwareCard();
            }
        }

        if (foundPlanet !== this.hoveredPlanet) {
            this.hoveredPlanet = foundPlanet;
            if (this.hoveredPlanet) {
                this.showPlanetCard(this.hoveredPlanet);
            } else if (!this.selectedPlanet) {
                this.hidePlanetCard();
            }
        }

        this.canvas.style.cursor = (foundHardware || foundPlanet) ? 'pointer' : (this.isDragging ? 'grabbing' : 'grab');
    }

    showPlanetCard(planet) {
        if (!this.planetCard) return;
        document.getElementById('planet-card-title').textContent = planet.name;
        document.getElementById('planet-card-desc').textContent = planet.description;
        document.getElementById('planet-hardware-count').textContent = `${planet.hardwares.length} artefactos detectados`;

        const img = document.getElementById('planet-card-img');
        if (img) {
            img.src = planet.image || '';
            img.onerror = () => {
                
                img.src = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="150" viewBox="0 0 300 150"><rect width="300" height="150" fill="%230f172a"/><circle cx="150" cy="75" r="50" fill="${encodeURIComponent(planet.color)}"/><text x="150" y="80" font-family="sans-serif" font-size="16" fill="%23ffffff" text-anchor="middle" font-weight="bold">${encodeURIComponent(planet.name)}</text></svg>`;
            };
        }

        const factsBox = document.getElementById('planet-facts-container');
        if (factsBox && planet.facts) {
            factsBox.innerHTML = Object.entries(planet.facts).map(([k, v]) => `
                <div class="fact-item">
                    <span class="fact-key">${k}</span>
                    <span class="fact-val">${v}</span>
                </div>
            `).join('');
        }

        this.planetCard.style.display = 'block';
    }

    hidePlanetCard() {
        if (this.planetCard && !this.selectedPlanet) {
            this.planetCard.style.display = 'none';
        }
    }

    showHardwareCard(hardware) {
        if (!this.hardwareCard) return;
        document.getElementById('hardware-card-name').textContent = hardware.name;
        document.getElementById('hardware-card-desc').textContent = hardware.shortInfo;
        document.getElementById('hardware-card-status').textContent = hardware.status;
        document.getElementById('hardware-type-label').textContent = hardware.type;
        document.getElementById('hardware-year-label').textContent = hardware.year;

        const img = document.getElementById('hardware-card-img');
        if (img) {
            img.src = hardware.image || '';
            img.onerror = () => {
                img.src = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="150" viewBox="0 0 300 150"><rect width="300" height="150" fill="%23090d16"/><path d="M120,60 L180,60 L180,90 L120,90 Z" fill="%23f59e0b"/><rect x="80" y="65" width="35" height="20" fill="%2338bdf8"/><rect x="185" y="65" width="35" height="20" fill="%2338bdf8"/><text x="150" y="125" font-family="sans-serif" font-size="13" fill="%23e2e8f0" text-anchor="middle">${encodeURIComponent(hardware.name)}</text></svg>`;
            };
        }

        this.hardwareCard.style.display = 'block';
    }

    hideHardwareCard() {
        if (this.hardwareCard) {
            this.hardwareCard.style.display = 'none';
        }
    }

    loop() {
        
        this.panX += (this.targetPanX - this.panX) * 0.1;
        this.panY += (this.targetPanY - this.panY) * 0.1;
        this.zoom += (this.targetZoom - this.zoom) * 0.1;

        if (!this.isPaused) {
            const dt = 0.016 * this.timeSpeed;
            this.simTime += dt;

            this.planets.forEach(p => {
                p.angle += p.orbitalSpeed * dt * 0.6;
            });
        }

        this.render();
        this.checkHover();
        requestAnimationFrame(() => this.loop());
    }

    render() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        ctx.clearRect(0, 0, w, h);

        ctx.fillStyle = '#030712';
        ctx.fillRect(0, 0, w, h);

        ctx.save();
        ctx.translate(this.panX, this.panY);
        ctx.scale(this.zoom, this.zoom);

        this.drawStars(ctx);

        this.drawOrbits(ctx);

        this.drawAsteroidBelt(ctx);

        this.drawSun(ctx);

        this.drawPlanets(ctx);

        ctx.restore();
    }

    drawStars(ctx) {
        this.stars.forEach(s => {
            const alpha = s.baseAlpha + Math.sin(this.simTime * 2 + s.x) * 0.2;
            ctx.fillStyle = s.color || '#ffffff';
            ctx.globalAlpha = Math.max(0.1, Math.min(1.0, alpha));
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1.0;
    }

    drawSun(ctx) {
        const sunRadius = 46;

        const glowGrad = ctx.createRadialGradient(0, 0, sunRadius * 0.5, 0, 0, sunRadius * 2.8);
        glowGrad.addColorStop(0, 'rgba(255, 200, 50, 0.9)');
        glowGrad.addColorStop(0.35, 'rgba(249, 115, 22, 0.45)');
        glowGrad.addColorStop(0.7, 'rgba(239, 68, 68, 0.15)');
        glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(0, 0, sunRadius * 2.8, 0, Math.PI * 2);
        ctx.fill();

        const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, sunRadius);
        coreGrad.addColorStop(0, '#fffbeb');
        coreGrad.addColorStop(0.5, '#fde047');
        coreGrad.addColorStop(0.9, '#ea580c');
        coreGrad.addColorStop(1, '#9a3412');
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(0, 0, sunRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fef08a';
        ctx.font = '600 11px "Orbitron", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('SOL', 0, sunRadius + 18);
    }

    drawOrbits(ctx) {
        ctx.lineWidth = 1;
        this.planets.forEach(p => {
            const isHovered = (p === this.hoveredPlanet || p === this.selectedPlanet);
            ctx.strokeStyle = isHovered ? 'rgba(56, 189, 248, 0.65)' : 'rgba(71, 85, 105, 0.35)';
            ctx.setLineDash(isHovered ? [6, 4] : [2, 4]);

            ctx.beginPath();
            ctx.arc(0, 0, p.orbitDistance, 0, Math.PI * 2);
            ctx.stroke();
        });
        ctx.setLineDash([]);
    }

    drawAsteroidBelt(ctx) {
        ctx.fillStyle = 'rgba(148, 163, 184, 0.45)';
        const beltCount = 180;
        const inner = 330;
        const outer = 355;
        for (let i = 0; i < beltCount; i++) {
            const a = (i / beltCount) * Math.PI * 2 + Math.sin(i) * 0.05;
            const r = inner + (i % 25);
            const x = Math.cos(a) * r;
            const y = Math.sin(a) * r;
            ctx.beginPath();
            ctx.arc(x, y, 1.2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawPlanets(ctx) {
        this.planets.forEach(p => {
            
            p.x = Math.cos(p.angle) * p.orbitDistance;
            p.y = Math.sin(p.angle) * p.orbitDistance;

            p.screenX = p.x * this.zoom + this.panX;
            p.screenY = p.y * this.zoom + this.panY;

            const isHovered = (p === this.hoveredPlanet || p === this.selectedPlanet);

            if (p.hasRings) {
                this.drawPlanetRings(ctx, p);
            }

            this.drawPlanetBody(ctx, p, isHovered);

            if (p.hasRings) {
                this.drawPlanetRingsFront(ctx, p);
            }

            ctx.fillStyle = isHovered ? '#38bdf8' : '#cbd5e1';
            ctx.font = isHovered ? '700 12px "Orbitron", sans-serif' : '500 10px "Inter", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(p.name, p.x, p.y + p.radius + 16);

            this.drawAbandonedHardwares(ctx, p, isHovered);
        });
    }

    drawPlanetBody(ctx, p, isHovered) {
        const r = isHovered ? p.radius * 1.15 : p.radius;

        if (isHovered) {
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 18;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(p.x, p.y, r + 4, 0, Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        if (p.id === 'jupiter') {
            
            this.drawJupiterTexture(ctx, p.x, p.y, r);
        } else if (p.id === 'earth') {
            
            this.drawEarthTexture(ctx, p.x, p.y, r);
        } else if (p.id === 'mars') {
            
            this.drawMarsTexture(ctx, p.x, p.y, r);
        } else {
            
            const grad = ctx.createRadialGradient(p.x - r * 0.35, p.y - r * 0.35, r * 0.1, p.x, p.y, r);
            grad.addColorStop(0, '#ffffff');
            grad.addColorStop(0.3, p.color);
            grad.addColorStop(1, '#050b14');

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawJupiterTexture(ctx, cx, cy, r) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.clip();

        ctx.fillStyle = '#fed7aa';
        ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

        const bands = [
            { y: -0.65, h: 0.22, color: '#ea580c' },
            { y: -0.25, h: 0.18, color: '#c2410c' },
            { y: 0.15, h: 0.25, color: '#ea580c' },
            { y: 0.55, h: 0.2, color: '#9a3412' }
        ];

        bands.forEach(b => {
            ctx.fillStyle = b.color;
            ctx.fillRect(cx - r, cy + b.y * r, r * 2, b.h * r);
        });

        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.ellipse(cx + r * 0.35, cy + r * 0.22, r * 0.28, r * 0.16, 0, 0, Math.PI * 2);
        ctx.fill();

        const shadowGrad = ctx.createRadialGradient(cx - r * 0.4, cy - r * 0.4, r * 0.3, cx, cy, r);
        shadowGrad.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
        shadowGrad.addColorStop(0.8, 'rgba(0, 0, 0, 0)');
        shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0.7)');
        ctx.fillStyle = shadowGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    drawEarthTexture(ctx, cx, cy, r) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.clip();

        ctx.fillStyle = '#2563eb';
        ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

        ctx.fillStyle = '#16a34a';
        ctx.beginPath();
        ctx.arc(cx - r * 0.2, cy - r * 0.1, r * 0.45, 0, Math.PI * 2);
        ctx.arc(cx + r * 0.3, cy + r * 0.25, r * 0.38, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.beginPath();
        ctx.ellipse(cx, cy - r * 0.25, r * 0.7, r * 0.15, 0.2, 0, Math.PI * 2);
        ctx.fill();

        const atmos = ctx.createRadialGradient(cx, cy, r * 0.8, cx, cy, r);
        atmos.addColorStop(0, 'rgba(56, 189, 248, 0)');
        atmos.addColorStop(1, 'rgba(56, 189, 248, 0.6)');
        ctx.fillStyle = atmos;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    drawMarsTexture(ctx, cx, cy, r) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.clip();

        ctx.fillStyle = '#ea580c';
        ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

        ctx.fillStyle = '#9a3412';
        ctx.beginPath();
        ctx.arc(cx + r * 0.1, cy + r * 0.15, r * 0.55, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(cx, cy - r * 0.82, r * 0.38, r * 0.18, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    drawPlanetRings(ctx, p) {
        ctx.save();
        ctx.strokeStyle = 'rgba(234, 179, 8, 0.55)';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.radius * 2.2, p.radius * 0.6, -0.25, Math.PI, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    drawPlanetRingsFront(ctx, p) {
        ctx.save();
        ctx.strokeStyle = 'rgba(234, 179, 8, 0.75)';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.radius * 2.2, p.radius * 0.6, -0.25, 0, Math.PI);
        ctx.stroke();
        ctx.restore();
    }

    drawAbandonedHardwares(ctx, p, isPlanetActive) {
        p.hardwares.forEach((h, idx) => {

            const currentAngle = h.offsetAngle + (this.simTime * 0.15 * (idx % 2 === 0 ? 1 : -1));
            const hx = p.x + Math.cos(currentAngle) * h.offsetDistance;
            const hy = p.y + Math.sin(currentAngle) * h.offsetDistance;

            h.screenX = hx * this.zoom + this.panX;
            h.screenY = hy * this.zoom + this.panY;

            const isHov = (h === this.hoveredHardware);

            ctx.save();
            ctx.translate(hx, hy);

            if (isHov) {
                ctx.shadowColor = '#f59e0b';
                ctx.shadowBlur = 14;
            }

            this.drawHardwareIcon(ctx, h.icon, isHov);

            const pulse = (Math.sin(this.simTime * 4 + idx) + 1) * 0.5;
            ctx.fillStyle = isHov ? '#f59e0b' : `rgba(239, 68, 68, ${0.4 + pulse * 0.6})`;
            ctx.beginPath();
            ctx.arc(0, -9, 2.5, 0, Math.PI * 2);
            ctx.fill();

            if (isPlanetActive || isHov) {
                ctx.fillStyle = isHov ? '#fef08a' : '#e2e8f0';
                ctx.font = isHov ? '700 11px "Orbitron", sans-serif' : '500 9px "Share Tech Mono", monospace';
                ctx.textAlign = 'center';
                ctx.fillText(h.name, 0, 16);
            }

            ctx.restore();
        });
    }

    drawHardwareIcon(ctx, iconType, isHov) {
        const bodyColor = isHov ? '#f59e0b' : '#334155';
        const panelColor = isHov ? '#38bdf8' : '#1e293b';
        const strokeColor = isHov ? '#ffffff' : '#64748b';

        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 1.2;

        ctx.fillStyle = bodyColor;
        ctx.fillRect(-4, -5, 8, 10);
        ctx.strokeRect(-4, -5, 8, 10);

        ctx.fillStyle = panelColor;
        
        ctx.fillRect(-12, -4, 7, 8);
        ctx.strokeRect(-12, -4, 7, 8);
        
        ctx.fillRect(5, -4, 7, 8);
        ctx.strokeRect(5, -4, 7, 8);

        ctx.beginPath();
        ctx.arc(0, -6, 3, Math.PI, 0);
        ctx.stroke();
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.solarApp = new SolarSystem2D('solar-canvas');
});
