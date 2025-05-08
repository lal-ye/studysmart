import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";

export default {
    darkMode: ["class"],
    content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
  	extend: {
      fontFamily: {
        mono: ['var(--font-jetbrains-mono)', ...defaultTheme.fontFamily.mono], // Changed to mono and JetBrains Mono
      },
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
  		borderRadius: { // Neobrutalism often uses sharper corners, or slightly rounded
  			lg: '0.375rem', // Slightly less rounded than default 0.5rem
  			md: '0.25rem',
  			sm: '0.125rem',
        none: '0rem',
  		},
      borderWidth: {
        DEFAULT: '1px',
        '0': '0',
        '2': '2px',
        '3': '3px', // For Neobrutalist borders
        '4': '4px',
      },
      boxShadow: { // Custom Neobrutalist shadows
        'neo-sm': '2px 2px 0px hsl(var(--border))',
        'neo-md': '4px 4px 0px hsl(var(--border))',
        'neo-lg': '6px 6px 0px hsl(var(--border))',
        'neo-xl': '8px 8px 0px hsl(var(--border))',
        'neo-none': 'none',
      },
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		},
      typography: ({ theme }: { theme: any }) => ({
        DEFAULT: {
          css: {
            '--tw-prose-body': 'hsl(var(--foreground))',
            '--tw-prose-headings': 'hsl(var(--foreground))',
            '--tw-prose-lead': 'hsl(var(--foreground))',
            '--tw-prose-links': 'hsl(var(--primary))',
            '--tw-prose-bold': 'hsl(var(--foreground))',
            '--tw-prose-counters': 'hsl(var(--muted-foreground))',
            '--tw-prose-bullets': 'hsl(var(--muted-foreground))',
            '--tw-prose-hr': 'hsl(var(--border))',
            '--tw-prose-quotes': 'hsl(var(--foreground))',
            '--tw-prose-quote-borders': 'hsl(var(--primary))',
            '--tw-prose-captions': 'hsl(var(--muted-foreground))',
            '--tw-prose-code': 'hsl(var(--foreground))',
            '--tw-prose-pre-code': 'hsl(var(--primary-foreground))',
            '--tw-prose-pre-bg': 'hsl(var(--primary))', // Or a dark neutral
            '--tw-prose-th-borders': 'hsl(var(--border))',
            '--tw-prose-td-borders': 'hsl(var(--border))',
            // Dark mode prose can be adjusted via the .dark class in globals.css if needed
            '--tw-prose-invert-body': 'hsl(var(--foreground))', // In dark mode, foreground is light
            '--tw-prose-invert-headings': 'hsl(var(--foreground))',
            '--tw-prose-invert-links': 'hsl(var(--primary))',
             '--tw-prose-invert-pre-code': 'hsl(var(--card-foreground))', 
            '--tw-prose-invert-pre-bg': 'hsl(var(--card))',
          },
        },
      }),
  	}
  },
  plugins: [
    require("tailwindcss-animate"),
    require('@tailwindcss/typography'),
  ],
} satisfies Config;
