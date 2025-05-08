import type { ReactNode } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import SiteHeader from '@/components/layout/SiteHeader';
import SiteSidebar from '@/components/layout/SiteSidebar';

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <SidebarProvider defaultOpen={true}>
      <SiteSidebar />
      <div className="flex flex-col flex-1 min-h-screen">
        <SiteHeader />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
