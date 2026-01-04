import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLocation, useNavigation, useFetcher, useLoaderData } from '@remix-run/react';
import {data, type  LinksFunction, type LoaderFunctionArgs } from '@remix-run/node';
import { useMemo, useState, useEffect, createContext, useContext } from 'react';

import './styles/global.css';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { Footer } from './components/layout/Footer';
import  citiesBL  from './server/businessLogic/citiesBusinessLogic';
import type { City } from './types/PayloadTourDataProps';
import { getSession, commitSession } from '~/utilities/sessions';

// Context for sharing cities globally
export const CitiesContext = createContext<{
  cities: City[];
} | null>(null);

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

interface GetCitiesParameters {
  filters: { country: string };
  language?: string;
}

const getCitiesByCountry = async (parameters: GetCitiesParameters) => {
  const formData = new FormData();
  const { filters } = parameters;

  formData.append("action", 'searchCitiesByCountryBusiness');
  formData.append("filters", JSON.stringify(filters));
  formData.append("language", parameters.language || 'es');

  const citiesByCountry = await citiesBL(formData);
  
  return citiesByCountry;
}

const actionsLoader = async (action: string, parameters: GetCitiesParameters) => {
  const ACTIONS = {
    getCitiesByCountry: async () => await getCitiesByCountry(parameters)
  };

  if (action && action in ACTIONS) {
    return ACTIONS[action as keyof typeof ACTIONS]();
  }
  throw new Error('Invalid action');
}

interface LoaderData {
  data: {
    cities: City[];
  };
}

export async function loader({ request }: LoaderFunctionArgs) {
  // Load cities globally for all routes
  const session = await getSession(request.headers.get("Cookie"));
  const filters = session.get("filters") === undefined ? { country: 'mexico' } : session.get("filters") as { country: string };

  const citiesResult = await actionsLoader('getCitiesByCountry', { filters, language: 'es' });
  const cities: City[] = citiesResult.success ? citiesResult.data : [];

  return data(
  {
    cities
  },
  {
    headers: {
      "Set-Cookie": await commitSession(session),
    },
  });
}

export default function App() {
  const location = useLocation();
  const loaderData = useLoaderData<LoaderData>();
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [cities, setCities] = useState<City[]>([]);

  // Validate and store cities from loader
  useEffect(() => {
    const citiesData = loaderData?.data?.cities || [];
    if (citiesData.length > 0) {
      debugger
      setCities(citiesData);
    }
  }, [loaderData]);

  // Detectar si es móvil al montar y cuando cambia el tamaño
  useEffect(() => {
    function checkMobile() {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
    }
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
    <CitiesContext.Provider value={{ cities }}>
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
    </CitiesContext.Provider>
  );
}
