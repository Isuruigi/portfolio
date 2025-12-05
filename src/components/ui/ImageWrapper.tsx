"use client";

import Image from 'next/image';
import { useState } from 'react';

interface ImageWrapperProps {
    src: string;
    alt: string;
    width: number;
    height: number;
    className?: string;
    priority?: boolean;
}

export default function ImageWrapper({
    src,
    alt,
    width,
    height,
    className = '',
    priority = false
}: ImageWrapperProps) {
    const [isLoading, setIsLoading] = useState(true);

    return (
        <div className={`overflow-hidden ${className}`}>
            <Image
                src={src}
                alt={alt}
                width={width}
                height={height}
                priority={priority}
                className={`
          duration-700 ease-in-out
          ${isLoading ? 'scale-110 blur-lg' : 'scale-100 blur-0'}
        `}
                onLoad={() => setIsLoading(false)}
            />
        </div>
    );
}
