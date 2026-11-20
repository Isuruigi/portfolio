// The 3D architecture stage. Every system is drawn as a miniature city: each part of the system is a
// building that says what it does (the LLM is a glass tower with a glowing crown, the GPUs are a power
// plant with cooling towers, the database is a row of data silos, the queue is a train station, the
// gateway is a toll gate, the evaluator is a courthouse…), the rest of the grid fills with an
// ordinary city, and the request is a drone flying the air lanes between them while the camera
// follows it like a film. Night on the dark theme, day on the light one, and a "hologram table" style
// that projects the same city as light over a dark desk.
//
// Plain three.js, no React. The React wrapper (ArchStage3D) owns the HTML labels and hands them in;
// this file moves them every frame so text stays crisp and accessible.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import type { DiagramNode, DiagramSpec, NodeKind } from "@/lib/data/diagrams";
import { brandLuminance, findIcon } from "@/components/diagrams/logos";

export type ArchStyle = "city" | "holo";
export type CamMode = "follow" | "overview";

const EMBER = new THREE.Color("#fca50a");
const HOT = new THREE.Color("#fcffa4");
const SX = 3.0; // grid spacing, left to right
const SZ = 2.6; // grid spacing, back to front
const PLOT_W = 2.2;
const PLOT_D = 1.9;
const TILE_W = 2.4; // one facade texture covers this many world units
const TILE_H = 4.8;
const TRAVEL_MS = 900;

// ---------------- looks: night city, day city, hologram ----------------

interface Look {
    night: boolean;
    holo: boolean;
    skyTop: string;
    skyBottom: string;
    fog: string;
    fogDensity: number;
    ground: string;
    plot: string;
    park: string;
    roof: string;
    concrete: string;
    facades: string[];
    glass: string;
    lit: string[];
    litRatio: number;
    foliage: string;
    ink: string;
    key: { color: string; intensity: number; pos: [number, number, number] };
    hemi: { sky: string; ground: string; intensity: number };
    env: number;
    exposure: number;
    bloom: { strength: number; radius: number; threshold: number };
    tilt: number;
    signGlow: number;
    windowGlow: number;
    lane: string;
    blending: THREE.Blending;
}

const LOOKS: Record<"night" | "day" | "holo", Look> = {
    night: {
        night: true,
        holo: false,
        skyTop: "#04030a",
        skyBottom: "#22163a",
        fog: "#120c22",
        fogDensity: 0.03,
        ground: "#0f0d15",
        plot: "#1f1c27",
        park: "#142019",
        roof: "#1a1822",
        concrete: "#3a3644",
        facades: ["#24212e", "#2c2838", "#201e29", "#302b3b"],
        glass: "#141824",
        lit: ["#ffcf7a", "#ffd99a", "#ffb35c", "#fff0c8"],
        litRatio: 0.3,
        foliage: "#1c2a22",
        ink: "#ece9f1",
        key: { color: "#8ea2ff", intensity: 0.7, pos: [-8, 14, 6] },
        hemi: { sky: "#2b2448", ground: "#08060c", intensity: 0.55 },
        env: 0.3,
        exposure: 1.0,
        bloom: { strength: 0.55, radius: 0.45, threshold: 0.8 },
        tilt: 1,
        signGlow: 0.7,
        windowGlow: 0.85,
        lane: "#fca50a",
        blending: THREE.AdditiveBlending,
    },
    day: {
        night: false,
        holo: false,
        skyTop: "#dfe7ec",
        skyBottom: "#f6efe4",
        fog: "#ece5da",
        fogDensity: 0.026,
        ground: "#bdb5a8",
        plot: "#e9e3d9",
        park: "#a9b98f",
        roof: "#cfc8bd",
        concrete: "#d8d1c6",
        facades: ["#f1ece4", "#e5ddd1", "#d9d0c3", "#ece4d6"],
        glass: "#7d93a6",
        lit: ["#7d93a6"],
        litRatio: 0,
        foliage: "#7f9a6b",
        ink: "#1b1722",
        key: { color: "#fff0d8", intensity: 2.7, pos: [-9, 15, 8] },
        hemi: { sky: "#ffffff", ground: "#a99c89", intensity: 0.7 },
        env: 0.55,
        exposure: 0.92,
        bloom: { strength: 0, radius: 0.4, threshold: 1 },
        tilt: 0.9,
        signGlow: 0.15,
        windowGlow: 0,
        lane: "#c2410c",
        blending: THREE.NormalBlending,
    },
    holo: {
        night: true,
        holo: true,
        skyTop: "#020207",
        skyBottom: "#140a1e",
        fog: "#05040a",
        fogDensity: 0,
        ground: "#08070c",
        plot: "#000000",
        park: "#000000",
        roof: "#000000",
        concrete: "#000000",
        facades: ["#000000"],
        glass: "#000000",
        lit: ["#000000"],
        litRatio: 0,
        foliage: "#000000",
        ink: "#fcd9a0",
        key: { color: "#ffffff", intensity: 0.8, pos: [-6, 12, 6] },
        hemi: { sky: "#3a2a50", ground: "#000000", intensity: 0.4 },
        env: 0.35,
        exposure: 1.0,
        bloom: { strength: 0.6, radius: 0.5, threshold: 0.3 },
        tilt: 0.3,
        signGlow: 1.2,
        windowGlow: 0,
        lane: "#fca50a",
        blending: THREE.AdditiveBlending,
    },
};

/** Guess a building when a spec node has no `kind` */
function kindOf(n: DiagramNode): NodeKind {
    if (n.kind) return n.kind;
    const t = `${n.label} ${n.role} ${n.tool ?? ""}`.toLowerCase();
    if (/caller|user|you\b|client|visitor/.test(t)) return "person";
    if (/gpu|inference|vllm|worker/.test(t)) return "gpu";
    if (/llm|model|gpt|gemma|claude|openai/.test(t)) return "model";
    if (/cache|redis|dragonfly/.test(t)) return "cache";
    if (/queue|stream|kafka|redpanda|transfer/.test(t)) return "queue";
    if (/graph|vector|store|db|database|qdrant|neo4j|postgres|git/.test(t)) return "store";
    if (/kubernetes|cluster|autoscal/.test(t)) return "cluster";
    if (/metric|monitor|trace|drift|prometheus|grafana/.test(t)) return "monitor";
    if (/gateway|router|proxy|registry/.test(t)) return "gateway";
    if (/eval|judge|valid|guard|verify|test/.test(t)) return "eval";
    if (/tool|search|api/.test(t)) return "tool";
    return "service";
}

function rng(seed: number) {
    let a = (seed * 2654435761) >>> 0 || 1;
    return () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// ---------------- canvas textures ----------------

function canvasTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void, srgb = true) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    draw(c.getContext("2d")!);
    const tex = new THREE.CanvasTexture(c);
    if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
}

function logoTexture(tool: string | null | undefined, ink: string) {
    return canvasTexture(256, 256, (ctx) => {
        const s = 256;
        ctx.fillStyle = "rgba(0,0,0,0)";
        ctx.clearRect(0, 0, s, s);
        const icon = findIcon(tool);
        if (icon) {
            const l = brandLuminance(icon.hex);
            ctx.fillStyle = l > 0.12 && l < 0.72 ? `#${icon.hex}` : ink;
            ctx.save();
            const k = (s * 0.7) / 24;
            ctx.translate(s * 0.15, s * 0.15);
            ctx.scale(k, k);
            ctx.fill(new Path2D(icon.path));
            ctx.restore();
            return;
        }
        if (!tool) {
            ctx.strokeStyle = ink;
            ctx.lineWidth = s * 0.06;
            ctx.beginPath();
            ctx.roundRect(s * 0.22, s * 0.22, s * 0.56, s * 0.56, s * 0.12);
            ctx.stroke();
            ctx.fillStyle = "#fca50a";
            ctx.beginPath();
            ctx.arc(s / 2, s / 2, s * 0.1, 0, Math.PI * 2);
            ctx.fill();
            return;
        }
        const initials = tool
            .replace(/[^A-Za-z0-9 ]/g, " ")
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((w) => w[0])
            .join("")
            .toUpperCase();
        ctx.fillStyle = ink;
        ctx.font = `600 ${s * 0.4}px ui-monospace, monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(initials || "•", s / 2, s / 2 + s * 0.02);
    });
}

/** A facade tile: 8 windows across, 16 floors; the map, and on the night look an emissive map of lit windows */
function facadeTextures(look: Look, facade: string, seed: number) {
    const r = rng(seed + 11);
    const lit: boolean[] = [];
    for (let i = 0; i < 8 * 16; i++) lit.push(r() < look.litRatio);
    const draw = (emissive: boolean) => (ctx: CanvasRenderingContext2D) => {
        const cw = 16;
        const ch = 16;
        ctx.fillStyle = emissive ? "#000" : facade;
        ctx.fillRect(0, 0, 128, 256);
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 8; x++) {
                const on = lit[y * 8 + x];
                if (emissive) {
                    if (!on) continue;
                    ctx.fillStyle = look.lit[(x + y * 3) % look.lit.length];
                } else {
                    ctx.fillStyle = on ? look.lit[(x * 7 + y) % look.lit.length] : look.glass;
                }
                ctx.fillRect(x * cw + 3, y * ch + 3, cw - 6, ch - 5);
                if (!emissive && !look.night) {
                    ctx.fillStyle = "rgba(255,255,255,0.18)";
                    ctx.fillRect(x * cw + 3, y * ch + 3, cw - 6, 3);
                }
            }
        }
    };
    const map = canvasTexture(128, 256, draw(false));
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    let emissive: THREE.Texture | null = null;
    if (look.night && look.litRatio > 0) {
        emissive = canvasTexture(128, 256, draw(true));
        emissive.wrapS = emissive.wrapT = THREE.RepeatWrapping;
    }
    return { map, emissive };
}

function skyTexture(look: Look) {
    return canvasTexture(16, 256, (ctx) => {
        const g = ctx.createLinearGradient(0, 0, 0, 256);
        g.addColorStop(0, look.skyTop);
        g.addColorStop(1, look.skyBottom);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 16, 256);
    });
}

function glowTexture(inner = "rgba(255,250,220,1)", mid = "rgba(252,165,10,0.85)") {
    return canvasTexture(128, 128, (ctx) => {
        const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
        g.addColorStop(0, inner);
        g.addColorStop(0.25, mid);
        g.addColorStop(0.6, "rgba(221,81,58,0.22)");
        g.addColorStop(1, "rgba(221,81,58,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 128, 128);
    });
}

function dashTexture() {
    const tex = canvasTexture(128, 16, (ctx) => {
        const g = ctx.createLinearGradient(0, 0, 128, 0);
        g.addColorStop(0, "rgba(255,255,255,0)");
        g.addColorStop(0.6, "rgba(255,255,255,0.2)");
        g.addColorStop(0.88, "rgba(255,255,255,1)");
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 128, 16);
    });
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
}

function gridTexture(color: string) {
    const tex = canvasTexture(128, 128, (ctx) => {
        ctx.clearRect(0, 0, 128, 128);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, 128, 128);
    });
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
}

// ---------------- geometry helpers ----------------

/** A box whose UVs are in world units, so one tiling facade material fits buildings of any size */
function cityBox(w: number, h: number, d: number, seed = 0) {
    const g = new THREE.BoxGeometry(w, h, d);
    const uv = g.attributes.uv as THREE.BufferAttribute;
    const dims: [number, number][] = [
        [d, h],
        [d, h],
        [w, d],
        [w, d],
        [w, h],
        [w, h],
    ];
    const r = rng(seed + 5);
    const offs = dims.map(() => [Math.floor(r() * 8) / 8, Math.floor(r() * 16) / 16]);
    for (let i = 0; i < uv.count; i++) {
        const f = Math.floor(i / 4);
        uv.setXY(i, uv.getX(i) * (dims[f][0] / TILE_W) + offs[f][0], uv.getY(i) * (dims[f][1] / TILE_H) + offs[f][1]);
    }
    return g;
}

const rbox = (w: number, h: number, d: number, r = 0.05) => new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2));

function triangleRoof(w: number, h: number, depth: number) {
    const s = new THREE.Shape();
    s.moveTo(-w / 2, 0);
    s.lineTo(w / 2, 0);
    s.lineTo(0, h);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false });
    g.translate(0, 0, -depth / 2);
    return g;
}

// ---------------- holographic material ----------------

const HOLO_VERT = /* glsl */ `
varying vec3 vN;
varying vec3 vW;
void main() {
    mat4 m = modelMatrix;
    #ifdef USE_INSTANCING
        m = modelMatrix * instanceMatrix;
    #endif
    vec4 w = m * vec4(position, 1.0);
    vW = w.xyz;
    vN = normalize(mat3(m) * normal);
    gl_Position = projectionMatrix * viewMatrix * w;
}`;

const HOLO_FRAG = /* glsl */ `
uniform float uTime;
uniform vec3 uColor;
uniform float uAct;
uniform float uBase;
varying vec3 vN;
varying vec3 vW;
void main() {
    vec3 v = normalize(cameraPosition - vW);
    float fres = pow(1.0 - abs(dot(normalize(vN), v)), 2.0);
    float scan = 0.5 + 0.5 * sin(vW.y * 42.0 - uTime * 3.0);
    float band = smoothstep(0.9, 1.0, fract(vW.y * 0.9 - uTime * 0.32));
    float flick = 0.93 + 0.07 * sin(uTime * 31.0 + vW.x * 2.7);
    float a = (uBase + fres * 0.42 + scan * 0.03 + band * 0.22) * flick * (0.45 + uAct * 1.0);
    vec3 col = mix(uColor, vec3(1.0, 0.94, 0.8), clamp(fres * 0.3 + uAct * 0.25, 0.0, 1.0));
    gl_FragColor = vec4(col * a, a);
}`;

function holoMaterial(color: THREE.Color | string, base = 0.04) {
    return new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(color) }, uAct: { value: 0 }, uBase: { value: base } },
        vertexShader: HOLO_VERT,
        fragmentShader: HOLO_FRAG,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
    });
}

// ---------------- tilt-shift: the miniature look ----------------

const TiltShiftShader = {
    uniforms: {
        tDiffuse: { value: null as THREE.Texture | null },
        uRes: { value: new THREE.Vector2(1, 1) },
        uAmount: { value: 1 },
        uFocus: { value: 0.52 },
    },
    vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
uniform sampler2D tDiffuse;
uniform vec2 uRes;
uniform float uAmount;
uniform float uFocus;
varying vec2 vUv;
void main() {
    float d = abs(vUv.y - uFocus);
    float blur = smoothstep(0.12, 0.5, d) * uAmount * 5.5;
    vec4 sum = texture2D(tDiffuse, vUv);
    float w = 1.0;
    if (blur > 0.05) {
        for (int i = 0; i < 16; i++) {
            float a = float(i) * 2.39996;
            float r = sqrt(float(i) + 0.5) / 4.0;
            sum += texture2D(tDiffuse, vUv + vec2(cos(a), sin(a)) * r * blur / uRes);
            w += 1.0;
        }
    }
    gl_FragColor = sum / w;
}`,
};

// ---------------- the city kit ----------------

interface Kit {
    look: Look;
    facade: THREE.Material[][]; // per palette: [px, nx, py, ny, pz, nz]
    roof: THREE.MeshStandardMaterial;
    concrete: THREE.MeshStandardMaterial;
    metal: THREE.MeshStandardMaterial;
    glass: THREE.MeshPhysicalMaterial;
    dark: THREE.MeshStandardMaterial;
    foliage: THREE.MeshStandardMaterial;
    trunk: THREE.MeshStandardMaterial;
    plot: THREE.MeshStandardMaterial;
    park: THREE.MeshStandardMaterial;
    beacon: THREE.MeshBasicMaterial;
    steam: THREE.Texture;
}

interface Built {
    group: THREE.Group;
    /** Height where air lanes attach */
    top: number;
    accent: THREE.MeshStandardMaterial;
    tick?: (dt: number, act: number, t: number) => void;
    beacons: THREE.Mesh[];
}

function makeKit(look: Look, track: <T extends { dispose: () => void }>(x: T) => T): Kit {
    const facade = look.facades.map((color, i) => {
        const { map, emissive } = facadeTextures(look, color, i * 7 + 3);
        track(map);
        if (emissive) track(emissive);
        const side = track(
            new THREE.MeshStandardMaterial({
                map,
                emissive: new THREE.Color(look.windowGlow > 0 ? "#ffffff" : "#000000"),
                emissiveMap: emissive,
                emissiveIntensity: look.windowGlow,
                roughness: 0.55,
                metalness: 0.15,
            })
        );
        const roof = track(new THREE.MeshStandardMaterial({ color: look.roof, roughness: 0.85 }));
        return [side, side, roof, roof, side, side];
    });
    return {
        look,
        facade,
        roof: track(new THREE.MeshStandardMaterial({ color: look.roof, roughness: 0.85 })),
        concrete: track(new THREE.MeshStandardMaterial({ color: look.concrete, roughness: 0.8 })),
        metal: track(new THREE.MeshStandardMaterial({ color: look.night ? "#8d8999" : "#9b958c", metalness: 0.9, roughness: 0.35 })),
        glass: track(
            new THREE.MeshPhysicalMaterial({
                color: look.night ? "#2b3550" : "#9fb6c8",
                metalness: 0.2,
                roughness: 0.08,
                clearcoat: 1,
                emissive: new THREE.Color(look.night ? "#3d5a9a" : "#000000"),
                emissiveIntensity: look.night ? 0.35 : 0,
            })
        ),
        dark: track(new THREE.MeshStandardMaterial({ color: look.night ? "#0c0b11" : "#3a3540", roughness: 0.6 })),
        foliage: track(new THREE.MeshStandardMaterial({ color: look.foliage, roughness: 0.9 })),
        trunk: track(new THREE.MeshStandardMaterial({ color: look.night ? "#2a2018" : "#7a634c", roughness: 0.9 })),
        plot: track(new THREE.MeshStandardMaterial({ color: look.plot, roughness: 0.9 })),
        park: track(new THREE.MeshStandardMaterial({ color: look.park, roughness: 1 })),
        beacon: track(new THREE.MeshBasicMaterial({ color: "#ff3b30", toneMapped: false })),
        steam: track(glowTexture("rgba(255,240,220,0.9)", "rgba(255,200,150,0.35)")),
    };
}

function buildNode(kind: NodeKind, kit: Kit, logo: THREE.Texture, seed: number): Built {
    const g = new THREE.Group();
    const r = rng(seed);
    const pal = () => kit.facade[Math.floor(r() * kit.facade.length)];
    const accent = new THREE.MeshStandardMaterial({ color: "#1a0e08", emissive: EMBER.clone(), emissiveIntensity: 0.3, roughness: 0.4 });
    const beacons: THREE.Mesh[] = [];
    const add = (geo: THREE.BufferGeometry, mat: THREE.Material | THREE.Material[], x = 0, y = 0, z = 0) => {
        const m = new THREE.Mesh(geo, mat);
        m.position.set(x, y, z);
        m.castShadow = true;
        m.receiveShadow = true;
        g.add(m);
        return m;
    };
    const tower = (w: number, h: number, d: number, x: number, y: number, z: number) => add(cityBox(w, h, d, seed + x * 13 + z * 7), pal(), x, y + h / 2, z);
    const beacon = (x: number, y: number, z: number) => {
        const b = add(new THREE.SphereGeometry(0.035, 10, 8), kit.beacon, x, y, z);
        b.castShadow = false;
        beacons.push(b);
    };
    const antenna = (x: number, y: number, z: number, h = 0.4) => {
        add(new THREE.CylinderGeometry(0.012, 0.012, h, 6), kit.metal, x, y + h / 2, z);
        beacon(x, y + h, z);
    };
    // A lit sign with the product's logo, facing the street (+z)
    const sign = (size: number, x: number, y: number, z: number, rotY = 0) => {
        const s = new THREE.Group();
        const frame = new THREE.Mesh(rbox(size + 0.07, size + 0.07, 0.04, 0.02), kit.dark);
        frame.castShadow = true;
        s.add(frame);
        const face = new THREE.Mesh(
            new THREE.PlaneGeometry(size, size),
            new THREE.MeshStandardMaterial({
                map: logo,
                transparent: true,
                emissive: new THREE.Color("#ffffff"),
                emissiveMap: logo,
                emissiveIntensity: kit.look.signGlow,
                roughness: 0.5,
                depthWrite: false,
            })
        );
        face.position.z = 0.022;
        s.add(face);
        s.position.set(x, y, z);
        s.rotation.y = rotY;
        g.add(s);
        return s;
    };
    let top = 1;
    let tick: Built["tick"];

    switch (kind) {
        case "person": {
            // A home, with a phone mast in the yard: where calls and requests start
            const house = add(cityBox(0.8, 0.46, 0.62, seed), pal(), -0.3, 0.23, -0.05);
            house.castShadow = true;
            add(triangleRoof(0.9, 0.32, 0.72), kit.roof, -0.3, 0.46, -0.05);
            add(new THREE.BoxGeometry(0.24, 0.16, 0.01), accent, -0.42, 0.24, 0.265);
            add(new THREE.BoxGeometry(0.12, 0.24, 0.01), kit.dark, -0.12, 0.12, 0.265);
            add(new THREE.CylinderGeometry(0.03, 0.04, 0.3, 8), kit.trunk, 0.62, 0.15, -0.45);
            add(new THREE.SphereGeometry(0.24, 14, 10), kit.foliage, 0.62, 0.45, -0.45);
            add(new THREE.CylinderGeometry(0.018, 0.026, 1.0, 8), kit.metal, 0.55, 0.5, 0.2);
            for (let k = 0; k < 3; k++) {
                const p = add(new THREE.BoxGeometry(0.05, 0.14, 0.02), kit.concrete, 0.55 + Math.cos((k * Math.PI * 2) / 3) * 0.05, 0.86, 0.2 + Math.sin((k * Math.PI * 2) / 3) * 0.05);
                p.rotation.y = (k * Math.PI * 2) / 3;
            }
            beacon(0.55, 1.02, 0.2);
            sign(0.26, 0.18, 0.32, 0.62);
            add(new THREE.CylinderGeometry(0.012, 0.012, 0.2, 6), kit.metal, 0.18, 0.1, 0.6);
            top = 1.05;
            break;
        }
        case "model": {
            // The AI tower: glass skyscraper with a crown that spins while it thinks
            add(cityBox(1.15, 0.3, 1.0, seed), pal(), 0, 0.15, 0);
            add(cityBox(0.72, 1.9, 0.72, seed + 1), kit.facade[0], 0, 0.3 + 0.95, 0);
            add(rbox(0.74, 1.6, 0.04, 0.01), kit.glass, 0, 1.15, 0.37);
            add(cityBox(0.5, 0.36, 0.5, seed + 2), pal(), 0, 2.2 + 0.18, 0);
            const crown = new THREE.Group();
            const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.035, 10, 48), accent);
            ring.rotation.x = Math.PI / 2;
            crown.add(ring);
            for (let k = 0; k < 6; k++) {
                const fin = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.18, 0.1), accent);
                fin.position.set(Math.cos((k / 6) * Math.PI * 2) * 0.42, 0.04, Math.sin((k / 6) * Math.PI * 2) * 0.42);
                fin.rotation.y = -(k / 6) * Math.PI * 2;
                crown.add(fin);
            }
            crown.position.y = 2.66;
            g.add(crown);
            antenna(0, 2.56, 0, 0.55);
            sign(0.38, 0, 1.9, 0.39);
            top = 2.8;
            tick = (dt, act) => {
                crown.rotation.y += dt * (0.25 + act * 2.6);
            };
            break;
        }
        case "gpu": {
            // The power plant: a turbine hall full of GPUs and two cooling towers venting heat
            add(cityBox(1.25, 0.52, 0.95, seed), pal(), -0.38, 0.26, 0);
            const prof: THREE.Vector2[] = [];
            for (let i = 0; i <= 12; i++) {
                const y = (i / 12) * 0.95;
                prof.push(new THREE.Vector2(0.24 + 0.13 * Math.pow((y - 0.6) / 0.6, 2), y));
            }
            const towerGeo = new THREE.LatheGeometry(prof, 28);
            const puffs: THREE.Sprite[] = [];
            for (const z of [-0.42, 0.42]) {
                const t = add(towerGeo, kit.concrete, 0.6, 0, z);
                (t.material as THREE.Material).side = THREE.DoubleSide;
                const rim = add(new THREE.TorusGeometry(0.255, 0.018, 8, 32), accent, 0.6, 0.95, z);
                rim.rotation.x = Math.PI / 2;
                for (let k = 0; k < 4; k++) {
                    const p = new THREE.Sprite(new THREE.SpriteMaterial({ map: kit.steam, transparent: true, depthWrite: false, opacity: 0 }));
                    p.position.set(0.6, 1.0, z);
                    p.userData.phase = k / 4 + (z > 0 ? 0.13 : 0);
                    g.add(p);
                    puffs.push(p);
                }
            }
            const fans: THREE.Group[] = [];
            for (const x of [-0.72, -0.38, -0.04]) {
                add(new THREE.CylinderGeometry(0.14, 0.14, 0.05, 20), kit.dark, x, 0.545, 0);
                const f = new THREE.Group();
                for (let k = 0; k < 4; k++) {
                    const b = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.01, 0.04), kit.metal);
                    b.position.x = 0.06;
                    const h = new THREE.Group();
                    h.rotation.y = (k / 4) * Math.PI * 2;
                    h.add(b);
                    f.add(h);
                }
                f.position.set(x, 0.58, 0);
                g.add(f);
                fans.push(f);
            }
            add(new THREE.BoxGeometry(1.1, 0.03, 0.01), accent, -0.38, 0.42, 0.48);
            sign(0.32, -0.38, 0.22, 0.49);
            top = 1.0;
            tick = (dt, act, t) => {
                fans.forEach((f) => (f.rotation.y += dt * (2 + act * 16)));
                puffs.forEach((p) => {
                    const q = (t * (0.12 + act * 0.35) + p.userData.phase) % 1;
                    p.position.y = 1.0 + q * 0.9;
                    p.scale.setScalar(0.25 + q * 0.55);
                    p.material.opacity = (0.12 + act * 0.55) * Math.sin(q * Math.PI);
                });
            };
            break;
        }
        case "store": {
            // Data silos, joined by a catwalk
            for (const x of [-0.6, 0, 0.6]) {
                add(new THREE.CylinderGeometry(0.26, 0.26, 1.1, 28), kit.concrete, x, 0.55, -0.12);
                add(new THREE.ConeGeometry(0.28, 0.2, 28), kit.roof, x, 1.2, -0.12);
                for (const y of [0.32, 0.72]) {
                    const b = add(new THREE.TorusGeometry(0.265, 0.018, 8, 32), accent, x, y, -0.12);
                    b.rotation.x = Math.PI / 2;
                }
            }
            add(new THREE.BoxGeometry(1.4, 0.04, 0.1), kit.metal, 0, 1.08, -0.12);
            beacon(0.6, 1.33, -0.12);
            sign(0.34, 0, 0.36, 0.42);
            add(new THREE.CylinderGeometry(0.015, 0.015, 0.2, 6), kit.metal, 0, 0.1, 0.4);
            top = 1.3;
            break;
        }
        case "cache": {
            // A water tower: a small store kept close and quick to reach
            for (const [x, z] of [
                [-0.24, -0.24],
                [0.24, -0.24],
                [-0.24, 0.24],
                [0.24, 0.24],
            ])
                add(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 8), kit.metal, x - 0.15, 0.45, z - 0.1);
            add(new THREE.CylinderGeometry(0.44, 0.44, 0.46, 28), kit.concrete, -0.15, 1.13, -0.1);
            add(new THREE.ConeGeometry(0.47, 0.22, 28), kit.roof, -0.15, 1.47, -0.1);
            const band = add(new THREE.TorusGeometry(0.445, 0.02, 8, 40), accent, -0.15, 1.13, -0.1);
            band.rotation.x = Math.PI / 2;
            sign(0.3, -0.15, 1.13, 0.36);
            add(cityBox(0.5, 0.3, 0.42, seed), pal(), 0.62, 0.15, 0.4);
            beacon(-0.15, 1.6, -0.1);
            top = 1.55;
            break;
        }
        case "queue": {
            // A station: messages ride a train along the track
            add(new THREE.BoxGeometry(2.1, 0.03, 0.03), kit.metal, 0, 0.05, -0.12);
            add(new THREE.BoxGeometry(2.1, 0.03, 0.03), kit.metal, 0, 0.05, 0.02);
            add(new THREE.BoxGeometry(1.6, 0.14, 0.38), kit.concrete, 0, 0.07, 0.4);
            add(new THREE.BoxGeometry(1.5, 0.04, 0.46), kit.roof, 0, 0.56, 0.4);
            for (const x of [-0.65, 0, 0.65]) add(new THREE.CylinderGeometry(0.02, 0.02, 0.42, 6), kit.metal, x, 0.35, 0.55);
            add(new THREE.BoxGeometry(1.4, 0.02, 0.02), accent, 0, 0.53, 0.63);
            const cars: THREE.Group[] = [];
            for (let k = 0; k < 4; k++) {
                const c = new THREE.Group();
                const body = new THREE.Mesh(rbox(0.42, 0.18, 0.18, 0.05), pal()[4]);
                body.castShadow = true;
                c.add(body);
                const win = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.05, 0.185), accent);
                win.position.y = 0.03;
                c.add(win);
                c.position.set(0, 0.16, -0.05);
                g.add(c);
                cars.push(c);
            }
            sign(0.28, 0, 0.74, 0.62);
            top = 0.75;
            tick = (dt, act, t) => {
                cars.forEach((c, k) => {
                    const span = 2.0;
                    const x = ((((t * (0.08 + act * 0.5) + k * 0.24) % 1) + 1) % 1) * span - span / 2;
                    c.position.x = x;
                    c.scale.setScalar(Math.max(0.01, Math.min(1, (span / 2 - Math.abs(x)) / 0.15)));
                });
            };
            break;
        }
        case "tool": {
            // A workshop with a tower crane: the tools the agent reaches for
            add(cityBox(1.0, 0.46, 0.8, seed), pal(), -0.36, 0.23, 0.05);
            for (const x of [-0.66, -0.36, -0.06]) add(new THREE.BoxGeometry(0.18, 0.03, 0.6), accent, x, 0.475, 0.05);
            add(new THREE.BoxGeometry(0.09, 1.7, 0.09), kit.metal, 0.62, 0.85, -0.35);
            const jib = new THREE.Group();
            const arm = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.06, 0.06), kit.metal);
            arm.position.x = 0.32;
            arm.castShadow = true;
            jib.add(arm);
            const cw = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.12), kit.concrete);
            cw.position.x = -0.18;
            jib.add(cw);
            const line = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.7, 4), kit.metal);
            line.position.set(0.75, -0.35, 0);
            jib.add(line);
            const hook = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.1), accent);
            hook.position.set(0.75, -0.72, 0);
            jib.add(hook);
            jib.position.set(0.62, 1.72, -0.35);
            g.add(jib);
            beacon(0.62, 1.8, -0.35);
            sign(0.32, -0.36, 0.25, 0.46);
            top = 1.75;
            tick = (dt, act, t) => {
                jib.rotation.y = Math.sin(t * (0.25 + act * 0.6)) * 1.2 + act * 0.4;
            };
            break;
        }
        case "monitor": {
            // A control tower with a sweeping radar: metrics, traces and alerts
            add(cityBox(0.9, 0.26, 0.7, seed), pal(), 0, 0.13, 0);
            add(new THREE.CylinderGeometry(0.13, 0.16, 1.3, 16), kit.concrete, 0, 0.26 + 0.65, 0);
            add(new THREE.CylinderGeometry(0.34, 0.26, 0.28, 12), kit.glass, 0, 1.7, 0);
            add(new THREE.CylinderGeometry(0.36, 0.36, 0.04, 12), kit.roof, 0, 1.86, 0);
            add(new THREE.TorusGeometry(0.3, 0.015, 6, 24), accent, 0, 1.6, 0).rotation.x = Math.PI / 2;
            const radar = new THREE.Group();
            const dish = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.1, 0.03), kit.metal);
            dish.position.y = 0.1;
            dish.rotation.x = -0.35;
            radar.add(dish);
            radar.add(new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.12, 6), kit.metal));
            radar.position.set(0, 1.94, 0);
            g.add(radar);
            beacon(0.2, 1.9, 0.2);
            sign(0.22, 0, 0.13, 0.37);
            top = 2.05;
            tick = (dt, act) => {
                radar.rotation.y += dt * (0.8 + act * 4);
            };
            break;
        }
        case "gateway": {
            // A city gate with a barrier that lifts for each request
            add(cityBox(0.32, 1.1, 0.5, seed), pal(), -0.62, 0.55, 0);
            add(cityBox(0.32, 1.1, 0.5, seed + 1), pal(), 0.62, 0.55, 0);
            add(cityBox(1.56, 0.24, 0.52, seed + 2), pal(), 0, 1.0 + 0.12, 0);
            add(new THREE.BoxGeometry(0.92, 0.03, 0.08), accent, 0, 0.98, 0.18);
            add(new THREE.BoxGeometry(0.92, 0.01, 1.6), kit.dark, 0, 0.005, 0.1);
            const pivot = new THREE.Group();
            const arm = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.04, 0.04), accent);
            arm.position.x = 0.4;
            pivot.add(arm);
            pivot.position.set(-0.44, 0.32, 0.3);
            g.add(pivot);
            add(new THREE.BoxGeometry(0.08, 0.3, 0.08), kit.concrete, -0.46, 0.15, 0.3);
            sign(0.3, 0, 1.12, 0.28);
            top = 1.25;
            let lift = 0;
            tick = (dt, act) => {
                lift += ((act > 0.6 ? 1 : 0) - lift) * Math.min(1, dt * 4);
                pivot.rotation.z = lift * 1.25;
            };
            break;
        }
        case "cluster": {
            // A block of identical buildings: pods in a pool
            const hs = [0.95, 1.15, 0.85, 1.05];
            [
                [-0.42, -0.36],
                [0.42, -0.36],
                [-0.42, 0.36],
                [0.42, 0.36],
            ].forEach(([x, z], i) => {
                add(cityBox(0.56, hs[i], 0.46, seed + i), kit.facade[1 % kit.facade.length], x, hs[i] / 2, z);
                add(new THREE.BoxGeometry(0.5, 0.03, 0.4), accent, x, hs[i] + 0.015, z);
            });
            add(new THREE.BoxGeometry(0.3, 0.04, 0.1), kit.metal, 0, 0.75, -0.36);
            add(new THREE.BoxGeometry(0.3, 0.04, 0.1), kit.metal, 0, 0.7, 0.36);
            beacon(0.42, 1.2, -0.36);
            sign(0.28, -0.42, 0.5, 0.6);
            top = 1.25;
            break;
        }
        case "eval": {
            // The courthouse: every answer is judged here before it goes out
            add(new THREE.BoxGeometry(1.5, 0.06, 1.1), kit.concrete, 0, 0.03, 0);
            add(new THREE.BoxGeometry(1.4, 0.06, 1.0), kit.concrete, 0, 0.09, 0);
            add(new THREE.BoxGeometry(1.3, 0.06, 0.9), kit.concrete, 0, 0.15, 0);
            add(cityBox(1.1, 0.6, 0.55, seed), kit.facade[0], 0, 0.18 + 0.3, -0.12);
            for (let k = 0; k < 6; k++) add(new THREE.CylinderGeometry(0.045, 0.05, 0.6, 12), kit.concrete, -0.5 + k * 0.2, 0.48, 0.3);
            add(new THREE.BoxGeometry(1.3, 0.08, 0.86), kit.concrete, 0, 0.82, 0);
            add(new THREE.BoxGeometry(1.2, 0.025, 0.02), accent, 0, 0.8, 0.44);
            add(triangleRoof(1.3, 0.3, 0.86), kit.roof, 0, 0.86, 0);
            sign(0.2, 0, 0.98, 0.45);
            top = 1.2;
            break;
        }
        default: {
            // An office: a podium and a tower, with a lit crown and a sign on the street
            add(cityBox(1.4, 0.3, 1.1, seed), pal(), 0, 0.15, 0);
            const h = 1.0 + r() * 0.6;
            tower(0.86, h, 0.72, -0.2, 0.3, -0.1);
            add(new THREE.BoxGeometry(0.88, 0.05, 0.74), accent, -0.2, 0.3 + h + 0.025, -0.1);
            add(new THREE.BoxGeometry(0.18, 0.1, 0.14), kit.metal, -0.4, 0.3 + h + 0.1, -0.2);
            add(new THREE.BoxGeometry(0.14, 0.08, 0.12), kit.metal, -0.05, 0.3 + h + 0.09, 0.05);
            antenna(-0.2, 0.3 + h + 0.05, -0.25, 0.35);
            sign(0.38, 0.42, 0.56, 0.3);
            top = 0.3 + h + 0.15;
        }
    }
    return { group: g, top, accent, tick, beacons };
}

// ---------------- the stage ----------------

export interface EngineOptions {
    spec: DiagramSpec;
    dark: boolean;
    style: ArchStyle;
    reducedMotion: boolean;
    /** The HTML label of each node, positioned by the engine every frame */
    labels: Map<string, HTMLElement>;
    onHover: (id: string | null) => void;
    onSelect: (id: string | null) => void;
}

interface NodeView {
    node: DiagramNode;
    built: Built;
    pos: THREE.Vector3;
    ring: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
    holo: THREE.ShaderMaterial | null;
    holoLine?: THREE.LineBasicMaterial;
    lift: number;
    act: number;
}

export function createArchEngine(canvas: HTMLCanvasElement, opts: EngineOptions) {
    const look = opts.style === "holo" ? LOOKS.holo : opts.dark ? LOOKS.night : LOOKS.day;
    const still = opts.reducedMotion;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = look.exposure;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = !look.holo;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    const disposables: { dispose: () => void }[] = [];
    const track = <T extends { dispose: () => void }>(x: T) => (disposables.push(x), x);

    scene.background = track(skyTexture(look));
    if (look.fogDensity > 0) scene.fog = new THREE.FogExp2(look.fog, look.fogDensity);
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    scene.environment = track(pmrem.fromScene(room, 0.04).texture);
    scene.environmentIntensity = look.env;
    room.dispose();
    pmrem.dispose();

    const key = new THREE.DirectionalLight(look.key.color, look.key.intensity);
    key.position.set(...look.key.pos);
    key.castShadow = !look.holo;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.02;
    scene.add(key);
    scene.add(key.target);
    scene.add(new THREE.HemisphereLight(look.hemi.sky, look.hemi.ground, look.hemi.intensity));

    const kit = makeKit(look, track);

    // ---- layout: the spec's grid, plus a ring of ordinary city around it ----
    const nodes = opts.spec.nodes;
    const at = (col: number, row: number) => new THREE.Vector3((col - 2) * SX, 0, (row - 1) * SZ);
    const cols = nodes.map((n) => n.col);
    const rows = nodes.map((n) => n.row);
    const c0 = Math.min(...cols);
    const c1 = Math.max(...cols);
    const r0 = Math.min(...rows);
    const r1 = Math.max(...rows);
    const minX = at(c0, 0).x - SX / 2;
    const maxX = at(c1, 0).x + SX / 2;
    const minZ = at(0, r0).z - SZ / 2;
    const maxZ = at(0, r1).z + SZ / 2;
    const center = new THREE.Vector3((minX + maxX) / 2, 0, (minZ + maxZ) / 2);
    const spanW = maxX - minX;
    const spanD = maxZ - minZ;
    key.target.position.copy(center);
    const sh = key.shadow.camera;
    sh.left = -spanW * 0.8;
    sh.right = spanW * 0.8;
    sh.top = spanD * 1.1;
    sh.bottom = -spanD * 1.1;
    sh.far = 60;
    key.position.add(center);

    const ring = look.holo ? 0 : 1;
    const used = new Set(nodes.map((n) => `${n.col},${n.row}`));
    const scenery: THREE.Object3D[] = [];

    // Ground: asphalt, or the hologram table
    if (look.holo) {
        const rad = Math.max(spanW, spanD) * 0.62 + 1.2;
        const table = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad * 1.02, 0.3, 96), new THREE.MeshPhysicalMaterial({ color: "#0b0a10", roughness: 0.25, metalness: 0.4, clearcoat: 1 }));
        table.position.set(center.x, -0.5, center.z);
        table.scale.z = spanD / spanW + 0.35;
        scene.add(table);
        const emitter = new THREE.Mesh(new THREE.TorusGeometry(rad * 0.98, 0.03, 8, 128), new THREE.MeshBasicMaterial({ color: EMBER, toneMapped: false }));
        emitter.rotation.x = Math.PI / 2;
        emitter.scale.y = table.scale.z;
        emitter.position.set(center.x, -0.34, center.z);
        scene.add(emitter);
        const grid = track(gridTexture("rgba(252,165,10,0.5)"));
        grid.repeat.set(spanW / 0.75, spanD / 0.75);
        const gp = new THREE.Mesh(new THREE.PlaneGeometry(spanW + 0.6, spanD + 0.6), new THREE.MeshBasicMaterial({ map: grid, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
        gp.rotation.x = -Math.PI / 2;
        gp.position.set(center.x, -0.02, center.z);
        scene.add(gp);
        // the projector's beam: a faint cone of light from the table up into the city
        const beam = new THREE.Mesh(
            new THREE.CylinderGeometry(rad * 0.98, rad * 0.98, 3.2, 64, 1, true),
            new THREE.ShaderMaterial({
                uniforms: { uColor: { value: EMBER.clone() } },
                vertexShader: `varying float vY; void main(){ vY = uv.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
                fragmentShader: `uniform vec3 uColor; varying float vY; void main(){ float a = 0.06 * (1.0 - vY); gl_FragColor = vec4(uColor * a, a); }`,
                transparent: true,
                depthWrite: false,
                side: THREE.DoubleSide,
                blending: THREE.AdditiveBlending,
            })
        );
        beam.scale.z = table.scale.z;
        beam.position.set(center.x, 1.25, center.z);
        scene.add(beam);
    } else {
        const ground = new THREE.Mesh(new THREE.PlaneGeometry(spanW * 4, spanD * 5), new THREE.MeshStandardMaterial({ color: look.ground, roughness: 0.95 }));
        ground.rotation.x = -Math.PI / 2;
        ground.position.copy(center);
        ground.receiveShadow = true;
        scene.add(ground);
    }

    // Plots: a building for each node, ordinary city everywhere else
    const fill = rng(opts.spec.domain.length * 31 + nodes.length);
    for (let c = c0 - ring; c <= c1 + ring; c++) {
        for (let r = r0 - ring; r <= r1 + ring; r++) {
            const p = at(c, r);
            const isNode = used.has(`${c},${r}`);
            const edge = c < c0 || c > c1 || r < r0 || r > r1;
            const park = !isNode && fill() < 0.22;
            const tile = new THREE.Mesh(rbox(PLOT_W, 0.08, PLOT_D, 0.04), park ? kit.park : kit.plot);
            tile.position.set(p.x, 0.04, p.z);
            tile.receiveShadow = true;
            scene.add(tile);
            scenery.push(tile);
            if (isNode) continue;
            if (park) {
                for (let k = 0; k < 4; k++) {
                    const tx = p.x + (fill() - 0.5) * 1.6;
                    const tz = p.z + (fill() - 0.5) * 1.3;
                    const s = 0.7 + fill() * 0.6;
                    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.22 * s, 6), kit.trunk);
                    trunk.position.set(tx, 0.08 + 0.11 * s, tz);
                    const crown = new THREE.Mesh(new THREE.SphereGeometry(0.2 * s, 10, 8), kit.foliage);
                    crown.position.set(tx, 0.08 + 0.3 * s, tz);
                    crown.castShadow = true;
                    scene.add(trunk, crown);
                    scenery.push(trunk, crown);
                }
                continue;
            }
            const count = 1 + Math.floor(fill() * 3);
            for (let k = 0; k < count; k++) {
                const w = 0.5 + fill() * 0.5;
                const d = 0.45 + fill() * 0.45;
                const h = (edge ? 0.3 : 0.4) + fill() * (edge ? 0.9 : 1.1);
                const b = new THREE.Mesh(cityBox(w, h, d, Math.floor(fill() * 1000)), kit.facade[Math.floor(fill() * kit.facade.length)]);
                const bx = p.x + (count === 1 ? 0 : (k / (count - 1) - 0.5) * (PLOT_W - w - 0.15));
                const bz = p.z + (fill() - 0.5) * (PLOT_D - d - 0.2);
                b.position.set(bx, 0.08 + h / 2, bz);
                b.castShadow = true;
                b.receiveShadow = true;
                scene.add(b);
                scenery.push(b);
            }
        }
    }

    // Streets: lane markings, street lamps, and traffic (light trails at night)
    const streetXs: number[] = [];
    const streetZs: number[] = [];
    for (let c = c0 - ring; c <= c1 + ring + 1; c++) streetXs.push(at(c, 0).x - SX / 2);
    for (let r = r0 - ring; r <= r1 + ring + 1; r++) streetZs.push(at(0, r).z - SZ / 2);
    const x0 = streetXs[0];
    const x1 = streetXs[streetXs.length - 1];
    const z0 = streetZs[0];
    const z1 = streetZs[streetZs.length - 1];
    if (!look.holo) {
        const dashes: THREE.Matrix4[] = [];
        const m4 = new THREE.Matrix4();
        for (const z of streetZs) for (let x = x0; x < x1; x += 0.5) dashes.push(m4.clone().makeTranslation(x, 0.004, z));
        for (const x of streetXs)
            for (let z = z0; z < z1; z += 0.5) {
                const m = new THREE.Matrix4().makeRotationY(Math.PI / 2);
                m.setPosition(x, 0.004, z);
                dashes.push(m);
            }
        const dashMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.22, 0.004, 0.035), new THREE.MeshBasicMaterial({ color: look.night ? "#4a4458" : "#f4efe6" }), dashes.length);
        dashes.forEach((m, i) => dashMesh.setMatrixAt(i, m));
        scene.add(dashMesh);

        const lamps: THREE.Vector3[] = [];
        for (const z of streetZs) for (const x of streetXs) lamps.push(new THREE.Vector3(x + 0.42, 0, z + 0.42));
        const poles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.012, 0.016, 0.42, 6), kit.metal, lamps.length);
        const bulbs = new THREE.InstancedMesh(
            new THREE.SphereGeometry(0.035, 8, 6),
            new THREE.MeshBasicMaterial({ color: look.night ? "#ffcf87" : "#d9d3c8" }),
            lamps.length
        );
        lamps.forEach((l, i) => {
            poles.setMatrixAt(i, new THREE.Matrix4().makeTranslation(l.x, 0.21, l.z));
            bulbs.setMatrixAt(i, new THREE.Matrix4().makeTranslation(l.x, 0.44, l.z));
        });
        scene.add(poles, bulbs);
    }
    const CARS = look.holo ? 0 : still ? 0 : 26;
    const cars = new THREE.InstancedMesh(
        new THREE.BoxGeometry(0.16, 0.07, 0.08),
        look.night ? new THREE.MeshBasicMaterial() : new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.3 }),
        Math.max(1, CARS)
    );
    cars.count = CARS;
    const traffic = Array.from({ length: CARS }, (_, i) => {
        const alongX = i % 2 === 0;
        const lines = alongX ? streetZs : streetXs;
        const line = lines[Math.floor(fill() * lines.length)];
        const dir = fill() < 0.5 ? 1 : -1;
        const color = look.night ? (dir > 0 ? "#fff1cf" : "#ff4d3d") : ["#c2410c", "#3a3540", "#f4efe6", "#7d93a6"][i % 4];
        cars.setColorAt(i, new THREE.Color(color));
        return { alongX, line, dir, speed: 0.5 + fill() * 0.6, off: fill() };
    });
    if (CARS) scene.add(cars);

    // Nodes
    const views = new Map<string, NodeView>();
    const pickables: THREE.Object3D[] = [];
    nodes.forEach((n, i) => {
        const logo = track(logoTexture(n.tool, look.ink));
        const built = buildNode(kindOf(n), kit, logo, i * 17 + n.id.length);
        const pos = at(n.col, n.row);
        built.group.position.set(pos.x, 0.08, pos.z);
        scene.add(built.group);
        const halo = new THREE.Mesh(
            new THREE.RingGeometry(1.0, 1.08, 64),
            new THREE.MeshBasicMaterial({ color: EMBER.clone(), transparent: true, opacity: 0, toneMapped: false, depthWrite: false })
        );
        halo.rotation.x = -Math.PI / 2;
        halo.position.set(pos.x, 0.09, pos.z);
        scene.add(halo);
        built.group.traverse((o) => {
            if ((o as THREE.Mesh).isMesh) {
                o.userData.nodeId = n.id;
                pickables.push(o);
            }
        });
        views.set(n.id, { node: n, built, pos, ring: halo, holo: null, lift: 0, act: 0 });
    });

    // Hologram: swap every solid material for light. Nodes get their own (they brighten when active)
    const holoScenery = look.holo ? track(holoMaterial("#dd513a", 0.01)) : null;
    // Hologram outlines: every solid also gets its hard edges drawn as lines of light
    const edgeLines = (m: THREE.Mesh, mat: THREE.LineBasicMaterial) => {
        const l = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry, 28), mat);
        l.raycast = () => {};
        m.add(l);
    };
    if (look.holo) {
        const sceneryLine = track(new THREE.LineBasicMaterial({ color: "#dd513a", transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }));
        for (const o of scenery) {
            (o as THREE.Mesh).material = holoScenery!;
            edgeLines(o as THREE.Mesh, sceneryLine);
        }
        for (const v of views.values()) {
            const line = track(new THREE.LineBasicMaterial({ color: EMBER, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }));
            v.holoLine = line;
            v.holo = track(holoMaterial(EMBER, 0.015));
            v.built.group.traverse((o) => {
                const m = o as THREE.Mesh;
                if (!m.isMesh) return;
                const mat = m.material as THREE.MeshStandardMaterial;
                // keep the logo faces readable
                if (mat.map && mat.transparent) return;
                m.material = v.holo!;
                m.castShadow = false;
                edgeLines(m, line);
            });
        }
    }

    // Air lanes: arcs between rooftops, dotted until the request has flown them
    const dash = track(dashTexture());
    const arc = (a: NodeView, b: NodeView) => {
        const pa = a.pos.clone().setY(a.built.top + 0.1);
        const pb = b.pos.clone().setY(b.built.top + 0.1);
        const d = pa.distanceTo(pb);
        const mid = pa.clone().add(pb).multiplyScalar(0.5).setY(Math.max(pa.y, pb.y) + 0.5 + d * 0.1);
        return new THREE.QuadraticBezierCurve3(pa, mid, pb);
    };
    const laneColor = new THREE.Color(look.lane);
    const edges = opts.spec.edges
        .map((e) => {
            const a = views.get(e.from);
            const b = views.get(e.to);
            if (!a || !b) return null;
            const curve = arc(a, b);
            const len = curve.getLength();
            const tex = track(dash.clone());
            tex.repeat.set(Math.max(2, Math.round(len / 0.5)), 1);
            const lane = new THREE.Mesh(
                new THREE.TubeGeometry(curve, 64, 0.02, 6, false),
                new THREE.MeshBasicMaterial({ color: laneColor, map: tex, transparent: true, opacity: 0.25, depthWrite: false, toneMapped: false, blending: look.blending })
            );
            scene.add(lane);
            return { e, curve, lane, tex, lit: 0 };
        })
        .filter(Boolean) as { e: { from: string; to: string }; curve: THREE.QuadraticBezierCurve3; lane: THREE.Mesh<THREE.TubeGeometry, THREE.MeshBasicMaterial>; tex: THREE.Texture; lit: number }[];

    // The request: a little drone with a lamp, a halo and a trail
    const glow = track(glowTexture());
    const drone = new THREE.Group();
    const droneMat = new THREE.MeshStandardMaterial({ color: look.night ? "#1b1822" : "#2b2733", metalness: 0.6, roughness: 0.3 });
    drone.add(new THREE.Mesh(rbox(0.2, 0.06, 0.2, 0.03), droneMat));
    const rotors: THREE.Mesh[] = [];
    for (const [x, z] of [
        [-0.13, -0.13],
        [0.13, -0.13],
        [-0.13, 0.13],
        [0.13, 0.13],
    ]) {
        const rot = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.006, 16), new THREE.MeshBasicMaterial({ color: "#bfb8c9", transparent: true, opacity: 0.35 }));
        rot.position.set(x, 0.04, z);
        drone.add(rot);
        rotors.push(rot);
    }
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12), new THREE.MeshBasicMaterial({ color: HOT, toneMapped: false }));
    lamp.position.y = -0.04;
    drone.add(lamp);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    halo.scale.setScalar(look.holo ? 0.5 : look.night ? 0.8 : 0.6);
    drone.add(halo);
    const droneLight = new THREE.PointLight("#ffb347", look.night ? 7 : 1.8, 5, 1.6);
    droneLight.position.y = -0.1;
    drone.add(droneLight);
    drone.visible = false;
    scene.add(drone);
    const trail = Array.from({ length: 9 }, (_, k) => {
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.55 * (1 - k / 9), toneMapped: false }));
        s.scale.setScalar(0.4 * (1 - k / 11));
        s.visible = false;
        scene.add(s);
        return s;
    });

    // Stars, on the night look
    if (look.night && !look.holo) {
        const pts: number[] = [];
        const sr = rng(7);
        for (let i = 0; i < 500; i++) {
            const th = sr() * Math.PI * 2;
            const ph = 0.15 + sr() * 1.1;
            const R = 60;
            pts.push(center.x + R * Math.cos(th) * Math.cos(ph), R * Math.sin(ph), center.z + R * Math.sin(th) * Math.cos(ph));
        }
        const sg = new THREE.BufferGeometry();
        sg.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
        scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: "#d9d4ff", size: 1.4, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.7 })));
    }

    // ---- camera: overview, or follow the drone like a film ----
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 200);
    const ELEVATION = 0.78;
    let overviewRadius = 20;
    let camRadius = 20;
    const camTarget = center.clone();
    let yaw = 0;
    let yawTarget = 0;
    let pitch = 0;
    let pitchTarget = 0;
    let dragYaw = 0;
    let camMode: CamMode = still ? "overview" : "follow";

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), look.bloom.strength, look.bloom.radius, look.bloom.threshold);
    if (look.bloom.strength > 0) composer.addPass(bloom);
    const tilt = new ShaderPass(TiltShiftShader);
    tilt.uniforms.uAmount.value = look.tilt;
    if (look.tilt > 0) composer.addPass(tilt);
    composer.addPass(new OutputPass());

    function fit(width: number, height: number) {
        const aspect = width / Math.max(1, height);
        camera.aspect = aspect;
        const vfov = THREE.MathUtils.degToRad(camera.fov);
        const hfov = 2 * Math.atan(Math.tan(vfov / 2) * aspect);
        const halfW = spanW / 2 + 0.2;
        const halfD = spanD / 2;
        const byWidth = halfW / Math.tan(hfov / 2);
        const byDepth = (halfD * Math.sin(ELEVATION) + 1.4) / Math.tan(vfov / 2) + halfD * Math.cos(ELEVATION);
        overviewRadius = Math.max(byWidth, byDepth) * 0.95;
        camera.updateProjectionMatrix();
    }

    const box = { w: 0, h: 0 };
    function resize() {
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        if (!w || !h) return;
        box.w = w;
        box.h = h;
        renderer.setSize(w, h, false);
        composer.setSize(w, h);
        bloom.resolution.set(w / 2, h / 2);
        tilt.uniforms.uRes.value.set(w, h);
        fit(w, h);
    }

    // ---- pointer: parallax, drag to turn, hover and click on buildings ----
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let dragging: { x: number; start: number; moved: boolean } | null = null;
    let hovered: string | null = null;
    const pickAt = (ev: PointerEvent) => {
        const r = canvas.getBoundingClientRect();
        ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
        ray.setFromCamera(ndc, camera);
        const hit = ray.intersectObjects(pickables, false)[0];
        return (hit?.object.userData.nodeId as string | undefined) ?? null;
    };
    const onMove = (ev: PointerEvent) => {
        const r = canvas.getBoundingClientRect();
        const px = ((ev.clientX - r.left) / r.width) * 2 - 1;
        const py = ((ev.clientY - r.top) / r.height) * 2 - 1;
        if (dragging) {
            const dx = (ev.clientX - dragging.x) / r.width;
            if (Math.abs(dx) > 0.01) dragging.moved = true;
            dragYaw = THREE.MathUtils.clamp(dragging.start - dx * 2.4, -0.9, 0.9);
            return;
        }
        if (!still) {
            yawTarget = px * 0.08;
            pitchTarget = py * 0.04;
        }
        if (ev.pointerType !== "mouse") return;
        const id = pickAt(ev);
        if (id !== hovered) {
            hovered = id;
            canvas.style.cursor = id ? "pointer" : "grab";
            opts.onHover(id);
        }
    };
    const onDown = (ev: PointerEvent) => {
        dragging = { x: ev.clientX, start: dragYaw, moved: false };
        canvas.setPointerCapture(ev.pointerId);
    };
    const onUp = (ev: PointerEvent) => {
        const wasDrag = dragging?.moved;
        dragging = null;
        if (canvas.hasPointerCapture(ev.pointerId)) canvas.releasePointerCapture(ev.pointerId);
        if (!wasDrag) opts.onSelect(pickAt(ev));
    };
    const onLeave = () => {
        yawTarget = 0;
        pitchTarget = 0;
        if (hovered) {
            hovered = null;
            opts.onHover(null);
        }
    };
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointerleave", onLeave);
    canvas.style.cursor = "grab";
    canvas.style.touchAction = "pan-y";

    // ---- state pushed in from React ----
    let visited = new Set<string>();
    let current: string | null = null;
    let focus: string | null = null;
    let walking = false;
    let wideFrom = 0; // after this time the camera pulls back to the whole city
    let segment: { curve: THREE.Curve<THREE.Vector3>; start: number } | null = null;

    function setStep(flowIds: string[], step: number, animate: boolean) {
        visited = new Set(flowIds.slice(0, step + 1));
        current = flowIds[step] ?? null;
        walking = animate;
        const now = performance.now();
        // the first step and the end of the loop are wide shots; everything in between follows the drone
        wideFrom = step === 0 ? now : step >= flowIds.length - 1 ? now + TRAVEL_MS + 1400 : Infinity;
        const prev = step > 0 ? views.get(flowIds[step - 1]) : null;
        const next = current ? views.get(current) : null;
        if (prev && next && animate && !still) {
            const hit = edges.find((x) => (x.e.from === prev.node.id && x.e.to === next.node.id) || (x.e.to === prev.node.id && x.e.from === next.node.id));
            const forward = hit && hit.e.from === prev.node.id;
            const curve = hit ? (forward ? hit.curve : new THREE.QuadraticBezierCurve3(hit.curve.v2, hit.curve.v1, hit.curve.v0)) : arc(prev, next);
            segment = { curve, start: now };
        } else segment = null;
    }
    const setFocus = (id: string | null) => {
        focus = id;
    };
    const setCamMode = (m: CamMode) => {
        camMode = m;
    };

    // ---- the frame loop ----
    let raf = 0;
    let running = false;
    let last = performance.now();
    const tmp = new THREE.Vector3();
    const want = new THREE.Vector3();
    const dronePrev = new THREE.Vector3();
    const ro = new ResizeObserver(() => {
        resize();
        if (!running) renderOnce();
    });
    ro.observe(canvas);

    function frame(now: number) {
        // rAF timestamps can be a little older than performance.now() taken when play() started
        const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
        last = now;
        const t = still ? 0 : now / 1000;
        const ease = 1 - Math.pow(0.0015, dt);

        // drone
        let flying = false;
        if (segment) {
            const p = Math.min(1, (now - segment.start) / TRAVEL_MS);
            const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
            dronePrev.copy(drone.position);
            segment.curve.getPoint(e, drone.position);
            if (p > 0.02) {
                const dx = drone.position.x - dronePrev.x;
                const dz = drone.position.z - dronePrev.z;
                if (Math.abs(dx) + Math.abs(dz) > 1e-4) drone.rotation.y = Math.atan2(dx, dz);
            }
            drone.visible = p < 1;
            flying = p < 1;
            halo.scale.setScalar((look.holo ? 0.45 : look.night ? 0.75 : 0.55) + 0.1 * Math.sin(now / 50));
            rotors.forEach((r2) => (r2.rotation.y += 0.9));
            trail.forEach((s, k) => {
                const q = e - (k + 1) * 0.03;
                s.visible = p < 1 && q > 0;
                if (s.visible) segment!.curve.getPoint(q, s.position);
            });
            if (p >= 1) segment = null;
        } else {
            drone.visible = false;
            trail.forEach((s) => (s.visible = false));
        }

        // camera: what to look at, and from how far
        let wantR = overviewRadius;
        want.copy(center);
        const followable = camMode === "follow" && walking && !still;
        if (focus && views.get(focus)) {
            want.copy(views.get(focus)!.pos);
            wantR = Math.max(7, overviewRadius * 0.5);
        } else if (followable && now < wideFrom) {
            if (flying) want.copy(drone.position).setY(0);
            else if (current && views.get(current)) want.copy(views.get(current)!.pos);
            wantR = Math.max(7.5, overviewRadius * 0.52);
        }
        const k = 1 - Math.pow(0.12, dt);
        camTarget.lerp(want, k);
        camRadius += (wantR - camRadius) * k;
        yaw += (yawTarget - yaw) * ease * 0.6;
        pitch += (pitchTarget - pitch) * ease * 0.6;
        const drift = still ? 0 : followable ? Math.sin(t * 0.09) * 0.28 : Math.sin(t * 0.12) * 0.05;
        const az = yaw + dragYaw + drift;
        const el = ELEVATION + pitch - (camRadius < overviewRadius * 0.8 ? 0.12 : 0);
        camera.position.set(camTarget.x + camRadius * Math.cos(el) * Math.sin(az), camRadius * Math.sin(el), camTarget.z + camRadius * Math.cos(el) * Math.cos(az));
        camera.lookAt(camTarget.x, 0.5, camTarget.z + 0.1);

        // buildings
        for (const v of views.values()) {
            const isCur = v.node.id === current;
            const isFocus = v.node.id === focus;
            const target = isCur ? 1 : visited.has(v.node.id) ? 0.35 : 0;
            v.act += (target - v.act) * ease;
            v.lift += ((isFocus ? 0.06 : 0) - v.lift) * ease;
            v.built.group.position.y = 0.08 + v.lift;
            const pulse = isCur && !still ? 0.4 * Math.sin(t * 5) : 0;
            v.built.accent.emissiveIntensity = 0.3 + v.act * (look.night ? 3.4 : 2.2) + pulse + (isFocus ? 0.8 : 0);
            v.ring.material.opacity = Math.min(0.95, v.act * 0.9 + (isFocus ? 0.7 : 0));
            v.ring.material.color.copy(isFocus && !isCur ? HOT : EMBER);
            v.ring.scale.setScalar(1 + (isCur && !still ? 0.04 * Math.sin(t * 5) : 0));
            if (v.holo) {
                v.holo.uniforms.uTime.value = t;
                v.holo.uniforms.uAct.value = v.act + (isFocus ? 0.4 : 0);
                if (v.holoLine) v.holoLine.opacity = 0.45 + v.act * 0.5 + (isFocus ? 0.3 : 0);
            }
            v.built.beacons.forEach((b, i) => (b.visible = still || Math.sin(t * 3 + i + v.pos.x) > 0.2));
            v.built.tick?.(still ? 0 : dt, v.act, t);
        }
        if (holoScenery) holoScenery.uniforms.uTime.value = t;

        // lanes
        for (const x of edges) {
            const on = visited.has(x.e.from) && visited.has(x.e.to) ? 1 : 0;
            const near = focus && (x.e.from === focus || x.e.to === focus) ? 1 : 0;
            x.lit += (Math.max(on, near) - x.lit) * ease;
            x.lane.material.opacity = 0.18 + x.lit * 0.8;
            if (!still) x.tex.offset.x -= dt * (0.4 + x.lit * 0.8);
        }

        // traffic
        if (CARS) {
            const m4 = new THREE.Matrix4();
            const q = new THREE.Quaternion();
            const s1 = new THREE.Vector3(1, 1, 1);
            traffic.forEach((c, i) => {
                const len = c.alongX ? x1 - x0 : z1 - z0;
                const u = ((((t * c.speed) / len + c.off) % 1) + 1) % 1;
                const s = c.dir > 0 ? u : 1 - u;
                const lane = c.dir > 0 ? 0.11 : -0.11;
                if (c.alongX) {
                    tmp.set(x0 + s * len, 0.05, c.line + lane);
                    q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, 0);
                } else {
                    tmp.set(c.line + lane, 0.05, z0 + s * len);
                    q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, Math.PI / 2);
                }
                m4.compose(tmp, q, s1);
                cars.setMatrixAt(i, m4);
            });
            cars.instanceMatrix.needsUpdate = true;
        }

        composer.render();
        placeLabels();
    }

    function placeLabels() {
        if (!box.w) return;
        for (const v of views.values()) {
            const el = opts.labels.get(v.node.id);
            if (!el) continue;
            tmp.set(v.pos.x, 0.1 + v.lift, v.pos.z + PLOT_D / 2 - 0.1).project(camera);
            const x = (tmp.x * 0.5 + 0.5) * box.w;
            const y = (-tmp.y * 0.5 + 0.5) * box.h;
            const inside = tmp.z < 1 && x > -60 && x < box.w + 60 && y > -30 && y < box.h + 10;
            el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -40%)`;
            el.style.opacity = inside ? "1" : "0";
            el.style.pointerEvents = inside ? "" : "none";
            el.style.zIndex = String(10 + Math.round((1 - tmp.z) * 1000));
        }
    }

    function loop(now: number) {
        if (!running) return;
        frame(now);
        raf = requestAnimationFrame(loop);
    }
    function renderOnce() {
        last = performance.now();
        frame(last);
    }
    function play(on: boolean) {
        if (on === running) return;
        running = on;
        if (on) {
            last = performance.now();
            raf = requestAnimationFrame(loop);
        } else cancelAnimationFrame(raf);
    }

    resize();
    camRadius = overviewRadius;
    renderOnce();

    function dispose() {
        play(false);
        ro.disconnect();
        canvas.removeEventListener("pointermove", onMove);
        canvas.removeEventListener("pointerdown", onDown);
        canvas.removeEventListener("pointerup", onUp);
        canvas.removeEventListener("pointerleave", onLeave);
        const mats = new Set<THREE.Material>();
        scene.traverse((o) => {
            const m = o as THREE.Mesh;
            if (m.geometry) m.geometry.dispose();
            const mat = m.material as THREE.Material | THREE.Material[] | undefined;
            if (Array.isArray(mat)) mat.forEach((x) => mats.add(x));
            else if (mat) mats.add(mat);
        });
        mats.forEach((m) => m.dispose());
        disposables.forEach((d) => d.dispose());
        composer.dispose();
        renderer.dispose();
    }

    return { setStep, setFocus, setCamMode, play, renderOnce, dispose };
}

export type ArchEngine = ReturnType<typeof createArchEngine>;
