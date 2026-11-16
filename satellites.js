/**
 * NASA Lost Signals - Satellites & Spacecraft 3D Models
 * Creación procedimental de sondas, satélites y trayectorias orbitales de la NASA.
 */

class SatellitesManager {
    constructor(solarSystem) {
        this.solarSystem = solarSystem;
        this.scene = solarSystem.scene;
        this.satelliteObjects = {};
        this.satelliteData = [];
        this.orbitLines = [];
        this.showOrbits = true;
    }

    loadSatellites(satellitesData) {
        this.satelliteData = satellitesData;
        satellitesData.forEach(sat => {
            this.createSatellite(sat);
        });
    }

    /**
     * Construye el modelo 3D detallado de la nave según su tipo histórico
     */
    createSatellite(data) {
        const satGroup = new THREE.Group();

        // 1. Chasis central
        const chassisGeo = new THREE.BoxGeometry(0.8, 0.6, 0.8);
        const isRecovered = data.statusType === 'recovered';
        const chassisMat = new THREE.MeshStandardMaterial({
            color: isRecovered ? 0x2ec4b6 : 0xd4af37, // Dorado de aislamiento térmico de NASA (Kapton/MLI)
            metalness: 0.8,
            roughness: 0.3
        });
        const chassis = new THREE.Mesh(chassisGeo, chassisMat);
        satGroup.add(chassis);

        // 2. Paneles solares o Generador RTG según la nave
        if (data.id === 'pioneer10' || data.id === 'pioneer11') {
            // Pioneer: Gran antena parabólica de 2.74m y mástiles RTG
            const dishGeo = new THREE.SphereGeometry(1.2, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.45);
            const dishMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.5, roughness: 0.4, side: THREE.DoubleSide });
            const dish = new THREE.Mesh(dishGeo, dishMat);
            dish.rotation.x = Math.PI / 2;
            dish.position.z = 0.5;
            satGroup.add(dish);

            // Brazo RTG
            const rtgGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.2, 8);
            const rtgMat = new THREE.MeshStandardMaterial({ color: 0x444444 });
            const rtg = new THREE.Mesh(rtgGeo, rtgMat);
            rtg.rotation.z = Math.PI / 3;
            satGroup.add(rtg);

        } else if (data.id === 'kepler') {
            // Kepler: Tubo de telescopio astronómico
            const scopeGeo = new THREE.CylinderGeometry(0.5, 0.6, 1.6, 16);
            const scopeMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.9, roughness: 0.2 });
            const scope = new THREE.Mesh(scopeGeo, scopeMat);
            scope.rotation.x = Math.PI / 3;
            satGroup.add(scope);

            // Paneles solares fijos en la espalda
            const panelGeo = new THREE.BoxGeometry(1.6, 0.05, 1.2);
            const panelMat = new THREE.MeshStandardMaterial({ color: 0x113366, metalness: 0.8, roughness: 0.2 });
            const panel = new THREE.Mesh(panelGeo, panelMat);
            panel.position.y = -0.4;
            satGroup.add(panel);

        } else {
            // Satélites con alas de paneles solares (IMAGE, Dawn, STEREO-B, SOHO)
            const panelGeo = new THREE.BoxGeometry(1.8, 0.04, 0.6);
            const panelMat = new THREE.MeshStandardMaterial({ color: 0x0d3b66, metalness: 0.7, roughness: 0.3 });
            
            // Ala izquierda
            const leftPanel = new THREE.Mesh(panelGeo, panelMat);
            leftPanel.position.x = -1.4;
            satGroup.add(leftPanel);

            // Ala derecha
            const rightPanel = new THREE.Mesh(panelGeo, panelMat);
            rightPanel.position.x = 1.4;
            satGroup.add(rightPanel);

            // Pequeña antena de alta ganancia
            const dishGeo = new THREE.ConeGeometry(0.4, 0.4, 16, 1, true);
            const dishMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, side: THREE.DoubleSide });
            const dish = new THREE.Mesh(dishGeo, dishMat);
            dish.rotation.x = -Math.PI / 2;
            dish.position.z = 0.5;
            satGroup.add(dish);
        }

        // 3. Luz baliza / Beacon LED (rojo intermitente para perdido, verde para recuperado)
        const beaconGeo = new THREE.SphereGeometry(0.25, 16, 16);
        const beaconColor = isRecovered ? 0x00f59b : 0xff3366;
        const beaconMat = new THREE.MeshBasicMaterial({ color: beaconColor });
        const beacon = new THREE.Mesh(beaconGeo, beaconMat);
        beacon.position.y = 0.6;
        satGroup.add(beacon);

        // 4. Etiqueta Sprite flotante 3D
        const labelSprite = this.createLabelSprite(data.name, isRecovered ? '#00f59b' : '#ff7597');
        labelSprite.position.y = 2.0;
        satGroup.add(labelSprite);

        // 5. Configurar órbita y trayectoria
        this.setupSatelliteOrbit(data, satGroup);

        satGroup.userData = {
            id: data.id,
            name: data.name,
            type: 'satellite',
            beaconMesh: beacon,
            labelSprite: labelSprite,
            data: data
        };

        this.scene.add(satGroup);
        this.satelliteObjects[data.id] = {
            group: satGroup,
            beacon: beacon,
            data: data,
            angle: Math.random() * Math.PI * 2,
            orbitConfig: data.orbit
        };
    }

    createLabelSprite(text, colorHex) {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');

        // Fondo semi-transparente
        ctx.fillStyle = 'rgba(5, 10, 20, 0.75)';
        ctx.strokeStyle = colorHex;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(10, 10, 236, 44, 8);
        ctx.fill();
        ctx.stroke();

        // Texto
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px "Share Tech Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 128, 32);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.scale.set(4, 1, 1);
        return sprite;
    }

    setupSatelliteOrbit(data, satGroup) {
        const orbit = data.orbit;
        const isRecovered = data.statusType === 'recovered';
        const orbitColor = isRecovered ? 0x00f59b : 0xff5577;

        if (orbit.parent === 'Earth') {
            // Orbita alrededor de la Tierra (IMAGE, Lunar Prospector)
            // Se sincroniza en tiempo real siguiendo a la Tierra
            const orbitLine = this.solarSystem.createOrbitLine(orbit.semiMajorAxis, orbit.eccentricity, orbitColor);
            orbitLine.visible = this.showOrbits;
            this.scene.add(orbitLine);
            this.orbitLines.push(orbitLine);
            satGroup.userData.orbitLine = orbitLine;

        } else {
            // Órbita heliocéntrica o hiperbólica (Pioneers, Kepler, STEREO, Dawn, etc.)
            let radius = orbit.semiMajorAxis;
            // Para Pioneers fuera del sistema, fijar radio visible en la simulación
            if (radius > 130) radius = 125.0;

            const orbitLine = this.solarSystem.createOrbitLine(radius, orbit.eccentricity, orbitColor);
            orbitLine.visible = this.showOrbits;
            this.scene.add(orbitLine);
            this.orbitLines.push(orbitLine);
            satGroup.userData.orbitLine = orbitLine;
        }
    }

    update(timeStep) {
        const earthBody = this.solarSystem.bodies['earth'];
        const ceresBody = this.solarSystem.bodies['ceres'];
        const marsBody = this.solarSystem.bodies['mars'];

        Object.keys(this.satelliteObjects).forEach(id => {
            const sat = this.satelliteObjects[id];
            const data = sat.data;
            const orbit = sat.orbitConfig;

            // Actualizar rotación y baliza parpadeante
            sat.group.rotation.y += 0.015;
            const blink = Math.sin(Date.now() * 0.005);
            sat.beacon.material.opacity = blink > 0.1 ? 1.0 : 0.2;

            if (orbit.parent === 'Earth' && earthBody) {
                // Posicionar relativo a la Tierra
                sat.angle += orbit.speed * timeStep * 4.0;
                const r = orbit.semiMajorAxis;
                const localX = r * Math.cos(sat.angle);
                const localZ = r * Math.sin(sat.angle);

                sat.group.position.x = earthBody.group.position.x + localX;
                sat.group.position.z = earthBody.group.position.z + localZ;
                sat.group.position.y = earthBody.group.position.y + Math.sin(sat.angle) * 1.5;

                // Mover línea de órbita con la Tierra
                if (sat.group.userData.orbitLine) {
                    sat.group.userData.orbitLine.position.copy(earthBody.group.position);
                }

            } else if (data.id === 'dawn' && ceresBody) {
                // Dawn orbita Ceres permanentemente
                sat.angle += orbit.speed * timeStep * 3.0;
                const r = 2.0;
                sat.group.position.x = ceresBody.group.position.x + r * Math.cos(sat.angle);
                sat.group.position.z = ceresBody.group.position.z + r * Math.sin(sat.angle);
                sat.group.position.y = ceresBody.group.position.y + Math.sin(sat.angle) * 0.5;

                if (sat.group.userData.orbitLine) {
                    sat.group.userData.orbitLine.position.copy(ceresBody.group.position);
                }

            } else if (data.id === 'mars_polar_lander' && marsBody) {
                // Descansa en el polo sur de Marte
                sat.group.position.x = marsBody.group.position.x;
                sat.group.position.z = marsBody.group.position.z;
                sat.group.position.y = marsBody.group.position.y - marsBody.data.radius * 0.95;

            } else {
                // Órbita solar independiente
                let radius = orbit.semiMajorAxis;
                if (radius > 130) radius = 125.0; // Pioneer scale

                sat.angle += orbit.speed * timeStep * 0.8;
                sat.group.position.x = radius * Math.cos(sat.angle);
                sat.group.position.z = radius * Math.sin(sat.angle);
                sat.group.position.y = Math.sin(sat.angle) * (orbit.inclination || 1.0) * 0.2;
            }
        });
    }

    markAsRecovered(satId) {
        const sat = this.satelliteObjects[satId];
        if (!sat) return;

        sat.data.statusType = 'recovered';
        sat.data.status = 'ENLACE DSN RESTABLECIDO';
        sat.beacon.material.color.setHex(0x00f59b);

        if (sat.group.userData.orbitLine) {
            sat.group.userData.orbitLine.material.color.setHex(0x00f59b);
        }

        // Actualizar sprite de etiqueta
        sat.group.remove(sat.group.userData.labelSprite);
        const newLabel = this.createLabelSprite(sat.data.name, '#00f59b');
        newLabel.position.y = 2.0;
        sat.group.add(newLabel);
        sat.group.userData.labelSprite = newLabel;
    }

    setOrbitsVisible(visible) {
        this.showOrbits = visible;
        this.orbitLines.forEach(l => l.visible = visible);
    }
}
