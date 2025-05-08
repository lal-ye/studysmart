
import Image from 'next/image';
import type { NeobrutalistButtonProps } from './NeobrutalistButton';
import NeobrutalistButton from './NeobrutalistButton';

export interface NeobrutalistCardProps {
  title: string;
  description: string;
  imageUrl?: string;
  imageAlt?: string;
  buttonProps?: NeobrutalistButtonProps;
  backgroundColor?: string; // e.g., 'bg-yellow-400'
  textColor?: string; // e.g., 'text-black'
  borderColor?: string; // e.g., 'border-black'
  shadowColor?: string; // e.g., 'shadow-[7px_7px_0px_#000000]'
}

export default function NeobrutalistCard({
  title,
  description,
  imageUrl,
  imageAlt = 'Card image',
  buttonProps,
  backgroundColor = 'bg-yellow-300', // Default vibrant yellow
  textColor = 'text-black',
  borderColor = 'border-black',
  shadowColor = 'shadow-[7px_7px_0px_#000000]',
}: NeobrutalistCardProps) {
  return (
    <div
      className={`
        ${backgroundColor} ${textColor} ${borderColor} ${shadowColor}
        border-[3px] 
        p-6 
        w-full sm:w-80 md:w-96 
        flex flex-col
        transition-all duration-150 ease-in-out
        hover:shadow-[10px_10px_0px_#000000] hover:-translate-x-1 hover:-translate-y-1
      `}
      role="article"
      aria-labelledby={`card-title-${title.replace(/\s+/g, '-').toLowerCase()}`}
    >
      {imageUrl && (
        <div className="relative w-full h-48 mb-4 border-2 border-black" data-ai-hint="abstract background">
          <Image
            src={imageUrl}
            alt={imageAlt}
            layout="fill"
            objectFit="cover"
            className="transform transition-transform duration-300 hover:scale-105"
          />
        </div>
      )}
      <h3
        id={`card-title-${title.replace(/\s+/g, '-').toLowerCase()}`}
        // Using GeistSans which is already in the project. For true Neobrutalism, 'Space Grotesk' or similar could be added.
        className="font-sans font-extrabold text-2xl mb-3 break-words" 
      >
        {title}
      </h3>
      <p className="font-sans text-base leading-relaxed mb-4 flex-grow">
        {description}
      </p>
      {buttonProps && (
        <div className="mt-auto">
          <NeobrutalistButton {...buttonProps}>
            {buttonProps.children}
          </NeobrutalistButton>
        </div>
      )}
    </div>
  );
}
