
'use client';

import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { UserCircle, Settings } from 'lucide-react'; 

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b-3 border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-neo-md"> {/* Added Neobrutalist border and shadow */}
      <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0 px-4 md:px-6">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="md:hidden" aria-label="Toggle sidebar" />
          <h1 className="text-xl font-bold text-primary hidden sm:block">StudySmarts</h1>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-4">
          <nav className="flex items-center space-x-1">
            <Button variant="ghost" size="icon" aria-label="User Profile" className="shadow-none border-transparent active:shadow-none"> {/* Ghost buttons typically no shadow/border */}
              <UserCircle className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Settings" className="shadow-none border-transparent active:shadow-none">
              <Settings className="h-5 w-5" />
            </Button>
          </nav>
        </div>
      </div>
    </header>
  );
}
