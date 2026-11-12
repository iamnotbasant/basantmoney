
import type { Config } from "tailwindcss";

const defaultTheme = require('tailwindcss/defaultTheme');

export default {
	darkMode: ["class"],
	content: [
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
        rounded: ['var(--font-charts-rounded)', 'SF Pro Rounded', 'ui-rounded', 'system-ui', 'sans-serif'],
      },
			screens: {
				'xs': '375px',
				...defaultTheme.screens,
			},
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
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
				},
				// Mebius Chart Theme Tokens
				'surface-white': 'var(--surface-white)',
				'surface-base': 'var(--surface-base)',
				'surface-disable': 'var(--surface-disable)',
				'surface-soft': 'var(--surface-soft)',
				'surface-subdued': 'var(--surface-subdued)',
				'surface-loud': 'var(--surface-loud)',
				'surface-muted': 'var(--surface-muted)',
				'surface-popup': 'var(--surface-popup)',
				'fg-loud': 'var(--fg-loud)',
				'fg-normal': 'var(--fg-normal)',
				'fg-soft': 'var(--fg-soft)',
				'fg-disable': 'var(--fg-disable)',
				'fg-white': 'var(--fg-white)',
				'border-soft': 'var(--border-soft)',
				'border-sub': 'var(--border-sub)',
				'border-white': 'var(--border-white)',
				'border-loud': 'var(--border-loud)',
				'border-normal': 'var(--border-normal)',
				'icon-loud': 'var(--icon-loud)',
				'icon-normal': 'var(--icon-normal)',
				'icon-soft': 'var(--icon-soft)',
				'icon-disable': 'var(--icon-disable)',
				'primary-blue': {
					50: 'var(--primary-blue-50)',
					100: 'var(--primary-blue-100)',
					200: 'var(--primary-blue-200)',
					300: 'var(--primary-blue-300)',
					400: 'var(--primary-blue-400)',
					500: 'var(--primary-blue-500)',
					600: 'var(--primary-blue-600)',
					700: 'var(--primary-blue-700)',
					800: 'var(--primary-blue-800)',
				},
				'primary-green': {
					50: 'var(--primary-green-50)',
					100: 'var(--primary-green-100)',
					200: 'var(--primary-green-200)',
					300: 'var(--primary-green-300)',
					400: 'var(--primary-green-400)',
					500: 'var(--primary-green-500)',
					600: 'var(--primary-green-600)',
					700: 'var(--primary-green-700)',
					800: 'var(--primary-green-800)',
					900: 'var(--primary-green-900)',
				},
				'primary-orange': {
					50: 'var(--primary-orange-50)',
					100: 'var(--primary-orange-100)',
					200: 'var(--primary-orange-200)',
					300: 'var(--primary-orange-300)',
					400: 'var(--primary-orange-400)',
					500: 'var(--primary-orange-500)',
					600: 'var(--primary-orange-600)',
					700: 'var(--primary-orange-700)',
				},
				'primary-purple': {
					50: 'var(--primary-purple-50)',
					100: 'var(--primary-purple-100)',
					200: 'var(--primary-purple-200)',
					300: 'var(--primary-purple-300)',
					400: 'var(--primary-purple-400)',
					500: 'var(--primary-purple-500)',
					600: 'var(--primary-purple-600)',
					700: 'var(--primary-purple-700)',
				},
				'primary-yellow': {
					50: 'var(--primary-yellow-50)',
					100: 'var(--primary-yellow-100)',
					300: 'var(--primary-yellow-300)',
					400: 'var(--primary-yellow-400)',
					500: 'var(--primary-yellow-500)',
				},
				'error': {
					50: 'var(--error-50)',
					100: 'var(--error-100)',
					200: 'var(--error-200)',
					500: 'var(--error-500)',
					600: 'var(--error-600)',
				},
				'accent-light-blue': {
					500: 'var(--accent-light-blue-500)',
					700: 'var(--accent-light-blue-700)',
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			spacing: {
				'safe-top': 'env(safe-area-inset-top)',
				'safe-bottom': 'env(safe-area-inset-bottom)',
				'safe-left': 'env(safe-area-inset-left)',
				'safe-right': 'env(safe-area-inset-right)',
			},
			minHeight: {
				'touch': '44px',
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
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;

