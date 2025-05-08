import type { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'StudySmarts',
    short_name: 'StudySmarts',
    description: 'AI-powered learning assistant for dynamic notes, quizzes, and personalized study plans.',
    start_url: '/',
    display: 'standalone',
    background_color: '#333333', // Dark Gray
    theme_color: '#008080', // Teal
    icons: [
      {
        src: '/icon-192x192.png', // Placeholder, ensure you add these icons to /public
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512x512.png', // Placeholder
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
