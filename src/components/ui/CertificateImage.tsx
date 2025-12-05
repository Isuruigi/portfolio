"use client";

import Image from 'next/image';
import { useState } from 'react';
import { FileText, ExternalLink, X } from 'lucide-react';

interface CertificateImageProps {
    src?: string;
    alt: string;
    credentialId?: string;
    verifyUrl?: string;
    className?: string;
}

export default function CertificateImage({
    src,
    alt,
    credentialId,
    verifyUrl,
    className = ''
}: CertificateImageProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [showFullscreen, setShowFullscreen] = useState(false);

    // If no image or error, show placeholder
    if (!src || hasError) {
        return (
            <div className={`
        relative w-full h-48 
        bg-gradient-to-br from-primary/5 to-accent/5
        rounded-lg overflow-hidden
        flex flex-col items-center justify-center
        border border-border
        ${className}
      `}>
                <FileText className="w-12 h-12 text-muted mb-2" />
                <p className="text-sm text-muted">Certificate</p>
                {credentialId && (
                    <p className="text-xs text-muted font-mono mt-1">
                        ID: {credentialId.substring(0, 12)}...
                    </p>
                )}
            </div>
        );
    }

    return (
        <>
            {/* Certificate Image */}
            <div
                className={`
          relative w-full h-48 
          rounded-lg overflow-hidden
          border border-border
          cursor-pointer
          group
          ${className}
        `}
                onClick={() => setShowFullscreen(true)}
            >
                <Image
                    src={src}
                    alt={alt}
                    fill
                    className={`
            object-cover
            transition-all duration-700 ease-in-out
            group-hover:scale-105
            ${isLoading ? 'scale-110 blur-lg' : 'scale-100 blur-0'}
          `}
                    onLoad={() => setIsLoading(false)}
                    onError={() => setHasError(true)}
                />

                {/* Overlay on hover */}
                <div className="
          absolute inset-0 
          bg-black/60 
          opacity-0 group-hover:opacity-100 
          transition-opacity duration-200
          flex items-center justify-center
          gap-2
        ">
                    <ExternalLink className="w-6 h-6 text-white" />
                    <span className="text-white text-sm font-medium">View Certificate</span>
                </div>

                {/* Loading state */}
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-card">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                )}
            </div>

            {/* Fullscreen Modal */}
            {showFullscreen && (
                <div
                    className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
                    onClick={() => setShowFullscreen(false)}
                >
                    <div className="relative max-w-6xl max-h-[90vh] w-full">
                        <button
                            className="absolute -top-12 right-0 text-white hover:text-primary transition-colors flex items-center gap-2"
                            onClick={() => setShowFullscreen(false)}
                        >
                            <X className="w-6 h-6" />
                            <span>Close</span>
                        </button>
                        <Image
                            src={src}
                            alt={alt}
                            width={1200}
                            height={900}
                            className="w-full h-auto rounded-lg"
                            priority
                        />
                        {verifyUrl && (
                            <a
                                href={verifyUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="absolute bottom-4 right-4 bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:opacity-90 transition-opacity"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <ExternalLink className="w-4 h-4" />
                                Verify on Provider Site
                            </a>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
