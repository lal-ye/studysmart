
import type { ReactNode } from 'react';
import Link from 'next/link';

export interface NeobrutalistButtonProps {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  backgroundColor?: string; // e.g., 'bg-pink-500'
  textColor?: string; // e.g., 'text-black'
  borderColor?: string; // e.g., 'border-black'
  shadowColor?: string; // e.g., 'shadow-[3px_3px_0px_#000000]'
  className?: string;
  ariaLabel?: string;
}

export default function NeobrutalistButton({
  children,
  onClick,
  href,
  backgroundColor = 'bg-fuchsia-500', // Default vibrant magenta/fuchsia
  textColor = 'text-black',
  borderColor = 'border-black',
  shadowColor = 'shadow-[3px_3px_0px_#000000]',
  className = '',
  ariaLabel,
}: NeobrutalistButtonProps) {
  const baseClasses = `
    ${backgroundColor} ${textColor} ${borderColor} ${shadowColor}
    border-2
    px-5 py-2.5
    font-sans font-bold 
    text-sm uppercase tracking-wider
    inline-block 
    transition-all duration-100 ease-out
    hover:bg-opacity-90 hover:shadow-[5px_5px_0px_#000000] hover:-translate-x-0.5 hover:-translate-y-0.5
    active:translate-x-[3px] active:translate-y-[3px] active:shadow-none
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black
  `;

  if (href) {
    return (
      <Link href={href} passHref>
        <a
          className={`${baseClasses} ${className}`}
          role="button"
          aria-label={ariaLabel || (typeof children === 'string' ? children : 'navigation link')}
        >
          {children}
        </a>
      </Link>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`${baseClasses} ${className}`}
      type="button"
      aria-label={ariaLabel || (typeof children === 'string' ? children : 'button')}
    >
      {children}
    </button>
  );
}
