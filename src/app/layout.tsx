import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans'; // Corrected import for GeistSans
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import AppLayout from '@/components/layout/AppLayout';

const geistSans = GeistSans({ 
  variable: '--font-geist-sans',
  subsets: ['latin'],
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
    <html lang="en" className="dark"> {/* Apply dark theme by default */}
      <body className={`${geistSans.variable} font-sans`}> {/* Use --font-geist-sans from variable */}
        <AppLayout>
          {children}
        </AppLayout>
        <Toaster />
      </body>
    </html>
  );
}
