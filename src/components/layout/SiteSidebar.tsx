
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  LayoutDashboard,
  BarChart3,
  BookOpenText,
  LogOut,
  Folders,
  // Paintbrush, // Icon for Neobrutalism Test - REMOVED
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Dashboard (Subjects)', icon: Folders },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  // { href: '/neobrutalism-test', label: 'Neobrutalism Test', icon: Paintbrush, devOnly: true }, // REMOVED
];

export default function SiteSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar side="left" variant="sidebar" collapsible="icon" className="border-r-3 border-border shadow-neo-lg">
      <SidebarHeader className="p-4">
        <Link href="/" className="flex items-center gap-2 text-primary" aria-label="StudySmarts Dashboard">
          <BookOpenText className="h-7 w-7" aria-hidden="true" />
          <span className="text-xl font-bold group-data-[collapsible=icon]:hidden">
            StudySmarts
          </span>
        </Link>
      </SidebarHeader>
      <Separator />
      <SidebarContent className="flex-1 p-2">
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <Link href={item.href} legacyBehavior passHref>
                <SidebarMenuButton
                  asChild
                  className={cn(
                    'justify-start shadow-neo-sm active:shadow-neo-none active:active-neo-translate', // Added Neobrutalist button styles
                    (pathname === item.href || (item.href === '/' && pathname.startsWith('/subjects'))) && 'bg-sidebar-accent text-sidebar-accent-foreground',
                     item.devOnly && process.env.NODE_ENV !== 'development' && 'hidden' 
                  )}
                  tooltip={item.label}
                  aria-current={pathname === item.href ? 'page' : undefined}
                >
                  <a>
                    <item.icon className="h-5 w-5" aria-hidden="true" />
                    <span className="group-data-[collapsible=icon]:hidden">
                      {item.label}
                    </span>
                  </a>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <Separator />
      <SidebarFooter className="p-2">
        <Button variant="ghost" className="w-full justify-start gap-2 group-data-[collapsible=icon]:justify-center shadow-neo-sm active:shadow-neo-none active:active-neo-translate" aria-label="Logout and return to the login screen">
          <LogOut className="h-5 w-5" aria-hidden="true" />
          <span className="group-data-[collapsible=icon]:hidden">Logout</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
