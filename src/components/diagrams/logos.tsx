// Real product logos for the system diagrams, from Simple Icons (CC0). Brands that asked Simple Icons to
// remove their marks (Twilio, OpenAI, Groq, Pinecone…) get a plain lettered badge instead of a fake logo.
import {
    siAnthropic,
    siApachekafka,
    siArgo,
    siClaude,
    siCucumber,
    siCloudflare,
    siDatadog,
    siDeepgram,
    siDocker,
    siElastic,
    siElasticsearch,
    siElevenlabs,
    siEnvoyproxy,
    siFastapi,
    siGit,
    siGithub,
    siGooglegemini,
    siGrafana,
    siHelm,
    siHuggingface,
    siIstio,
    siJest,
    siJira,
    siKubernetes,
    siLangchain,
    siLanggraph,
    siLinear,
    siLivekit,
    siModal,
    siModelcontextprotocol,
    siMongodb,
    siNeo4j,
    siNodedotjs,
    siNvidia,
    siOllama,
    siOpensearch,
    siOpentelemetry,
    siPipecat,
    siPostgresql,
    siPrometheus,
    siPython,
    siPytorch,
    siQdrant,
    siRay,
    siRedhat,
    siRedis,
    siSentry,
    siSqlite,
    siSupabase,
    siTypescript,
    siVercel,
    siVllm,
    siWebrtc,
    // automation workflows (Run it)
    siAirtable,
    siBuffer,
    siGmail,
    siGooglecloud,
    siGooglesheets,
    siHubspot,
    siMailchimp,
    siMake,
    siN8n,
    siRss,
    siTypeform,
    siWhatsapp,
    siXero,
    siZapier,
    siZendesk,
    type SimpleIcon,
} from "simple-icons";

const ICONS: SimpleIcon[] = [
    siAnthropic, siApachekafka, siArgo, siClaude, siCucumber, siCloudflare, siDatadog, siDeepgram, siDocker, siElastic,
    siElasticsearch, siElevenlabs, siEnvoyproxy, siFastapi, siGit, siGithub, siGooglegemini, siGrafana, siHelm,
    siHuggingface, siIstio, siJest, siJira, siKubernetes, siLangchain, siLanggraph, siLinear, siLivekit, siModal,
    siModelcontextprotocol, siMongodb, siNeo4j, siNodedotjs, siNvidia, siOllama, siOpensearch, siOpentelemetry, siPipecat,
    siPostgresql, siPrometheus, siPython, siPytorch, siQdrant, siRay, siRedhat, siRedis, siSentry, siSqlite,
    siSupabase, siTypescript, siVercel, siVllm, siWebrtc,
    siAirtable, siBuffer, siGmail, siGooglecloud, siGooglesheets, siHubspot, siMailchimp, siMake, siN8n, siRss,
    siTypeform, siWhatsapp, siXero, siZapier, siZendesk,
];

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const BY_NAME = new Map(ICONS.map((i) => [norm(i.title), i]));
// Other names the specs may use for the same product
const ALIAS: Record<string, string> = {
    mcp: "modelcontextprotocol",
    gemini: "googlegemini",
    geminilive: "googlegemini",
    postgres: "postgresql",
    k8s: "kubernetes",
    kafka: "apachekafka",
    huggingfacehub: "huggingface",
    envoy: "envoyproxy",
    claudecode: "claude",
    otel: "opentelemetry",
    livekitagents: "livekit",
    livekitcloud: "livekit",
    neo4jaura: "neo4j",
    neo4jgraphrag: "neo4j",
    auraagent: "neo4j",
    cypher: "neo4j",
    nodejs: "nodedotjs",
    node: "nodedotjs",
    vllmengine: "vllm",
};

export function findIcon(name?: string | null): SimpleIcon | undefined {
    if (!name) return undefined;
    const key = norm(name);
    return BY_NAME.get(ALIAS[key] ?? key);
}

// Brand colours that would vanish on the page (very dark on the dark theme, very pale on the light one)
// are drawn in the page's ink colour instead
export function brandLuminance(hex: string) {
    const n = parseInt(hex, 16);
    const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
        const v = c / 255;
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function readable(hex: string) {
    const l = brandLuminance(hex);
    return l > 0.12 && l < 0.72 ? `#${hex}` : "currentColor";
}

/** The product's logo, or its initials when there is no logo to use */
export function Logo({ name, size = 22 }: { name?: string | null; size?: number }) {
    // A generic part of the system (no particular product): a plain node glyph
    if (!name) {
        return (
            <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" className="shrink-0 text-ash">
                <rect x="4" y="4" width="16" height="16" rx="4" fill="none" stroke="currentColor" strokeWidth="1.6" />
                <circle cx="12" cy="12" r="2.6" fill="#fca50a" />
            </svg>
        );
    }
    const icon = findIcon(name);
    if (icon) {
        return (
            <svg viewBox="0 0 24 24" width={size} height={size} role="img" aria-label={icon.title} className="shrink-0 text-ink">
                <path d={icon.path} fill={readable(icon.hex)} />
            </svg>
        );
    }
    const initials = (name || "?")
        .replace(/[^A-Za-z0-9 ]/g, " ")
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase();
    return (
        <span
            role="img"
            aria-label={name || "component"}
            style={{ width: size, height: size, fontSize: size * 0.42 }}
            className="flex shrink-0 items-center justify-center rounded-md border border-fg/20 bg-fg/[0.06] font-mono font-semibold text-ink"
        >
            {initials || "•"}
        </span>
    );
}
