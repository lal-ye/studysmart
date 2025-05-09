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
        mono: ['var(--font-jetbrains-mono)', ...defaultTheme.fontFamily.mono], 
      },
  		colors: {
        // Custom Neobrutalist Palette
        background: 'hsl(var(--background))', // Pale Whale
        foreground: 'hsl(var(--foreground))', // Darker for contrast on Pale Whale
        card: 'hsl(var(--card))', // Moonraker
        'card-foreground': 'hsl(var(--card-foreground))', // Darker for contrast on Moonraker
        popover: 'hsl(var(--popover))', // Moonraker
        'popover-foreground': 'hsl(var(--popover-foreground))', // Darker for contrast on Moonraker
        primary: 'hsl(var(--primary))', // Cabbage
        'primary-foreground': 'hsl(var(--primary-foreground))', // Darker for contrast on Cabbage
        secondary: 'hsl(var(--secondary))', // Slightly desaturated Pale Whale
        'secondary-foreground': 'hsl(var(--secondary-foreground))',
        muted: 'hsl(var(--muted))', // Lighter Pale Whale
        'muted-foreground': 'hsl(var(--muted-foreground))',
        accent: 'hsl(var(--accent))', // Cabbage (can be same as primary)
        'accent-foreground': 'hsl(var(--accent-foreground))',
        destructive: 'hsl(var(--destructive))', // Standard Red
        'destructive-foreground': 'hsl(var(--destructive-foreground))', // White
        border: 'hsl(var(--border))', // Blackish for high contrast
        input: 'hsl(var(--input))', // Input border, same as main border
        ring: 'hsl(var(--ring))', // Slightly darker Cabbage for focus rings
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
  		borderRadius: { 
  			lg: '0.375rem', 
  			md: '0.25rem',
  			sm: '0.125rem',
        none: '0rem', // Neobrutalism often uses sharp corners
  		},
      borderWidth: {
        DEFAULT: '1px',
        '0': '0',
        '2': '2px',
        '3': '3px', 
        '4': '4px',
      },
      boxShadow: { 
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
            '--tw-prose-pre-code': 'hsl(var(--card-foreground))', 
            '--tw-prose-pre-bg': 'hsl(var(--card))', 
            '--tw-prose-th-borders': 'hsl(var(--border))',
            '--tw-prose-td-borders': 'hsl(var(--border))',
            // Dark mode prose styles
            '--tw-prose-invert-body': 'hsl(var(--foreground))', 
            '--tw-prose-invert-headings': 'hsl(var(--foreground))',
            '--tw-prose-invert-links': 'hsl(var(--primary))',
            '--tw-prose-invert-bold': 'hsl(var(--foreground))',
            '--tw-prose-invert-counters': 'hsl(var(--muted-foreground))',
            '--tw-prose-invert-bullets': 'hsl(var(--muted-foreground))',
            '--tw-prose-invert-hr': 'hsl(var(--border))',
            '--tw-prose-invert-quotes': 'hsl(var(--foreground))',
            '--tw-prose-invert-quote-borders': 'hsl(var(--primary))',
            '--tw-prose-invert-captions': 'hsl(var(--muted-foreground))',
            '--tw-prose-invert-code': 'hsl(var(--foreground))',
            '--tw-prose-invert-pre-code': 'hsl(var(--card-foreground))',
            '--tw-prose-invert-pre-bg': 'hsl(var(--card))',
            '--tw-prose-invert-th-borders': 'hsl(var(--border))',
            '--tw-prose-invert-td-borders': 'hsl(var(--border))',
          },
        },
      }),
      gridTemplateColumns: {
        'min-1': 'repeat(auto-fit, minmax(min(100%/1, max(100px, 100%/1)), 1fr))',
        'min-2': 'repeat(auto-fit, minmax(min(100%/2, max(120px, 100%/2)), 1fr))',
        'min-3': 'repeat(auto-fit, minmax(min(100%/3, max(120px, 100%/3)), 1fr))',
        'min-4': 'repeat(auto-fit, minmax(min(100%/4, max(120px, 100%/4)), 1fr))',
        'min-5': 'repeat(auto-fit, minmax(min(100%/5, max(120px, 100%/5)), 1fr))',
      }
  	}
  },
  plugins: [
    require("tailwindcss-animate"),
    require('@tailwindcss/typography'),
  ],
} satisfies Config;