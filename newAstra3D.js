class NewAstra3D {
    constructor() {
        this.container = document.getElementById('canvas-wrapper');
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2(-1000, -1000);

        this.planetsData = [];
        this.planetObjects = {};
        this.hardwareObjects = {};
        this.orbitLines = [];
        this.asteroidBelt = null;

        this.timeSpeed = 1.0;
        this.simTime = 0;
        this.isPaused = false;
        this.focusedTarget = null;
        this.targetCamPosition = null;
        this.targetControlsTarget = null;

        this.hoveredPlanet = null;
        this.hoveredHardware = null;

        this.planetCard = document.getElementById('planet-card');
        this.hardwareCard = document.getElementById('hardware-card');

        this.init();
    }

    async init() {
        this.setupThree();
        this.setupLights();
        this.createStarfield();

        try {
            let resp = await fetch('/api/solar-system-2d');
            if (!resp.ok) {
                resp = await fetch('/data/solar_system_2d.json');
            }
            const data = await resp.json();
            this.planetsData = data.planets || [];
            this.buildSolarSystem();
        } catch (err) {
            try {
                const fallback = await fetch('/data/solar_system_2d.json');
                const fData = await fallback.json();
                this.planetsData = fData.planets || [];
                this.buildSolarSystem();
            } catch (e) {
                console.error("Error al cargar datos del sistema solar:", e);
            }
        }

        this.setupEvents();
        this.animate();
    }

    setupThree() {
        const width = window.innerWidth;
        const height = window.innerHeight;

        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x030712, 0.0006);

        this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 8000);
        this.camera.position.set(0, 240, 480);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.15;
        this.container.appendChild(this.renderer.domElement);

        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxDistance = 2500;
        this.controls.minDistance = 5.0;
        this.controls.target.set(0, 0, 0);
    }

    setupLights() {
        
        const ambient = new THREE.AmbientLight(0x23324d, 1.4);
        this.scene.add(ambient);

        const sunLight = new THREE.PointLight(0xfff7d6, 3.2, 5000, 0.35);
        sunLight.position.set(0, 0, 0);
        this.scene.add(sunLight);
    }

    createStarfield() {
        const count = 5000;
        const geo = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);

        for (let i = 0; i < count; i++) {
            const r = 2400 + Math.random() * 1200;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(Math.random() * 2 - 1);

            positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = r * Math.cos(phi);

            const rnd = Math.random();
            if (rnd > 0.82) {
                
                colors[i * 3] = 0.96; colors[i * 3 + 1] = 0.45; colors[i * 3 + 2] = 0.71;
            } else if (rnd > 0.65) {
                
                colors[i * 3] = 0.99; colors[i * 3 + 1] = 0.88; colors[i * 3 + 2] = 0.35;
            } else {
                
                colors[i * 3] = 0.92; colors[i * 3 + 1] = 0.95; colors[i * 3 + 2] = 1.0;
            }
        }

        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const mat = new THREE.PointsMaterial({
            size: 2.2,
            vertexColors: true,
            transparent: true,
            opacity: 0.85
        });

        this.scene.add(new THREE.Points(geo, mat));
    }

    buildSolarSystem() {
        
        this.createSun3D();

        this.planetsData.forEach((planetData, index) => {
            this.createPlanet3D(planetData, index);
        });

        this.createAsteroidBelt3D();
    }

    createSun3D() {
        const sunGroup = new THREE.Group();

        const geo = new THREE.SphereGeometry(22, 48, 48);
        const mat = new THREE.MeshBasicMaterial({ color: 0xffea78 });
        const sunMesh = new THREE.Mesh(geo, mat);
        sunGroup.add(sunMesh);

        const glowGeo = new THREE.SphereGeometry(30, 32, 32);
        const glowMat = new THREE.MeshBasicMaterial({
            color: 0xff7700,
            transparent: true,
            opacity: 0.35,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending
        });
        sunGroup.add(new THREE.Mesh(glowGeo, glowMat));

        const astraHaloGeo = new THREE.SphereGeometry(36, 32, 32);
        const astraHaloMat = new THREE.MeshBasicMaterial({
            color: 0xf472b6,
            transparent: true,
            opacity: 0.12,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending
        });
        sunGroup.add(new THREE.Mesh(astraHaloGeo, astraHaloMat));

        sunGroup.userData = { type: 'sun', name: 'Sol' };
        this.scene.add(sunGroup);
        this.planetObjects['sun'] = { group: sunGroup, mesh: sunMesh, data: { name: 'Sol' } };
    }

    createPlanet3D(data, index) {
        const group = new THREE.Group();

        const radius3D = Math.max(3.0, data.radius * 0.4);
        const orbitRadius3D = 35 + (index * 32);

        const geo = new THREE.SphereGeometry(radius3D, 36, 36);
        const mat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(data.color),
            roughness: 0.65,
            metalness: 0.15
        });
        const mesh = new THREE.Mesh(geo, mat);
        group.add(mesh);

        if (data.hasRings) {
            const ringGeo = new THREE.RingGeometry(radius3D * 1.4, radius3D * 2.6, 64);
            ringGeo.rotateX(Math.PI / 2.3);
            const ringMat = new THREE.MeshStandardMaterial({
                color: new THREE.Color(data.color).offsetHSL(0, -0.15, 0.15),
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.85
            });
            group.add(new THREE.Mesh(ringGeo, ringMat));
        }

        if (data.id === 'earth') {
            const moonGeo = new THREE.SphereGeometry(radius3D * 0.27, 16, 16);
            const moonMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.9 });
            const moon = new THREE.Mesh(moonGeo, moonMat);
            moon.position.set(radius3D * 2.4, 0, 0);
            group.add(moon);
            group.userData.moon = moon;
        }

        const orbitLine = this.createOrbitLine3D(orbitRadius3D, 0x38bdf8);
        this.scene.add(orbitLine);
        this.orbitLines.push(orbitLine);

        group.userData = {
            id: data.id,
            name: data.name,
            type: 'planet',
            data: data,
            radius3D: radius3D
        };

        this.scene.add(group);

        const hardwareGroups = [];
        (data.hardwares || []).forEach((h, hIdx) => {
            const hGroup = this.createHardware3D(h, radius3D, hIdx, data.hardwares.length);
            group.add(hGroup);
            hardwareGroups.push(hGroup);
            this.hardwareObjects[h.id] = { group: hGroup, data: h, parentPlanet: data };
        });

        const initialAngle = (index * (Math.PI * 2 / this.planetsData.length)) + Math.random();
        this.planetObjects[data.id] = {
            group: group,
            mesh: mesh,
            data: data,
            orbitRadius: orbitRadius3D,
            angle: initialAngle,
            speed: data.orbitalSpeed * 0.7,
            hardwares: hardwareGroups
        };
    }

    createHardware3D(hData, planetRadius, index, total) {
        const hGroup = new THREE.Group();

        const chassisGeo = new THREE.BoxGeometry(0.7, 0.7, 0.9);
        const chassisMat = new THREE.MeshStandardMaterial({
            color: 0xf59e0b,
            metalness: 0.85,
            roughness: 0.25
        });
        const chassis = new THREE.Mesh(chassisGeo, chassisMat);
        hGroup.add(chassis);

        const panelGeo = new THREE.BoxGeometry(1.6, 0.04, 0.6);
        const panelMat = new THREE.MeshStandardMaterial({
            color: 0x0284c7,
            metalness: 0.8,
            roughness: 0.2
        });
        const leftWing = new THREE.Mesh(panelGeo, panelMat);
        leftWing.position.x = -1.2;
        hGroup.add(leftWing);

        const rightWing = new THREE.Mesh(panelGeo, panelMat);
        rightWing.position.x = 1.2;
        hGroup.add(rightWing);

        const dishGeo = new THREE.ConeGeometry(0.4, 0.3, 16, 1, true);
        const dishMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, side: THREE.DoubleSide });
        const dish = new THREE.Mesh(dishGeo, dishMat);
        dish.rotation.x = -Math.PI / 2;
        dish.position.z = 0.6;
        hGroup.add(dish);

        const beaconGeo = new THREE.SphereGeometry(0.2, 16, 16);
        const beaconMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
        const beacon = new THREE.Mesh(beaconGeo, beaconMat);
        beacon.position.y = 0.6;
        hGroup.add(beacon);

        const dist = planetRadius * 1.8 + (index * 2.5);
        const angle = (index / total) * Math.PI * 2;
        hGroup.position.set(
            Math.cos(angle) * dist,
            Math.sin(index * 1.2) * 1.5,
            Math.sin(angle) * dist
        );

        hGroup.userData = {
            id: hData.id,
            name: hData.name,
            type: 'hardware',
            data: hData,
            orbitDist: dist,
            orbitAngle: angle,
            beaconMesh: beacon
        };

        return hGroup;
    }

    createOrbitLine3D(radius, colorHex = 0x38bdf8) {
        const points = [];
        const segments = 128;
        for (let i = 0; i <= segments; i++) {
            const theta = (i / segments) * Math.PI * 2;
            points.push(new THREE.Vector3(Math.cos(theta) * radius, 0, Math.sin(theta) * radius));
        }
        const geo = new THREE.BufferGeometry().setFromPoints(points);
        const mat = new THREE.LineBasicMaterial({
            color: colorHex,
            transparent: true,
            opacity: 0.28
        });
        return new THREE.Line(geo, mat);
    }

    createAsteroidBelt3D() {
        const count = 3500;
        const geo = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);

        const innerR = 150;
        const outerR = 185;

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = innerR + Math.random() * (outerR - innerR);
            const y = (Math.random() - 0.5) * 8.0;

            positions[i * 3] = Math.cos(angle) * dist;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = Math.sin(angle) * dist;

            const c = 0.5 + Math.random() * 0.35;
            colors[i * 3] = c;
            colors[i * 3 + 1] = c;
            colors[i * 3 + 2] = c;
        }

        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const mat = new THREE.PointsMaterial({
            size: 1.2,
            vertexColors: true,
            transparent: true,
            opacity: 0.65
        });

        this.asteroidBelt = new THREE.Points(geo, mat);
        this.scene.add(this.asteroidBelt);
    }

    setupEvents() {
        window.addEventListener('resize', () => {
            const w = window.innerWidth;
            const h = window.innerHeight;
            this.camera.aspect = w / h;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(w, h);
        });

        window.addEventListener('pointermove', (e) => {
            this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
            this.checkRaycast();
        });

        this.renderer.domElement.addEventListener('click', () => {
            if (this.hoveredHardware) {
                this.showHardwareCard(this.hoveredHardware);
            } else if (this.hoveredPlanet) {
                this.focusOnPlanet(this.hoveredPlanet);
            }
        });

        document.getElementById('btn-play-pause')?.addEventListener('click', (e) => {
            this.isPaused = !this.isPaused;
            e.target.textContent = this.isPaused ? '▶' : '⏸';
        });

        document.querySelectorAll('.sim-speed-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.sim-speed-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.timeSpeed = parseFloat(btn.getAttribute('data-speed'));
            });
        });

        document.getElementById('btn-zoom-in')?.addEventListener('click', () => {
            this.camera.position.multiplyScalar(0.8);
        });

        document.getElementById('btn-zoom-out')?.addEventListener('click', () => {
            this.camera.position.multiplyScalar(1.25);
        });

        document.getElementById('btn-reset-view')?.addEventListener('click', () => {
            this.resetView();
        });

        document.getElementById('planet-selector')?.addEventListener('change', (e) => {
            const id = e.target.value;
            if (!id) {
                this.resetView();
                return;
            }
            const planetObj = this.planetObjects[id];
            if (planetObj) {
                this.focusOnPlanet(planetObj.data);
            }
        });

        document.getElementById('btn-inspect-hardware')?.addEventListener('click', () => {
            if (this.currentHardwareData) {
                this.openInspector(this.currentHardwareData);
            }
        });

        document.getElementById('inspector-close-btn')?.addEventListener('click', () => {
            this.closeInspector();
        });
    }

    openInspector(hardwareData) {
        if (!window.inspector3D) {
            window.inspector3D = new HardwareInspector3D();
        }
        window.inspector3D.show(hardwareData);
    }

    closeInspector() {
        if (window.inspector3D) {
            window.inspector3D.hide();
        }
    }

    checkRaycast() {
        this.raycaster.setFromCamera(this.mouse, this.camera);

        const interactables = [];
        this.scene.traverse(obj => {
            if (obj.userData && (obj.userData.type === 'planet' || obj.userData.type === 'hardware')) {
                interactables.push(obj);
            }
        });

        const hits = this.raycaster.intersectObjects(interactables, true);

        let hitHardware = null;
        let hitPlanet = null;

        if (hits.length > 0) {
            let hit = hits[0].object;
            while (hit.parent && (!hit.userData || !hit.userData.type)) {
                hit = hit.parent;
            }

            if (hit.userData) {
                if (hit.userData.type === 'hardware') {
                    hitHardware = hit.userData.data;
                } else if (hit.userData.type === 'planet') {
                    hitPlanet = hit.userData.data;
                }
            }
        }

        if (hitHardware !== this.hoveredHardware) {
            this.hoveredHardware = hitHardware;
            if (this.hoveredHardware) {
                this.showHardwareCard(this.hoveredHardware);
            } else {
                this.hideHardwareCard();
            }
        }

        if (hitPlanet !== this.hoveredPlanet) {
            this.hoveredPlanet = hitPlanet;
            if (this.hoveredPlanet) {
                this.showPlanetCard(this.hoveredPlanet);
            } else if (!this.focusedTarget) {
                this.hidePlanetCard();
            }
        }

        this.renderer.domElement.style.cursor = (hitHardware || hitPlanet) ? 'pointer' : 'default';
    }

    focusOnPlanet(planetData) {
        const obj = this.planetObjects[planetData.id];
        if (!obj) return;

        this.focusedTarget = obj.group;
        const pos = new THREE.Vector3();
        obj.group.getWorldPosition(pos);

        const dist = obj.userData?.radius3D ? obj.userData.radius3D * 5.0 + 8 : 22;
        this.targetCamPosition = new THREE.Vector3(pos.x + dist * 0.7, pos.y + dist * 0.5, pos.z + dist * 0.7);
        this.targetControlsTarget = pos.clone();

        this.showPlanetCard(planetData);
    }

    resetView() {
        this.focusedTarget = null;
        this.targetCamPosition = new THREE.Vector3(0, 240, 480);
        this.targetControlsTarget = new THREE.Vector3(0, 0, 0);
        this.hidePlanetCard();
        this.hideHardwareCard();
        const sel = document.getElementById('planet-selector');
        if (sel) sel.value = '';
    }

    showPlanetCard(planet) {
        if (!this.planetCard) return;
        document.getElementById('planet-card-title').textContent = planet.name;
        document.getElementById('planet-card-desc').textContent = planet.description;
        document.getElementById('planet-hardware-count').textContent = `${(planet.hardwares || []).length} artefactos detectados`;

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
        if (this.planetCard && !this.focusedTarget) {
            this.planetCard.style.display = 'none';
        }
    }

    showHardwareCard(hardware) {
        if (!this.hardwareCard) return;
        this.currentHardwareData = hardware;
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

    animate() {
        requestAnimationFrame(() => this.animate());

        const delta = 0.016;
        if (!this.isPaused) {
            const timeStep = delta * this.timeSpeed;
            this.simTime += timeStep;

            Object.keys(this.planetObjects).forEach(id => {
                if (id === 'sun') {
                    this.planetObjects['sun'].mesh.rotation.y += 0.002;
                    return;
                }
                const p = this.planetObjects[id];
                p.angle += p.speed * timeStep * 0.5;
                p.group.position.x = Math.cos(p.angle) * p.orbitRadius;
                p.group.position.z = Math.sin(p.angle) * p.orbitRadius;
                p.mesh.rotation.y += 0.01;

                p.hardwares.forEach((hGroup, hIdx) => {
                    const uData = hGroup.userData;
                    const hAngle = uData.orbitAngle + (this.simTime * 0.3 * (hIdx % 2 === 0 ? 1 : -1));
                    hGroup.position.x = Math.cos(hAngle) * uData.orbitDist;
                    hGroup.position.z = Math.sin(hAngle) * uData.orbitDist;
                    hGroup.rotation.y += 0.02;

                    if (uData.beaconMesh) {
                        const blink = Math.sin(this.simTime * 5 + hIdx);
                        uData.beaconMesh.material.opacity = blink > 0 ? 1.0 : 0.25;
                    }
                });
            });

            if (this.asteroidBelt) {
                this.asteroidBelt.rotation.y += 0.0004 * this.timeSpeed;
            }
        }

        if (this.focusedTarget) {
            const targetPos = new THREE.Vector3();
            this.focusedTarget.getWorldPosition(targetPos);
            this.controls.target.lerp(targetPos, 0.08);

            if (this.targetCamPosition) {
                this.camera.position.lerp(this.targetCamPosition, 0.05);
                if (this.camera.position.distanceTo(this.targetCamPosition) < 0.5) {
                    this.targetCamPosition = null;
                }
            }
        } else if (this.targetCamPosition && this.targetControlsTarget) {
            this.camera.position.lerp(this.targetCamPosition, 0.05);
            this.controls.target.lerp(this.targetControlsTarget, 0.05);
            if (this.camera.position.distanceTo(this.targetCamPosition) < 0.5) {
                this.targetCamPosition = null;
                this.targetControlsTarget = null;
            }
        }

        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}

class HardwareInspector3D {
    constructor() {
        this.modal = document.getElementById('inspector-modal');
        this.viewport = document.getElementById('inspector-3d-viewport');
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.currentMesh = null;
        this.hotspots = [];
        this.isInitialized = false;
        this.animId = null;
    }

    init() {
        if (this.isInitialized) return;

        const w = this.viewport.clientWidth || 600;
        const h = this.viewport.clientHeight || 500;

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 100);
        this.camera.position.set(5, 3.5, 6);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(w, h);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.25;
        this.viewport.appendChild(this.renderer.domElement);

        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.autoRotate = true;
        this.controls.autoRotateSpeed = 1.2;
        this.controls.maxDistance = 14;
        this.controls.minDistance = 2.5;

        const amb = new THREE.AmbientLight(0xffffff, 1.2);
        this.scene.add(amb);

        const keyLight = new THREE.DirectionalLight(0xfff5e6, 2.5);
        keyLight.position.set(5, 8, 5);
        this.scene.add(keyLight);

        const rimLight = new THREE.DirectionalLight(0x38bdf8, 2.0);
        rimLight.position.set(-5, -3, -5);
        this.scene.add(rimLight);

        const pinkRim = new THREE.PointLight(0xf472b6, 1.8, 15);
        pinkRim.position.set(0, -4, 4);
        this.scene.add(pinkRim);

        window.addEventListener('resize', () => this.onResize());
        this.isInitialized = true;
    }

    onResize() {
        if (!this.renderer || !this.viewport) return;
        const w = this.viewport.clientWidth;
        const h = this.viewport.clientHeight;
        if (w === 0 || h === 0) return;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
    }

    show(hardwareData) {
        this.init();
        this.modal.style.display = 'flex';
        this.onResize();

        document.getElementById('inspector-ship-name').textContent = hardwareData.name;
        document.getElementById('inspector-ship-type').textContent = `${hardwareData.type} · ${hardwareData.year}`;
        document.getElementById('spec-mass').textContent = hardwareData.mass || 'Variable (~850 kg)';
        document.getElementById('spec-power').textContent = hardwareData.power || 'Generador RTG / Paneles Solares';
        document.getElementById('spec-status').textContent = hardwareData.status;

        if (this.currentMesh) {
            this.scene.remove(this.currentMesh);
            this.currentMesh = null;
        }

        this.currentMesh = this.buildDetailedShip(hardwareData);
        this.scene.add(this.currentMesh);

        this.renderComponentsList(hardwareData.components || []);

        this.camera.position.set(5, 3.5, 6);
        this.controls.target.set(0, 0, 0);
        this.controls.autoRotate = true;

        if (!this.animId) {
            this.animate();
        }
    }

    hide() {
        this.modal.style.display = 'none';
        if (this.animId) {
            cancelAnimationFrame(this.animId);
            this.animId = null;
        }
    }

    buildDetailedShip(data) {
        const root = new THREE.Group();
        const iconType = data.icon || 'probe';

        const goldFoilMat = new THREE.MeshStandardMaterial({
            color: 0xf59e0b,
            metalness: 0.9,
            roughness: 0.25
        });
        const whiteDishMat = new THREE.MeshStandardMaterial({
            color: 0xf8fafc,
            metalness: 0.2,
            roughness: 0.4,
            side: THREE.DoubleSide
        });
        const darkMetalMat = new THREE.MeshStandardMaterial({
            color: 0x1e293b,
            metalness: 0.8,
            roughness: 0.3
        });
        const solarBlueMat = new THREE.MeshStandardMaterial({
            color: 0x0284c7,
            metalness: 0.7,
            roughness: 0.2
        });

        if (iconType === 'dish') {

            const dishGeo = new THREE.SphereGeometry(2.4, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.42);
            const dish = new THREE.Mesh(dishGeo, whiteDishMat);
            dish.rotation.x = Math.PI / 2;
            dish.position.y = 0.6;
            root.add(dish);

            const subGeo = new THREE.ConeGeometry(0.35, 0.4, 16);
            const sub = new THREE.Mesh(subGeo, darkMetalMat);
            sub.position.set(0, 0.6, 1.4);
            sub.rotation.x = -Math.PI / 2;
            root.add(sub);

            for (let i = 0; i < 3; i++) {
                const ang = (i / 3) * Math.PI * 2;
                const strutGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.8, 8);
                const strut = new THREE.Mesh(strutGeo, darkMetalMat);
                strut.position.set(Math.cos(ang) * 0.7, 0.6, 0.7);
                strut.rotation.x = Math.PI / 4;
                strut.rotation.y = ang;
                root.add(strut);
            }

            const busGeo = new THREE.CylinderGeometry(0.9, 0.9, 0.8, 6);
            const bus = new THREE.Mesh(busGeo, goldFoilMat);
            bus.position.y = -0.1;
            root.add(bus);

            const boomGeo = new THREE.CylinderGeometry(0.06, 0.06, 3.2, 8);
            const rtgBoom1 = new THREE.Mesh(boomGeo, darkMetalMat);
            rtgBoom1.rotation.z = Math.PI / 3;
            rtgBoom1.position.set(-1.4, -0.3, 0);
            root.add(rtgBoom1);

            const rtgCanGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.8, 12);
            const rtgCan = new THREE.Mesh(rtgCanGeo, darkMetalMat);
            rtgCan.position.set(-2.8, 0.5, 0);
            root.add(rtgCan);

            const magBoom = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 3.8, 8), darkMetalMat);
            magBoom.rotation.z = -Math.PI / 3;
            magBoom.position.set(1.6, -0.4, 0);
            root.add(magBoom);

            const magSensor = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), goldFoilMat);
            magSensor.position.set(3.2, 0.5, 0);
            root.add(magSensor);

            if (data.id.includes('pioneer')) {
                const plaque = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.04), new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.95, roughness: 0.1 }));
                plaque.position.set(0, -0.55, 0.9);
                root.add(plaque);
            }

        } else if (iconType === 'rover') {

            const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 2.0), goldFoilMat);
            chassis.position.y = 0.5;
            root.add(chassis);

            const solarDeck = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.06, 2.6), solarBlueMat);
            solarDeck.position.y = 0.85;
            root.add(solarDeck);

            const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.8, 8), darkMetalMat);
            mast.position.set(0.6, 1.7, 0.8);
            root.add(mast);

            const camHead = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.25, 0.3), darkMetalMat);
            camHead.position.set(0.6, 2.6, 0.8);
            root.add(camHead);

            for (let side of [-1, 1]) {
                for (let zPos of [-0.9, 0, 0.9]) {
                    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.2, 16), darkMetalMat);
                    wheel.rotation.z = Math.PI / 2;
                    wheel.position.set(side * 1.5, 0, zPos);
                    root.add(wheel);

                    const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 8), darkMetalMat);
                    axle.position.set(side * 1.2, 0.2, zPos);
                    axle.rotation.z = side * 0.4;
                    root.add(axle);
                }
            }

            const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.2, 8), darkMetalMat);
            arm.position.set(0, 0.3, 1.4);
            arm.rotation.x = Math.PI / 3;
            root.add(arm);

        } else {

            const body = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.0, 1.6), goldFoilMat);
            root.add(body);

            for (let side of [-1, 1]) {
                const wing = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.2, 0.08), solarBlueMat);
                wing.position.set(side * 3.2, 0, 0);
                root.add(wing);

                const yoke = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.6, 8), darkMetalMat);
                yoke.rotation.z = Math.PI / 2;
                yoke.position.set(side * 1.6, 0, 0);
                root.add(yoke);
            }

            const dish = new THREE.Mesh(new THREE.SphereGeometry(1.2, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.4), whiteDishMat);
            dish.rotation.x = -Math.PI / 2;
            dish.position.set(0, 1.5, 0);
            root.add(dish);

            const thruster = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.6, 16), darkMetalMat);
            thruster.position.y = -1.3;
            root.add(thruster);

            if (data.id.includes('galileo')) {
                const probe = new THREE.Mesh(new THREE.ConeGeometry(0.8, 0.8, 20), new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.8 }));
                probe.position.set(0, -1.0, 1.0);
                probe.rotation.x = Math.PI / 4;
                root.add(probe);
            }
        }

        return root;
    }

    renderComponentsList(components) {
        const list = document.getElementById('inspector-components-list');
        if (!list) return;

        if (components.length === 0) {
            list.innerHTML = `
                <div class="component-card">
                    <span class="component-title">Sistema de Telecomunicaciones de Espacio Profundo</span>
                    <p class="component-desc">Enlace en banda de radiofrecuencia hacia las estaciones terrestres de la NASA (Goldstone, Madrid, Canberra).</p>
                </div>
                <div class="component-card">
                    <span class="component-title">Módulo de Control de Actitud & Propulsión</span>
                    <p class="component-desc">Toberas de hidracina para orientación fina y mantenimiento de trayectoria orbital.</p>
                </div>
            `;
            return;
        }

        list.innerHTML = components.map((comp, i) => `
            <div class="component-card" data-idx="${i}">
                <span class="component-num">${i + 1}</span>
                <span class="component-title">${comp.name}</span>
                <p class="component-desc">${comp.desc}</p>
            </div>
        `).join('');

        list.querySelectorAll('.component-card').forEach(card => {
            card.addEventListener('click', () => {
                list.querySelectorAll('.component-card').forEach(c => c.classList.remove('highlighted'));
                card.classList.add('highlighted');
                
                this.controls.autoRotate = false;
            });
        });
    }

    animate() {
        this.animId = requestAnimationFrame(() => this.animate());
        if (this.controls) this.controls.update();
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.newAstraApp = new NewAstra3D();
});
