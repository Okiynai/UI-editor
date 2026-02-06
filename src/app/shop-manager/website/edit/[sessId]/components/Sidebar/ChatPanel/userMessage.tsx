import { useEffect, useRef, useState } from "react";

export const UserMessage = ({ message, imageUrls }: { message: string; imageUrls?: string[] }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const messageRef = useRef<HTMLDivElement>(null);
    const [needsExpansion, setNeedsExpansion] = useState(false);

    useEffect(() => {
        if (messageRef.current) {
            const element = messageRef.current;
            // Check if content exceeds 300px (natural max height)
            const needsExpansionCheck = element.scrollHeight > 300;
            setNeedsExpansion(needsExpansionCheck);
        }
    }, [message]);

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (needsExpansion && !isExpanded) {
            setIsExpanded(true);
        }
    };

    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (messageRef.current && !messageRef.current.contains(event.target as Node)) {
                setIsExpanded(false);
            }
        };

        if (isExpanded) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isExpanded]);

    return (
        <div>
            <div
                className={`rounded-lg p-2 border border-gray-100 bg-gray-50/60 transition-all duration-200 relative ${
                    isExpanded ? 'max-h-none' : 'max-h-[280px] overflow-hidden'
                } ${
                    needsExpansion && !isExpanded
                        ? 'cursor-pointer hover:bg-gray-100/80'
                        : ''
                }`}
                onClick={handleClick}
                ref={messageRef}
            >
                <p className='text-xs text-gray-700 leading-snug break-inside-avoid'>{message}</p>

                {/* Shadow indicator */}
                {needsExpansion && !isExpanded && (
                    <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-gray-50/80 via-gray-50/40 to-transparent pointer-events-none" />
                )}
            </div>

            {/* Images outside the message div */}
            {imageUrls && imageUrls.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                    {imageUrls.map((url: string, idx: number) => (
                        <div key={`${url}-${idx}`} className="w-16 h-10 rounded-md overflow-hidden bg-gray-100">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt="uploaded" className="w-full h-full object-cover" />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};