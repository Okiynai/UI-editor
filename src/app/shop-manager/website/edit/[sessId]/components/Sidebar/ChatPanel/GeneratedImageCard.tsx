import { Download } from 'lucide-react';

interface BuilderGeneratedImageCardProps {
  imageUrl?: string;
  loading?: boolean;
  prompt?: string;
}

export const BuilderGeneratedImageCard = ({ imageUrl, loading, prompt }: BuilderGeneratedImageCardProps) => {
  return (
    <div className="w-full max-w-md">
      <div className="relative overflow-hidden rounded-lg group border border-gray-200">
        {/* Loading shimmer */}
        {loading && (
          <div className="w-full aspect-[4/3] animate-pulse bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:400%_100%]" />
        )}

        {/* eslint-disable-next-line @next/next/no-img-element */}
        {!loading && imageUrl && (
          <img
            src={imageUrl}
            alt="Generated image"
            className="w-full h-auto object-contain"
          />
        )}

        {/* Bottom overlay and download button (only when image is ready) */}
        {!loading && imageUrl && (
          <>
            {/* Subtle darker effect at the bottom (only on hover) */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            {/* Download icon button at bottom-right (only on hover) */}
            <a
              href={imageUrl}
              download={`generated-image-${Date.now()}.png`}
              className="absolute bottom-2 right-2 inline-flex items-center justify-center w-7 h-7 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110 hover:bg-black/10 hover:backdrop-blur-sm"
              title="Download image"
            >
              <Download className="w-4 h-4 text-gray-200 group-hover:text-white drop-shadow" />
            </a>
          </>
        )}
      </div>

      {/* Optional prompt display */}
      {prompt && !loading && (
        <div className="mt-2 text-xs text-gray-600 text-center italic">
          "{prompt.length > 60 ? prompt.substring(0, 60) + '...' : prompt}"
        </div>
      )}
    </div>
  );
};
