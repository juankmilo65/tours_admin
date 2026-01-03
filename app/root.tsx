import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLocation } from '@remix-run/react';
import type { LinksFunction } from '@remix-run/node';
import { useMemo, useState, useEffect } from 'react';

import './styles/global.css';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { Footer } from './components/layout/Footer';

export const links: LinksFunction = () => [
  { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
  { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
  { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body style={{ backgroundColor: 'var(--color-neutral-50)' }}>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Solo para móvil
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false); // Solo para desktop
  const [isMobile, setIsMobile] = useState(false);

  // Check if screen is mobile
  useEffect(() => {
    function checkMobile() {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      // Auto-close sidebar on mobile
      if (mobile && isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    }
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [isSidebarOpen]);

  // Toggle sidebar (mobile)
  function toggleSidebar() {
    setIsSidebarOpen(!isSidebarOpen);
  }

  // Toggle sidebar collapse (desktop)
  function toggleSidebarCollapse() {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  }

  // Dynamic page title based on current path
  const pageTitle = useMemo((): string => {
    const pathMap: Record<string, string> = {
      '/': 'Dashboard',
      '/dashboard': 'Dashboard',
      '/tours': 'Tours Management',
      '/cities': 'Cities',
      '/categories': 'Categories',
      '/news': 'News',
      '/offers': 'Offers',
      '/reservations': 'Reservations',
      '/users': 'Users & Roles',
      '/settings': 'Settings',
    };
    
    // Check exact path match first
    if (pathMap[location.pathname]) {
      return pathMap[location.pathname]!;
    }
    
    // Check for partial matches (e.g., /tours/123)
    const matchedPath = Object.keys(pathMap).find(path => 
      location.pathname.startsWith(`${path}/`)
    );
    
    if (matchedPath && pathMap[matchedPath]) {
      return pathMap[matchedPath]!;
    }
    
    return 'Tours Admin';
  }, [location.pathname]);

  return (
    <div style={{ minHeight: '100vh' }}>
      <Sidebar isOpen={isSidebarOpen} isCollapsed={isSidebarCollapsed} onToggle={toggleSidebar} />
      <div style={{ marginLeft: isMobile ? 0 : (isSidebarCollapsed ? '80px' : '280px'), transition: 'margin-left var(--transition-base)' }}>
        <Header 
          title={pageTitle} 
          isSidebarOpen={isSidebarOpen} 
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={toggleSidebar} 
          onToggleSidebarCollapse={toggleSidebarCollapse}
        />
        <main 
          style={{
            paddingTop: 'var(--header-height)',
            paddingBottom: '80px',
            paddingLeft: 'var(--space-6)',
            paddingRight: 'var(--space-6)',
          }}
        >
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
}
