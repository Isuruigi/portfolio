import Image from 'next/image';
import { User } from 'lucide-react';

interface ProfileImageProps {
    src?: string;
    alt: string;
    size: number;
    className?: string;
    showInitials?: boolean;
    initials?: string;
}

export default function ProfileImage({
    src,
    alt,
    size,
    className = '',
    showInitials = true,
    initials = 'IC'
}: ProfileImageProps) {
    // If no image provided, show initials or placeholder
    if (!src) {
        return (
            <div
                className={`
          rounded-full 
          bg-gradient-to-br from-primary to-accent
          flex items-center justify-center
          text-white font-bold
          border-2 border-accent
          ${className}
        `}
                style={{ width: size, height: size, fontSize: size / 4 }}
            >
                {showInitials ? initials : <User size={size / 2} />}
            </div>
        );
    }

    return (
        <div
            className={`relative rounded-full overflow-hidden border-2 border-accent ${className}`}
            style={{ width: size, height: size }}
        >
            <Image
                src={src}
                alt={alt}
                width={size}
                height={size}
                className="object-cover"
                priority
            />
        </div>
    );
}
