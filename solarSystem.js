/**
 * NASA Lost Signals - Solar System 3D Engine
 * Renderizado tridimensional con Three.js de planetas, órbitas, asteroides y luces.
 */

class SolarSystem3D {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        // Cuerpos celestes y grupos
        this.bodies = {};
        this.orbitLines = [];
        this.asteroidBelt = null;
        this.kuiperBelt = null;
        this.labels = [];

        // Parámetros de simulación
        this.timeSpeed = 1.0;
        this.simTime = 0;
        this.isPaused = false;
        this.focusedTarget = null;
        this.targetCamPosition = null;

        // Opciones de visualización
        this.showOrbits = true;
        this.showLabels = true;
        this.showAsteroids = true;

        this.init();
    }

    init() {
        const width = this.container.clientWidth || window.innerWidth;
        const height = this.container.clientHeight || window.innerHeight;

        // 1. Escena
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x05070d, 0.0008);

        // 2. Cámara
        this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 5000);
        this.camera.position.set(0, 120, 220);

        // 3. Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.1;
        this.container.appendChild(this.renderer.domElement);

        // 4. Controles orbitales
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxDistance = 1500;
        this.controls.minDistance = 2.0;

        // 5. Luces
        this.setupLights();

        // 6. Fondo de estrellas
        this.createStarfield();

        // 7. Event listeners
        window.addEventListener('resize', () => this.onWindowResize());
        this.renderer.domElement.addEventListener('pointerdown', (e) => this.onPointerDown(e));

        // Iniciar loop de renderizado
        this.animate();
    }

    setupLights() {
        // Luz ambiental sutil (azul cósmico)
        const ambientLight = new THREE.AmbientLight(0x1a2639, 1.2);
        this.scene.add(ambientLight);

        // Luz solar central omnidireccional
        const sunLight = new THREE.PointLight(0xfffbe8, 2.5, 3000, 0.4);
        sunLight.position.set(0, 0, 0);
        this.scene.add(sunLight);
    }

    createStarfield() {
        const starGeo = new THREE.BufferGeometry();
        const starCount = 6000;
        const positions = new Float32Array(starCount * 3);
        const colors = new Float32Array(starCount * 3);

        for (let i = 0; i < starCount; i++) {
            const r = 1800 + Math.random() * 800;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(Math.random() * 2 - 1);

            positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = r * Math.cos(phi);

            // Variedad sutil de tonalidades de estrellas
            const tone = Math.random();
            if (tone > 0.8) {
                // Azuladas
                colors[i * 3] = 0.8; colors[i * 3 + 1] = 0.9; colors[i * 3 + 2] = 1.0;
            } else if (tone > 0.6) {
                // Amarillentas / Rojizas
                colors[i * 3] = 1.0; colors[i * 3 + 1] = 0.85; colors[i * 3 + 2] = 0.7;
            } else {
                // Blancas
                colors[i * 3] = 0.95; colors[i * 3 + 1] = 0.95; colors[i * 3 + 2] = 0.95;
            }
        }

        starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        starGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const starMat = new THREE.PointsMaterial({
            size: 1.8,
            vertexColors: true,
            transparent: true,
            opacity: 0.85
        });

        const starField = new THREE.Points(starGeo, starMat);
        this.scene.add(starField);
    }

    /**
     * Carga y genera los planetas y cuerpos mayores desde la API
     */
    buildSolarSystem(bodiesData) {
        bodiesData.forEach(body => {
            if (body.id === 'sun') {
                this.createSun(body);
            } else {
                this.createPlanet(body);
            }
        });

        // Cinturón de asteroides (entre Marte y Ceres/Júpiter)
        this.createAsteroidBelt();
    }

    createSun(data) {
        const sunGroup = new THREE.Group();

        // Esfera principal
        const sunGeo = new THREE.SphereGeometry(data.radius, 48, 48);
        const sunMat = new THREE.MeshBasicMaterial({
            color: new THREE.Color(data.color),
        });
        const sunMesh = new THREE.Mesh(sunGeo, sunMat);
        sunGroup.add(sunMesh);

        // Corona solar (capa exterior brillante con mezcla aditiva)
        const glowGeo = new THREE.SphereGeometry(data.radius * 1.35, 32, 32);
        const glowMat = new THREE.MeshBasicMaterial({
            color: new THREE.Color(data.emissive),
            transparent: true,
            opacity: 0.35,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending
        });
        const glowMesh = new THREE.Mesh(glowGeo, glowMat);
        sunGroup.add(glowMesh);

        // Halo exterior
        const haloGeo = new THREE.SphereGeometry(data.radius * 1.8, 32, 32);
        const haloMat = new THREE.MeshBasicMaterial({
            color: 0xff6600,
            transparent: true,
            opacity: 0.15,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending
        });
        sunGroup.add(new THREE.Mesh(haloGeo, haloMat));

        sunGroup.userData = { id: data.id, name: data.name, type: 'sun', data: data };
        this.scene.add(sunGroup);
        this.bodies[data.id] = { group: sunGroup, mesh: sunMesh, data: data, angle: 0 };
    }

    createPlanet(data) {
        const planetGroup = new THREE.Group();

        // Superficie del planeta
        const geo = new THREE.SphereGeometry(data.radius, 32, 32);
        const mat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(data.color),
            roughness: 0.7,
            metalness: 0.1
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        planetGroup.add(mesh);

        // Atmósfera opcional
        if (data.atmosphereColor) {
            const atmosGeo = new THREE.SphereGeometry(data.radius * 1.08, 32, 32);
            const atmosMat = new THREE.MeshBasicMaterial({
                color: new THREE.Color(data.atmosphereColor),
                transparent: true,
                opacity: 0.25,
                blending: THREE.AdditiveBlending,
                side: THREE.BackSide
            });
            planetGroup.add(new THREE.Mesh(atmosGeo, atmosMat));
        }

        // Anillos para Saturno o Urano
        if (data.hasRings) {
            const innerR = data.radius * 1.4;
            const outerR = data.radius * 2.5;
            const ringGeo = new THREE.RingGeometry(innerR, outerR, 64);
            // Rotar plano del anillo horizontal
            ringGeo.rotateX(Math.PI / 2);
            const ringMat = new THREE.MeshStandardMaterial({
                color: new THREE.Color(data.color).offsetHSL(0, -0.2, 0.1),
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.8
            });
            const ringMesh = new THREE.Mesh(ringGeo, ringMat);
            planetGroup.add(ringMesh);
        }

        // Si es la Tierra, añadir la Luna en órbita
        if (data.id === 'earth') {
            const moonGeo = new THREE.SphereGeometry(0.27, 16, 16);
            const moonMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.9 });
            const moonMesh = new THREE.Mesh(moonGeo, moonMat);
            moonMesh.position.set(2.2, 0, 0);
            planetGroup.add(moonMesh);
            planetGroup.userData.moon = moonMesh;
        }

        // Trazar línea de órbita elíptica
        const orbitLine = this.createOrbitLine(data.orbitRadius, 0.02, 0x3a6080);
        this.scene.add(orbitLine);
        this.orbitLines.push(orbitLine);

        planetGroup.userData = { id: data.id, name: data.name, type: 'planet', data: data };
        this.scene.add(planetGroup);

        // Guardar referencia para animación
        const initialAngle = Math.random() * Math.PI * 2;
        this.bodies[data.id] = {
            group: planetGroup,
            mesh: mesh,
            data: data,
            angle: initialAngle,
            radius: data.orbitRadius,
            speed: (2 * Math.PI) / (data.orbitalPeriodDays * 0.1 + 50)
        };
    }

    createOrbitLine(radius, eccentricity = 0, colorHex = 0x234567) {
        const points = [];
        const segments = 128;
        const b = radius * Math.sqrt(1 - eccentricity * eccentricity); // Semieje menor

        for (let i = 0; i <= segments; i++) {
            const theta = (i / segments) * Math.PI * 2;
            const x = radius * Math.cos(theta);
            const z = b * Math.sin(theta);
            points.push(new THREE.Vector3(x, 0, z));
        }

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
            color: colorHex,
            transparent: true,
            opacity: 0.35,
            linewidth: 1
        });

        return new THREE.Line(geometry, material);
    }

    createAsteroidBelt() {
        const asteroidCount = 3000;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(asteroidCount * 3);
        const colors = new Float32Array(asteroidCount * 3);

        const innerRadius = 33.0; // Pasando Marte
        const outerRadius = 45.0; // Antes de Júpiter

        for (let i = 0; i < asteroidCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = innerRadius + Math.random() * (outerRadius - innerRadius);
            const ySpread = (Math.random() - 0.5) * 3.5;

            positions[i * 3] = dist * Math.cos(angle);
            positions[i * 3 + 1] = ySpread;
            positions[i * 3 + 2] = dist * Math.sin(angle);

            // Colores pétreos / grisáceos
            const c = 0.5 + Math.random() * 0.3;
            colors[i * 3] = c;
            colors[i * 3 + 1] = c;
            colors[i * 3 + 2] = c;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: 0.9,
            vertexColors: true,
            transparent: true,
            opacity: 0.65
        });

        this.asteroidBelt = new THREE.Points(geometry, material);
        this.scene.add(this.asteroidBelt);
    }

    /**
     * Enfocar cámara hacia un objetivo (planeta o satélite)
     */
    focusOn(targetMeshOrGroup, offsetDistance = null) {
        if (!targetMeshOrGroup) {
            this.resetCamera();
            return;
        }

        this.focusedTarget = targetMeshOrGroup;
        const targetPos = new THREE.Vector3();
        targetMeshOrGroup.getWorldPosition(targetPos);

        const dist = offsetDistance || (targetMeshOrGroup.userData?.data?.radius ? targetMeshOrGroup.userData.data.radius * 6 + 4 : 8);
        this.targetCamPosition = new THREE.Vector3(
            targetPos.x + dist * 0.7,
            targetPos.y + dist * 0.5,
            targetPos.z + dist * 0.7
        );
    }

    resetCamera() {
        this.focusedTarget = null;
        this.targetCamPosition = new THREE.Vector3(0, 120, 220);
        this.controls.target.set(0, 0, 0);
    }

    onPointerDown(event) {
        // Ignorar clics sobre elementos del HUD
        if (event.target !== this.renderer.domElement) return;

        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // Comprobar colisiones con objetos interactivos
        const intersectable = [];
        this.scene.traverse(child => {
            if (child.userData && (child.userData.type === 'satellite' || child.userData.type === 'planet')) {
                intersectable.push(child);
            }
        });

        const intersects = this.raycaster.intersectObjects(intersectable, true);
        if (intersects.length > 0) {
            let hit = intersects[0].object;
            while (hit.parent && (!hit.userData || !hit.userData.id)) {
                hit = hit.parent;
            }
            if (hit.userData && hit.userData.id) {
                // Notificar selección
                window.dispatchEvent(new CustomEvent('spaceObjectClicked', { detail: hit.userData }));
            }
        }
    }

    onWindowResize() {
        const width = this.container.clientWidth || window.innerWidth;
        const height = this.container.clientHeight || window.innerHeight;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const delta = 0.016; // ~60fps step
        if (!this.isPaused) {
            const timeStep = delta * this.timeSpeed;
            this.simTime += timeStep;

            // Mover planetas en sus órbitas
            Object.keys(this.bodies).forEach(id => {
                const body = this.bodies[id];
                if (id !== 'sun') {
                    body.angle += body.speed * timeStep * 0.4;
                    body.group.position.x = body.radius * Math.cos(body.angle);
                    body.group.position.z = body.radius * Math.sin(body.angle);
                    // Rotación axial
                    body.mesh.rotation.y += 0.01;
                } else {
                    body.mesh.rotation.y += 0.002;
                }
            });

            // Rotación suave del cinturón de asteroides
            if (this.asteroidBelt) {
                this.asteroidBelt.rotation.y += 0.0003 * this.timeSpeed;
            }
        }

        // Suave seguimiento de cámara al enfocar objetivo
        if (this.focusedTarget) {
            const targetPos = new THREE.Vector3();
            this.focusedTarget.getWorldPosition(targetPos);
            
            // Interpolar punto de mira (lookAt) de OrbitControls
            this.controls.target.lerp(targetPos, 0.08);

            if (this.targetCamPosition) {
                this.camera.position.lerp(this.targetCamPosition, 0.05);
                if (this.camera.position.distanceTo(this.targetCamPosition) < 0.2) {
                    this.targetCamPosition = null; // Llegó al objetivo
                }
            }
        } else if (this.targetCamPosition) {
            this.camera.position.lerp(this.targetCamPosition, 0.05);
            this.controls.target.lerp(new THREE.Vector3(0, 0, 0), 0.05);
            if (this.camera.position.distanceTo(this.targetCamPosition) < 0.2) {
                this.targetCamPosition = null;
            }
        }

        this.controls.update();
        this.renderer.render(this.scene, this.camera);

        // Actualizar radar 2D
        this.updateRadar();
    }

    updateRadar() {
        const radarCanvas = document.getElementById('radar-canvas');
        if (!radarCanvas) return;
        const ctx = radarCanvas.getContext('2d');
        const w = radarCanvas.width;
        const h = radarCanvas.height;
        const cx = w / 2;
        const cy = h / 2;

        ctx.clearRect(0, 0, w, h);

        // Círculos de rango
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.2)';
        ctx.lineWidth = 1;
        [25, 50, 75].forEach(r => {
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.stroke();
        });

        // Sol en el centro
        ctx.fillStyle = '#ffb703';
        ctx.beginPath();
        ctx.arc(cx, cy, 3, 0, Math.PI * 2);
        ctx.fill();

        // Escala para radar (máximo radio ~120 unidades mapeadas a 80px)
        const scale = 75 / 120;

        // Planetas
        Object.keys(this.bodies).forEach(id => {
            if (id === 'sun') return;
            const body = this.bodies[id];
            const px = cx + body.group.position.x * scale;
            const py = cy + body.group.position.z * scale;

            ctx.fillStyle = body.data.color || '#00e5ff';
            ctx.beginPath();
            ctx.arc(px, py, 2, 0, Math.PI * 2);
            ctx.fill();
        });

        // Satélites
        if (window.satellitesMgr && window.satellitesMgr.satelliteObjects) {
            Object.values(window.satellitesMgr.satelliteObjects).forEach(satObj => {
                const pos = new THREE.Vector3();
                satObj.group.getWorldPosition(pos);
                const px = cx + pos.x * scale;
                const py = cy + pos.z * scale;

                ctx.fillStyle = satObj.data.statusType === 'recovered' ? '#00f59b' : '#ff3366';
                ctx.beginPath();
                ctx.arc(px, py, 2.2, 0, Math.PI * 2);
                ctx.fill();
            });
        }
    }

    setOrbitsVisible(visible) {
        this.showOrbits = visible;
        this.orbitLines.forEach(line => line.visible = visible);
        if (window.satellitesMgr) {
            window.satellitesMgr.setOrbitsVisible(visible);
        }
    }

    setAsteroidsVisible(visible) {
        this.showAsteroids = visible;
        if (this.asteroidBelt) {
            this.asteroidBelt.visible = visible;
        }
    }
}
