import type { Metadata } from 'next';
import { JetBrains_Mono } from 'next/font/google'; // Changed import
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import AppLayout from '@/components/layout/AppLayout';

// Configure JetBrains Mono
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono', // CSS variable for the font
  weight: ['400', '700'], // Include weights you need
});

export const metadata: Metadata = {
  title: 'StudySmarts',
  description: 'AI-powered learning assistant for dynamic notes, quizzes, and personalized study plans.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${jetbrainsMono.variable} dark`}> {/* Apply JetBrains Mono variable and dark theme */}
      <body className="font-mono bg-background text-foreground"> {/* font-mono will use the CSS variable */}
        <AppLayout>
          {children}
        </AppLayout>
        <Toaster />
      </body>
    </html>
  );
}
