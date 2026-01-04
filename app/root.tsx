import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLocation, useLoaderData } from '@remix-run/react';
import {data, type  LinksFunction, type LoaderFunctionArgs } from '@remix-run/node';
import { useMemo, useState, useEffect, createContext } from 'react';

import './styles/global.css';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { Footer } from './components/layout/Footer';
import  citiesBL  from './server/businessLogic/citiesBusinessLogic';
import type { City } from './store/slices/citiesSlice';
import { getSession, commitSession } from '~/utilities/sessions';
import { useAppDispatch } from '~/store/hooks';
import { fetchCitiesSuccess } from '~/store/slices/citiesSlice';

// Context for sharing cities globally
export const CitiesContext = createContext<{
  cities: City[];
} | null>(null);

// Client component to dispatch cities to Redux
function CitiesReduxDispatcher({ cities }: { cities: City[] }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    console.log('CitiesReduxDispatcher useEffect triggered, cities:', cities);
    if (cities.length > 0) {
      console.log('Dispatching cities to Redux:', cities);
      dispatch(fetchCitiesSuccess(cities));
    } else {
      console.log('No cities to dispatch');
    }
  }, [cities, dispatch]);

  return null;
}

// Wrapper to only render on client
function ClientOnlyCitiesDispatcher({ cities }: { cities: City[] }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null;
  }

  return <CitiesReduxDispatcher cities={cities} />;
}

// Wrapper to only render Sidebar on client
function ClientOnlySidebar({ isOpen, isCollapsed, onToggle }: { isOpen: boolean; isCollapsed: boolean; onToggle: () => void }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null;
  }

  return <Sidebar isOpen={isOpen} isCollapsed={isCollapsed} onToggle={onToggle} />;
}

// Wrapper to only render Header on client
function ClientOnlyHeader({ title, isSidebarOpen, isSidebarCollapsed, onToggleSidebar, onToggleSidebarCollapse }: {
  title: string;
  isSidebarOpen: boolean;
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  onToggleSidebarCollapse: () => void;
}) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return <div style={{ height: 'var(--header-height)', backgroundColor: 'var(--color-white)' }} />;
  }

  return (
    <Header
      title={title}
      isSidebarOpen={isSidebarOpen}
      isSidebarCollapsed={isSidebarCollapsed}
      onToggleSidebar={onToggleSidebar}
      onToggleSidebarCollapse={onToggleSidebarCollapse}
    />
  );
}

// Wrapper to only render Footer on client
function ClientOnlyFooter() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return <div style={{ height: '80px', backgroundColor: 'var(--color-white)' }} />;
  }

  return <Footer />;
}

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
  console.log('Cities result from loader:', citiesResult);
  console.log('Cities array:', cities);

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

  // Load cities into state
  useEffect(() => {
    const citiesData = loaderData?.data?.cities || [];
    console.log('Cities data from loader in App:', citiesData);
    if (citiesData.length > 0) {
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
      <ClientOnlyCitiesDispatcher cities={cities} />
      <div style={{ minHeight: '100vh' }}>
      <ClientOnlySidebar isOpen={isSidebarOpen} isCollapsed={isSidebarCollapsed} onToggle={toggleSidebar} />
      <div style={{ marginLeft: isMobile ? 0 : (isSidebarCollapsed ? '80px' : '280px'), transition: 'margin-left var(--transition-base)' }}>
        <ClientOnlyHeader 
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
        <ClientOnlyFooter />
      </div>
    </div>
    </CitiesContext.Provider>
  );
}
