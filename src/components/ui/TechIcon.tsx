'use client'

import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'

interface TechIconProps {
    name: string
    size?: number
    showLabel?: boolean
    className?: string
}

// Soft skills emoji icons (no actual icon file needed)
const softSkillIcons: { [key: string]: string } = {
    'brain': '🧠',
    'communication': '💬',
    'team': '🤝',
    'adapt': '🔄',
    'learning': '📚',
}

// Local icons with brand colors
const localIconMap: { [key: string]: string } = {
    'amazonaws': '/icons/aws.svg',
    'microsoftazure': '/icons/azure.svg',
    'visualstudiocode': '/icons/vscode.svg',
    'xgboost': '/icons/xgboost.svg',
    'pinecone': '/icons/pinecone.svg',
    'mlflow': '/icons/mlflow.svg',
    'weightsandbiases': '/icons/wandb.svg',
    'dvc': '/icons/dvc.svg',
}

// Simple Icons that work reliably
const simpleIconsMap: { [key: string]: string } = {
    'pytorch': 'pytorch',
    'tensorflow': 'tensorflow',
    'keras': 'keras',
    'langchain': 'langchain',
    'huggingface': 'huggingface',
    'openai': 'openai',
    'anthropic': 'anthropic',
    'fastapi': 'fastapi',
    'docker': 'docker',
    'kubernetes': 'kubernetes',
    'git': 'git',
    'github': 'github',
    'redis': 'redis',
    'onnx': 'onnx',
    'googlecloud': 'googlecloud',
    'python': 'python',
    'scikitlearn': 'scikitlearn',
    'pandas': 'pandas',
    'numpy': 'numpy',
    'jupyter': 'jupyter',
    'r': 'r',
    'plotly': 'plotly',
    'postgresql': 'postgresql',
    'mongodb': 'mongodb',
    'nextdotjs': 'nextdotjs',
    'react': 'react',
    'typescript': 'typescript',
    'javascript': 'javascript',
    'nodedotjs': 'nodedotjs',
    'tailwindcss': 'tailwindcss',
}

// Display names
const displayNames: { [key: string]: string } = {
    'pytorch': 'PyTorch',
    'tensorflow': 'TensorFlow',
    'nextdotjs': 'Next.js',
    'python': 'Python',
    'docker': 'Docker',
    'kubernetes': 'Kubernetes',
    'amazonaws': 'AWS',
    'googlecloud': 'GCP',
    'microsoftazure': 'Azure',
    'postgresql': 'PostgreSQL',
    'mongodb': 'MongoDB',
    'redis': 'Redis',
    'fastapi': 'FastAPI',
    'git': 'Git',
    'github': 'GitHub',
    'jupyter': 'Jupyter',
    'scikitlearn': 'scikit-learn',
    'pandas': 'Pandas',
    'numpy': 'NumPy',
    'langchain': 'LangChain',
    'r': 'R',
    'mlflow': 'MLflow',
    'keras': 'Keras',
    'huggingface': 'HuggingFace',
    'openai': 'OpenAI',
    'anthropic': 'Anthropic',
    'pinecone': 'Pinecone',
    'visualstudiocode': 'VS Code',
    'weightsandbiases': 'W&B',
    'dvc': 'DVC',
    'xgboost': 'XGBoost',
    'plotly': 'Plotly',
    'onnx': 'ONNX',
}

export default function TechIcon({
    name,
    size = 40,
    showLabel = false,
    className = ''
}: TechIconProps) {
    const [hasError, setHasError] = useState(false)
    const [mounted, setMounted] = useState(false)
    const { resolvedTheme } = useTheme()

    useEffect(() => {
        setMounted(true)
    }, [])

    const nameLower = name.toLowerCase()
    const softSkillEmoji = softSkillIcons[nameLower]
    const localIcon = localIconMap[nameLower]
    const simpleIcon = simpleIconsMap[nameLower]
    const displayName = displayNames[nameLower] || name

    const isDark = mounted && resolvedTheme === 'dark'

    // Soft skills use emoji icons
    if (softSkillEmoji) {
        return (
            <div className={`flex flex-col items-center gap-2 ${className}`} title={displayName}>
                <div
                    className="flex items-center justify-center transition-all duration-300 hover:scale-110"
                    style={{ width: size, height: size, fontSize: size * 0.7 }}
                >
                    {softSkillEmoji}
                </div>
                {showLabel && <span className="text-xs text-muted">{displayName}</span>}
            </div>
        )
    }

    // Determine icon URL
    let iconUrl: string
    let isLocal = false

    if (localIcon) {
        iconUrl = localIcon
        isLocal = true
    } else if (simpleIcon) {
        // Simple Icons CDN - use brand colors (no color param) for both themes
        // In dark mode, icons will need brightness filter
        iconUrl = `https://cdn.simpleicons.org/${simpleIcon}`
    } else {
        iconUrl = `https://cdn.simpleicons.org/${nameLower}`
    }

    // SSR placeholder
    if (!mounted) {
        return (
            <div className={`flex flex-col items-center gap-2 ${className}`} title={displayName}>
                <div className="rounded-lg bg-secondary animate-pulse" style={{ width: size, height: size }} />
                {showLabel && <span className="text-xs text-muted">{displayName}</span>}
            </div>
        )
    }

    // Error fallback
    if (hasError) {
        return (
            <div className={`flex flex-col items-center gap-2 ${className}`} title={displayName}>
                <div
                    className="flex items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 border border-border"
                    style={{ width: size, height: size }}
                >
                    <span className="text-xs font-bold text-foreground">
                        {displayName.substring(0, 2).toUpperCase()}
                    </span>
                </div>
                {showLabel && <span className="text-xs text-muted">{displayName}</span>}
            </div>
        )
    }

    return (
        <div className={`flex flex-col items-center gap-2 ${className}`} title={displayName}>
            <div className="transition-all duration-300 hover:scale-110">
                <img
                    src={iconUrl}
                    alt={`${displayName} logo`}
                    width={size}
                    height={size}
                    onError={() => setHasError(true)}
                    style={{
                        width: size,
                        height: size,
                        // Local icons have embedded colors - keep them for both themes
                        // For CDN icons in dark mode, boost brightness so they're visible
                        filter: !isLocal && isDark ? 'brightness(1.5) saturate(1.2)' : undefined
                    }}
                />
            </div>
            {showLabel && <span className="text-xs text-muted">{displayName}</span>}
        </div>
    )
}
