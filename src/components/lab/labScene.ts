/**
 * Axon Lab: a small 3D walk-through of three systems, built entirely in code.
 * The camera travels between stations as the visitor scrolls the Work section;
 * each station can be taken apart, and the trace replay lights the matching part.
 *
 * Plain three.js, loaded on demand by AxonLab.tsx, so nothing here ships with
 * the first page load.
 */
import * as THREE from "three";
import { CSS2DObject, CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { infernoRGB } from "@/lib/inferno";

export interface LabScene {
    /** p: 0..1 progress through the work column; stops: progress value of each station's card */
    setProgress(p: number, stops: number[]): void;
    setExploded(exploded: boolean): void;
    setTraceStep(stationId: string, step: number): void;
    setPointer(nx: number, ny: number): void;
    setRunning(running: boolean): void;
    resize(): void;
    dispose(): void;
}

interface View {
    pos: THREE.Vector3;
    look: THREE.Vector3;
}

interface Station {
    id: string;
    view: View;
    labels: HTMLElement[];
    update(dt: number, time: number, animate: boolean): void;
    setStep(step: number): void;
    setExploded(exploded: boolean): void;
}

const color = (t: number) => {
    const [r, g, b] = infernoRGB(t);
    return new THREE.Color(r / 255, g / 255, b / 255);
};

// Deterministic randomness so the graph looks the same on every visit
function seeded(seed: number) {
    return () => {
        seed |= 0;
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// CSS2DRenderer owns the wrapper's transform, so the visible card is a child
// that can fade and slide on its own
function makeLabel(name: string, sub?: string) {
    const wrapper = document.createElement("div");
    const card = document.createElement("div");
    card.className = "lab-label";
    const title = document.createElement("span");
    title.className = "lab-label-name";
    title.textContent = name;
    card.appendChild(title);
    if (sub) {
        const detail = document.createElement("span");
        detail.className = "lab-label-sub";
        detail.textContent = sub;
        card.appendChild(detail);
    }
    card.dataset.show = "false";
    wrapper.appendChild(card);
    return Object.assign(new CSS2DObject(wrapper), { card });
}

const damp = (current: number, target: number, rate: number, dt: number) =>
    current + (target - current) * (1 - Math.exp(-rate * dt));

// ── Station 1: PersonaPlex, the voice pipeline as a machine ─────────────────
function personaplexStation(scene: THREE.Scene): Station {
    const group = new THREE.Group();
    scene.add(group);

    const defs = [
        { name: "Twilio line", sub: "The call comes in", geo: new THREE.BoxGeometry(1.1, 0.7, 0.7), x: -4.5, heat: 0.45 },
        { name: "Deepgram", sub: "Listens, spots the end of speech", geo: new THREE.CylinderGeometry(0.5, 0.5, 1, 40), x: -1.5, heat: 0.55 },
        { name: "LLM", sub: "Drafts the reply", geo: new THREE.IcosahedronGeometry(0.75, 1), x: 1.5, heat: 0.82 },
        { name: "Edge TTS", sub: "Speaks it back", geo: new THREE.ConeGeometry(0.55, 1, 40), x: 4.5, heat: 0.66 },
    ];

    const modules = defs.map((d, i) => {
        const material = new THREE.MeshStandardMaterial({
            color: 0x15101f,
            emissive: color(d.heat),
            emissiveIntensity: 0.35,
            metalness: 0.55,
            roughness: 0.35,
        });
        const mesh = new THREE.Mesh(d.geo, material);
        if (i === 3) mesh.rotation.z = Math.PI / 2; // the speaker opens towards the caller
        mesh.add(
            new THREE.LineSegments(
                new THREE.EdgesGeometry(d.geo, 20),
                new THREE.LineBasicMaterial({ color: color(d.heat), transparent: true, opacity: 0.55 })
            )
        );
        const label = makeLabel(d.name, d.sub);
        label.position.set(0, i === 3 ? 0 : 1.05, i === 3 ? 1.05 : 0);
        mesh.add(label);
        group.add(mesh);
        return {
            mesh,
            material,
            label: label.card,
            base: new THREE.Vector3(d.x, 0, 0),
            apart: new THREE.Vector3(d.x * 1.35, i % 2 ? -0.9 : 0.9, i % 2 ? 0.9 : -0.9),
        };
    });

    const coreLight = new THREE.PointLight(color(0.85), 6, 7, 2);
    modules[2].mesh.add(coreLight);

    // The cable between modules, redrawn as they move apart
    const cablePoints = 80;
    const cableGeometry = new THREE.BufferGeometry();
    cableGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(cablePoints * 3), 3));
    const cable = new THREE.Line(cableGeometry, new THREE.LineBasicMaterial({ color: color(0.55), transparent: true, opacity: 0.65 }));
    group.add(cable);

    const pulses = Array.from({ length: 7 }, (_, i) => {
        const p = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), new THREE.MeshBasicMaterial({ color: color(0.92) }));
        group.add(p);
        return { mesh: p, u: i / 7 };
    });

    let explode = 0;
    let exploded = false;
    let step = -1;
    let reverse = 0; // seconds of backwards flow left after an interruption
    const curve = new THREE.CatmullRomCurve3(modules.map((m) => m.base.clone()));

    return {
        id: "personaplex",
        view: { pos: new THREE.Vector3(4.6, 2.3, 8.4), look: new THREE.Vector3(0, 0.1, 0) },
        labels: modules.map((m) => m.label),
        setExploded(e) {
            exploded = e;
        },
        setStep(s) {
            step = s;
            if (s === 4) reverse = 1.6; // an interruption briefly sends the signal back
        },
        update(dt, time, animate) {
            explode = damp(explode, exploded ? 1 : 0, 5, dt);
            modules.forEach((m, i) => {
                m.mesh.position.lerpVectors(m.base, m.apart, explode);
                const active = step === i || step === 4;
                m.material.emissiveIntensity = damp(m.material.emissiveIntensity, active ? 1.15 : 0.35, 6, dt);
                const scale = active && animate ? 1 + Math.sin(time * 6) * 0.04 : 1;
                m.mesh.scale.setScalar(scale);
                m.label.dataset.show = String(explode > 0.5 || active);
            });
            if (animate) modules[2].mesh.rotation.y += dt * 0.6;

            curve.points.forEach((pt, i) => pt.copy(modules[i].mesh.position));
            const positions = cableGeometry.attributes.position as THREE.BufferAttribute;
            for (let i = 0; i < cablePoints; i++) {
                const pt = curve.getPointAt(i / (cablePoints - 1));
                positions.setXYZ(i, pt.x, pt.y, pt.z);
            }
            positions.needsUpdate = true;

            reverse = Math.max(0, reverse - dt);
            const direction = reverse > 0 ? -1 : 1;
            pulses.forEach((p) => {
                if (animate) p.u = (p.u + direction * dt * 0.16 + 1) % 1;
                p.mesh.position.copy(curve.getPointAt(p.u));
            });
        },
    };
}

// ── Station 2: NEXUS, dense retrieval meets graph traversal ─────────────────
function nexusStation(scene: THREE.Scene): Station {
    const group = new THREE.Group();
    group.position.set(0, 0, -16);
    scene.add(group);

    const rand = seeded(7);
    const count = 48;
    const chunks = 24; // the first 24 are dense-retrieval chunks, the rest graph entities
    const base: THREE.Vector3[] = [];
    for (let i = 0; i < count; i++) {
        const v = new THREE.Vector3(rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1).normalize().multiplyScalar(0.35 + rand() * 0.65);
        if (i < chunks) v.x -= 0.55;
        else v.x += 0.55;
        base.push(v.multiply(new THREE.Vector3(3.4, 2, 2.6)));
    }

    // Each node links to its two nearest neighbours
    const adjacency: number[][] = base.map(() => []);
    base.forEach((a, i) => {
        const nearest = base
            .map((b, j) => ({ j, d: i === j ? Infinity : a.distanceTo(b) }))
            .sort((x, y) => x.d - y.d)
            .slice(0, 2);
        nearest.forEach(({ j }) => {
            if (!adjacency[i].includes(j)) adjacency[i].push(j);
            if (!adjacency[j].includes(i)) adjacency[j].push(i);
        });
    });
    const edgeList: [number, number][] = [];
    adjacency.forEach((ns, i) => ns.forEach((j) => i < j && edgeList.push([i, j])));

    // A multi-hop path: from the chunk closest to the query, across to the far side of the graph
    const query = new THREE.Vector3(-3.8, 0.6, 1.4);
    const start = base.slice(0, chunks).reduce((best, v, i) => (v.distanceTo(query) < base[best].distanceTo(query) ? i : best), 0);
    const previous = new Map<number, number>([[start, -1]]);
    const queue = [start];
    while (queue.length) {
        const n = queue.shift()!;
        adjacency[n].forEach((m) => {
            if (!previous.has(m)) {
                previous.set(m, n);
                queue.push(m);
            }
        });
    }
    const target = [...previous.keys()].filter((i) => i >= chunks).reduce((best, i) => (base[i].x > base[best].x ? i : best), chunks);
    const path: number[] = [];
    for (let n = target; n !== -1 && n !== undefined; n = previous.get(n)!) path.unshift(n);
    const hops = path.slice(0, 6);
    const cluster = base
        .slice(0, chunks)
        .map((v, i) => ({ i, d: v.distanceTo(query) }))
        .sort((a, b) => a.d - b.d)
        .slice(0, 6)
        .map((x) => x.i);

    const nodes = new THREE.InstancedMesh(new THREE.SphereGeometry(0.12, 16, 12), new THREE.MeshBasicMaterial(), count);
    group.add(nodes);
    const edgeGeometry = new THREE.BufferGeometry();
    edgeGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(edgeList.length * 6), 3));
    group.add(new THREE.LineSegments(edgeGeometry, new THREE.LineBasicMaterial({ color: color(0.33), transparent: true, opacity: 0.35 })));
    const pathGeometry = new THREE.BufferGeometry();
    pathGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(hops.length * 3), 3));
    const pathMaterial = new THREE.LineBasicMaterial({ color: color(0.88), transparent: true, opacity: 0 });
    group.add(new THREE.Line(pathGeometry, pathMaterial));
    const hopPulse = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), new THREE.MeshBasicMaterial({ color: color(0.95) }));
    group.add(hopPulse);

    const centroid = (ids: number[]) => ids.reduce((acc, i) => acc.add(base[i]), new THREE.Vector3()).divideScalar(ids.length);
    const denseLabel = makeLabel("Qdrant", "Finds similar passages");
    denseLabel.position.copy(centroid(cluster)).add(new THREE.Vector3(0, 1.1, 0));
    const graphLabel = makeLabel("Neo4j", "Follows connected facts");
    graphLabel.position.copy(centroid(Array.from({ length: count - chunks }, (_, k) => k + chunks))).add(new THREE.Vector3(0, 1.6, 0));
    const answerLabel = makeLabel("LangGraph", "Chains the hops into an answer");
    answerLabel.position.copy(base[hops[hops.length - 1]]).add(new THREE.Vector3(0, 0.8, 0));
    group.add(denseLabel, graphLabel, answerLabel);

    let explode = 0;
    let exploded = false;
    let step = -1;
    let hopU = 0;
    const matrix = new THREE.Matrix4();
    const current = base.map((v) => v.clone());
    const heat = new Float32Array(count);

    return {
        id: "nexus",
        view: { pos: new THREE.Vector3(-5.8, 2.7, -8.8), look: new THREE.Vector3(0, 0, -16) },
        labels: [denseLabel.card, graphLabel.card, answerLabel.card],
        setExploded(e) {
            exploded = e;
        },
        setStep(s) {
            step = s;
        },
        update(dt, time, animate) {
            explode = damp(explode, exploded ? 1 : 0, 5, dt);
            const spread = 1 + explode * 0.45;
            const showCluster = step === 1 || step === 3 || step === -1;
            const showPath = step >= 2 || step === -1;

            for (let i = 0; i < count; i++) {
                current[i].copy(base[i]).multiplyScalar(spread);
                let h = i < chunks ? 0.48 : 0.3;
                if (showCluster && cluster.includes(i)) h = 0.78;
                if (showPath && hops.includes(i)) h = 0.86;
                if (step === 4 && i === hops[hops.length - 1]) h = 1;
                heat[i] = damp(heat[i] || h, h, 5, dt);
                const s = step === 0 && animate ? 0.8 + Math.sin(time * 3 + i) * 0.2 : 1;
                matrix.makeScale(s, s, s).setPosition(current[i]);
                nodes.setMatrixAt(i, matrix);
                nodes.setColorAt(i, color(heat[i]));
            }
            nodes.instanceMatrix.needsUpdate = true;
            if (nodes.instanceColor) nodes.instanceColor.needsUpdate = true;

            const edges = edgeGeometry.attributes.position as THREE.BufferAttribute;
            edgeList.forEach(([a, b], k) => {
                edges.setXYZ(k * 2, current[a].x, current[a].y, current[a].z);
                edges.setXYZ(k * 2 + 1, current[b].x, current[b].y, current[b].z);
            });
            edges.needsUpdate = true;

            const pathPositions = pathGeometry.attributes.position as THREE.BufferAttribute;
            hops.forEach((n, k) => pathPositions.setXYZ(k, current[n].x, current[n].y, current[n].z));
            pathPositions.needsUpdate = true;
            pathMaterial.opacity = damp(pathMaterial.opacity, showPath ? 0.9 : 0, 5, dt);

            if (animate) hopU = (hopU + dt * 0.35) % 1;
            const along = hopU * (hops.length - 1);
            const k = Math.min(hops.length - 2, Math.floor(along));
            // The graph is random, so now and then the path is a single node: nothing to travel along
            if (hops.length > 1) hopPulse.position.lerpVectors(current[hops[k]], current[hops[k + 1]], along - k);
            else hopPulse.position.copy(current[hops[0]]);
            hopPulse.visible = showPath;

            denseLabel.card.dataset.show = String(explode > 0.5 || step === 1 || step === 3);
            graphLabel.card.dataset.show = String(explode > 0.5 || step === 2);
            answerLabel.card.dataset.show = String(explode > 0.5 || step === 4);
            if (animate) group.rotation.y = Math.sin(time * 0.12) * 0.25;
        },
    };
}

// ── Station 3: Fraud, choosing a threshold by what mistakes cost ────────────
function fraudStation(scene: THREE.Scene): Station {
    const group = new THREE.Group();
    group.position.set(0, -0.4, -32);
    scene.add(group);

    const width = 9;
    const depth = 6;
    // Illustrative expected cost: the cheapest threshold shifts with the fraud rate
    const valley = (v: number) => 0.3 + 0.35 * v;
    const cost = (u: number, v: number) => (2.2 + 1.2 * v) * (u - valley(v)) ** 2 + 0.12 + 0.02 * Math.sin(u * 19 + v * 7);
    const height = (u: number, v: number) => cost(u, v) * 1.7 - 1;

    const geometry = new THREE.PlaneGeometry(width, depth, 90, 60);
    geometry.rotateX(-Math.PI / 2);
    const positions = geometry.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(positions.count * 3);
    let maxCost = 0;
    for (let i = 0; i < positions.count; i++) maxCost = Math.max(maxCost, cost(positions.getX(i) / width + 0.5, positions.getZ(i) / depth + 0.5));
    for (let i = 0; i < positions.count; i++) {
        const u = positions.getX(i) / width + 0.5;
        const v = positions.getZ(i) / depth + 0.5;
        positions.setY(i, height(u, v));
        // The cheap valley glows hottest
        const c = color(0.12 + 0.8 * (1 - cost(u, v) / maxCost) ** 2.2);
        colors.set([c.r, c.g, c.b], i * 3);
    }
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    group.add(new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.15 })));
    const wire = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.03 }));
    group.add(wire);

    // The ball rolls down the v = 0.5 slice by gradient descent
    const slice = 0.5;
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 16), new THREE.MeshBasicMaterial({ color: color(0.95) }));
    ball.add(new THREE.PointLight(color(0.9), 4, 4, 2));
    group.add(ball);

    const thresholdPoints = 40;
    const thresholdGeometry = new THREE.BufferGeometry();
    thresholdGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(thresholdPoints * 3), 3));
    group.add(new THREE.Line(thresholdGeometry, new THREE.LineBasicMaterial({ color: color(0.92), transparent: true, opacity: 0.85 })));

    const chosen = makeLabel("Chosen threshold", "Lowest expected cost");
    const axisThreshold = makeLabel("Threshold");
    axisThreshold.position.set(width / 2 + 0.4, -1, depth / 2);
    const axisRate = makeLabel("Fraud rate");
    axisRate.position.set(-width / 2, -1, -depth / 2 - 0.4);
    const note = makeLabel("Illustrative cost surface");
    note.position.set(-width / 2 + 1.2, 2.6, -depth / 2);
    ball.add(chosen);
    chosen.position.set(0, 0.6, 0);
    group.add(axisThreshold, axisRate, note);

    let explode = 0;
    let exploded = false;
    let step = -1;
    let u = 0.92;
    let restAt = 0;

    return {
        id: "fraud",
        view: { pos: new THREE.Vector3(5.6, 4.3, -25.2), look: new THREE.Vector3(0, -0.8, -32) },
        labels: [chosen.card, axisThreshold.card, axisRate.card, note.card],
        setExploded(e) {
            exploded = e;
        },
        setStep(s) {
            step = s;
            if (s === 2) u = 0.92; // replaying "Decide" rolls the ball again
        },
        update(dt, time, animate) {
            explode = damp(explode, exploded ? 1 : 0, 5, dt);
            (wire.material as THREE.MeshBasicMaterial).opacity = 0.03 + explode * 0.12;

            if (animate) {
                const grad = (cost(u + 0.001, slice) - cost(u - 0.001, slice)) / 0.002;
                u -= grad * dt * 0.35;
                if (Math.abs(grad) < 0.02) {
                    restAt += dt;
                    if (restAt > 3 && step !== 4) {
                        u = 0.92;
                        restAt = 0;
                    }
                } else restAt = 0;
            } else u = valley(slice);

            ball.position.set((u - 0.5) * width, height(u, slice) + 0.2, (slice - 0.5) * depth);
            const line = thresholdGeometry.attributes.position as THREE.BufferAttribute;
            for (let i = 0; i < thresholdPoints; i++) {
                const v = i / (thresholdPoints - 1);
                line.setXYZ(i, (u - 0.5) * width, height(u, v) + 0.03, (v - 0.5) * depth);
            }
            line.needsUpdate = true;

            chosen.card.dataset.show = String(explode > 0.5 || step >= 2);
            axisThreshold.card.dataset.show = String(explode > 0.5);
            axisRate.card.dataset.show = String(explode > 0.5);
            note.card.dataset.show = "true";
        },
    };
}

export function createLabScene(container: HTMLElement, reducedMotion: boolean): LabScene {
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x000004, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    const labels = new CSS2DRenderer();
    labels.domElement.className = "lab-labels";
    container.appendChild(labels.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000004, 0.05);
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);

    scene.add(new THREE.AmbientLight(0x6a4a8a, 0.55));
    const key = new THREE.DirectionalLight(0xffe2c4, 1.1);
    key.position.set(6, 9, 7);
    scene.add(key);
    const grid = new THREE.GridHelper(140, 140, 0x2b1f3d, 0x15101f);
    grid.position.set(0, -1.75, -16);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.7;
    scene.add(grid);

    const stations = [personaplexStation(scene), nexusStation(scene), fraudStation(scene)];

    const target = { pos: stations[0].view.pos.clone(), look: stations[0].view.look.clone() };
    const look = target.look.clone();
    camera.position.copy(target.pos);
    camera.lookAt(look);
    const pointer = new THREE.Vector2();
    let aspect = 1;
    let explodedTarget = false;
    let pullback = 1; // eased extra distance when parts are spread out
    let currentStation = 0;
    let running = false;
    let raf = 0;
    let last = performance.now();
    let time = 0;
    let dirty = true;

    const showLabelsFor = (index: number) =>
        stations.forEach((s, i) => s.labels.forEach((el) => (el.style.visibility = i === index ? "visible" : "hidden")));
    showLabelsFor(0);

    function render(dt: number) {
        const animate = !reducedMotion;
        const rate = reducedMotion ? 30 : 3.2;
        // Narrow stages need the camera further back to fit each station; so do exploded parts
        pullback = damp(pullback, explodedTarget ? 1.28 : 1, 4, dt);
        const distance = Math.max(1, 1.5 / aspect) * pullback;
        const want = target.look.clone().add(target.pos.clone().sub(target.look).multiplyScalar(distance));
        const offset = new THREE.Vector3(pointer.x * 0.6, pointer.y * 0.35, 0);
        camera.position.x = damp(camera.position.x, want.x + offset.x, rate, dt);
        camera.position.y = damp(camera.position.y, want.y + offset.y, rate, dt);
        camera.position.z = damp(camera.position.z, want.z, rate, dt);
        look.x = damp(look.x, target.look.x, rate, dt);
        look.y = damp(look.y, target.look.y, rate, dt);
        look.z = damp(look.z, target.look.z, rate, dt);
        camera.lookAt(look);
        stations.forEach((s) => s.update(dt, time, animate));
        renderer.render(scene, camera);
        labels.render(scene, camera);
    }

    function frame(now: number) {
        // A frame's timestamp can be slightly earlier than the performance.now() taken on resume; never step backwards
        const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
        last = now;
        time += dt;
        render(dt);
        // Reduced motion: keep rendering only while the camera is still settling
        if (running && (!reducedMotion || dirty)) raf = requestAnimationFrame(frame);
        if (reducedMotion) dirty = look.distanceTo(target.look) > 0.01 || Math.abs(pullback - (explodedTarget ? 1.28 : 1)) > 0.01;
    }

    function kick() {
        dirty = true;
        if (running && reducedMotion) {
            cancelAnimationFrame(raf);
            last = performance.now();
            raf = requestAnimationFrame(frame);
        }
    }

    const ease = (x: number) => x * x * (3 - 2 * x);

    return {
        setProgress(p, stops) {
            let i = 0;
            while (i < stops.length - 2 && p > stops[i + 1]) i++;
            const a = stations[i].view;
            const b = stations[Math.min(i + 1, stations.length - 1)].view;
            const span = stops[i + 1] - stops[i] || 1;
            const u = ease(Math.min(1, Math.max(0, (p - stops[i]) / span)));
            target.pos.lerpVectors(a.pos, b.pos, u);
            target.look.lerpVectors(a.look, b.look, u);
            const nearest = u < 0.5 ? i : Math.min(i + 1, stations.length - 1);
            if (nearest !== currentStation) {
                currentStation = nearest;
                showLabelsFor(nearest);
            }
            kick();
        },
        setExploded(exploded) {
            explodedTarget = exploded;
            stations.forEach((s) => s.setExploded(exploded));
            kick();
        },
        setTraceStep(stationId, step) {
            stations.find((s) => s.id === stationId)?.setStep(step);
            kick();
        },
        setPointer(nx, ny) {
            pointer.set(nx, ny);
            kick();
        },
        setRunning(next) {
            if (next === running) return;
            running = next;
            cancelAnimationFrame(raf);
            if (running) {
                last = performance.now();
                raf = requestAnimationFrame(frame);
            }
        },
        resize() {
            const { width, height } = container.getBoundingClientRect();
            renderer.setSize(width, height, false);
            renderer.domElement.style.width = `${width}px`;
            renderer.domElement.style.height = `${height}px`;
            labels.setSize(width, height);
            aspect = width / Math.max(1, height);
            camera.aspect = aspect;
            camera.updateProjectionMatrix();
            kick();
            if (!running) render(0);
        },
        dispose() {
            cancelAnimationFrame(raf);
            scene.traverse((o) => {
                const mesh = o as THREE.Mesh;
                mesh.geometry?.dispose();
                const m = mesh.material as THREE.Material | THREE.Material[] | undefined;
                (Array.isArray(m) ? m : m ? [m] : []).forEach((x) => x.dispose());
            });
            renderer.dispose();
            renderer.domElement.remove();
            labels.domElement.remove();
        },
    };
}
