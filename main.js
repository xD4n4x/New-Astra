/**
 * NASA Lost Signals - Main Entry Point
 * Inicialización de Three.js, carga de datos de la API Python y enlace con controles HUD.
 */

document.addEventListener('DOMContentLoaded', async () => {
    console.log("🚀 Inicializando NASA Lost Signals Simulator...");

    // 1. Instanciar Motor 3D del Sistema Solar
    const solarSystem = new SolarSystem3D('canvas-container');
    window.solarSystem = solarSystem;

    // 2. Instanciar Gestor de Satélites
    const satellitesMgr = new SatellitesManager(solarSystem);
    window.satellitesMgr = satellitesMgr;

    // 3. Instanciar Centro de Control de Misiones
    const missionControl = new MissionControl();
    window.missionControl = missionControl;

    // 4. Cargar datos del Sistema Solar y Satélites desde la API Python
    try {
        const [sysResp, satResp] = await Promise.all([
            fetch('/api/solar-system'),
            fetch('/api/satellites')
        ]);

        const sysData = await sysResp.json();
        const satData = await satResp.json();

        // Construir planetas y sol en 3D
        solarSystem.buildSolarSystem(sysData.bodies);

        // Construir satélites perdidos en 3D
        satellitesMgr.loadSatellites(satData.satellites);

        // Inicializar Centro de Mando
        missionControl.init(satData.satellites, sysData.bodies);

        // Inyectar actualización de satélites en el bucle de animación de Three.js
        const originalAnimate = solarSystem.animate.bind(solarSystem);
        solarSystem.animate = function() {
            requestAnimationFrame(() => solarSystem.animate());

            const delta = 0.016;
            if (!solarSystem.isPaused) {
                const timeStep = delta * solarSystem.timeSpeed;
                solarSystem.simTime += timeStep;

                // Actualizar posiciones de planetas
                Object.keys(solarSystem.bodies).forEach(id => {
                    const body = solarSystem.bodies[id];
                    if (id !== 'sun') {
                        body.angle += body.speed * timeStep * 0.4;
                        body.group.position.x = body.radius * Math.cos(body.angle);
                        body.group.position.z = body.radius * Math.sin(body.angle);
                        body.mesh.rotation.y += 0.01;
                    } else {
                        body.mesh.rotation.y += 0.002;
                    }
                });

                // Actualizar satélites y trayectorias
                satellitesMgr.update(timeStep);

                if (solarSystem.asteroidBelt) {
                    solarSystem.asteroidBelt.rotation.y += 0.0003 * solarSystem.timeSpeed;
                }
            }

            // Suavizado de cámara
            if (solarSystem.focusedTarget) {
                const targetPos = new THREE.Vector3();
                solarSystem.focusedTarget.getWorldPosition(targetPos);
                solarSystem.controls.target.lerp(targetPos, 0.08);

                if (solarSystem.targetCamPosition) {
                    solarSystem.camera.position.lerp(solarSystem.targetCamPosition, 0.05);
                    if (solarSystem.camera.position.distanceTo(solarSystem.targetCamPosition) < 0.2) {
                        solarSystem.targetCamPosition = null;
                    }
                }
            } else if (solarSystem.targetCamPosition) {
                solarSystem.camera.position.lerp(solarSystem.targetCamPosition, 0.05);
                solarSystem.controls.target.lerp(new THREE.Vector3(0, 0, 0), 0.05);
                if (solarSystem.camera.position.distanceTo(solarSystem.targetCamPosition) < 0.2) {
                    solarSystem.targetCamPosition = null;
                }
            }

            solarSystem.controls.update();
            solarSystem.renderer.render(solarSystem.scene, solarSystem.camera);
            solarSystem.updateRadar();
        };

        missionControl.logTerminal(`[LOAD_COMPLETE] ${satData.satellites.length} sondas y satélites catalogados en la red DSN.`, 'success');

    } catch (err) {
        console.error("Error al cargar datos desde la API Python:", err);
        missionControl.logTerminal("[ERR] No se pudo obtener la telemetría del servidor backend.", 'alert');
    }

    // 5. Controles de Tiempo Simulado
    document.querySelectorAll('.time-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const speed = parseFloat(btn.getAttribute('data-speed'));
            if (speed === 0) {
                solarSystem.isPaused = true;
                missionControl.logTerminal("[TIME] Simulación pausada.", 'info');
            } else {
                solarSystem.isPaused = false;
                solarSystem.timeSpeed = speed;
                missionControl.logTerminal(`[TIME] Velocidad temporal fijada a ${speed}x.`, 'info');
            }
        });
    });

    // 6. Selector Rápido de Enfoque
    const quickSelect = document.getElementById('quick-target-select');
    if (quickSelect) {
        quickSelect.addEventListener('change', (e) => {
            const targetId = e.target.value;
            if (targetId) {
                missionControl.selectObject(targetId);
            }
        });
    }

    // 7. Botón de Vista General
    document.getElementById('reset-cam-btn')?.addEventListener('click', () => {
        solarSystem.resetCamera();
        missionControl.activeTarget = null;
        missionControl.renderCatalog();
        missionControl.logTerminal("[CAMERA] Cámara restablecida a vista general orbital.", 'info');
    });

    // 8. Toggles de Órbitas, Nombres y Asteroides
    document.getElementById('toggle-orbits')?.addEventListener('change', (e) => {
        solarSystem.setOrbitsVisible(e.target.checked);
    });

    document.getElementById('toggle-asteroids')?.addEventListener('change', (e) => {
        solarSystem.setAsteroidsVisible(e.target.checked);
    });

    document.getElementById('toggle-labels')?.addEventListener('change', (e) => {
        const visible = e.target.checked;
        if (satellitesMgr?.satelliteObjects) {
            Object.values(satellitesMgr.satelliteObjects).forEach(s => {
                if (s.group.userData.labelSprite) {
                    s.group.userData.labelSprite.visible = visible;
                }
            });
        }
    });

    // 9. Reloj UTC Misión en Tiempo Real
    function updateClock() {
        const clockEl = document.getElementById('utc-clock');
        if (clockEl) {
            const now = new Date();
            clockEl.textContent = now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
        }
    }
    setInterval(updateClock, 1000);
    updateClock();

    // 10. Botón de Audio
    const audioBtn = document.getElementById('audio-toggle-btn');
    const audioIcon = document.getElementById('audio-icon');
    if (audioBtn) {
        audioBtn.addEventListener('click', () => {
            window.audioMgr?.ensureContext();
            const isMuted = window.audioMgr?.toggleMute();
            audioIcon.textContent = isMuted ? '🔇' : '🔊';
            missionControl.logTerminal(`[AUDIO] Audio DSN ${isMuted ? 'SILENCIADO' : 'ACTIVADO'}.`, 'info');
        });
    }

    // Inicializar audio al primer toque/clic del usuario en pantalla (requisito de navegadores)
    window.addEventListener('click', () => {
        window.audioMgr?.ensureContext();
    }, { once: true });
});
