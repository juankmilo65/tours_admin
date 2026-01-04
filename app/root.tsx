import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLocation, useLoaderData } from '@remix-run/react';
import { data, type LinksFunction, type LoaderFunctionArgs } from '@remix-run/node';
import { useMemo, useState, useEffect, createContext } from 'react';

import './styles/global.css';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { Footer } from './components/layout/Footer';
import { GlobalLoader } from './components/ui/GlobalLoader';
import citiesBL from './server/businessLogic/citiesBusinessLogic';
import countriesBL from './server/businessLogic/countriesBusinessLogic';
import type { City } from './store/slices/citiesSlice';
import type { Country } from './store/slices/countriesSlice';
import { getSession, commitSession } from '~/utilities/sessions';
import { useAppDispatch } from '~/store/hooks';
import { fetchCitiesSuccess } from '~/store/slices/citiesSlice';
import { fetchCountriesSuccess, setSelectedCountryByCode } from '~/store/slices/countriesSlice';

// Context for sharing cities and countries globally
export const CitiesContext = createContext<{
  cities: City[];
  countries: Country[];
} | null>(null);

// Client component to dispatch cities and countries to Redux
function CitiesReduxDispatcher({ cities, countries, selectedCountryCode }: { cities: City[], countries: Country[], selectedCountryCode: string }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    // Always update cities, even if empty (important for country changes)
    dispatch(fetchCitiesSuccess(cities));
    
    if (countries.length > 0) {
      dispatch(fetchCountriesSuccess(countries));
    }
    
    // Always set selected country in Redux
    if (selectedCountryCode) {
      dispatch(setSelectedCountryByCode(selectedCountryCode));
    }
  }, [cities, countries, selectedCountryCode, dispatch]);

  return null;
}

// Wrapper to only render on client
function ClientOnlyCitiesDispatcher({ cities, countries, selectedCountryCode }: { cities: City[], countries: Country[], selectedCountryCode: string }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null;
  }

  return <CitiesReduxDispatcher cities={cities} countries={countries} selectedCountryCode={selectedCountryCode} />;
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

// Wrapper to only render GlobalLoader on client
function ClientOnlyGlobalLoader() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null;
  }

  return <GlobalLoader />;
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
  filters: { countryId: string };
  language?: string;
}

const getCitiesByCountryId = async (parameters: GetCitiesParameters) => {
  const formData = new FormData();
  const { filters } = parameters;

  formData.append("action", 'getCitiesByCountryIdBusiness');
  formData.append("filters", JSON.stringify(filters));
  formData.append("language", parameters.language || 'es');

  const citiesByCountry = await citiesBL(formData);
  
  return citiesByCountry;
}

interface GetCountriesParameters {
  language?: string;
}

const getCountries = async (parameters: GetCountriesParameters) => {
  const formData = new FormData();

  formData.append("action", 'getCountriesBusiness');
  formData.append("language", parameters.language || 'es');

  const countries = await countriesBL(formData);
  
  return countries;
}

type ActionParameters = GetCitiesParameters | GetCountriesParameters;

const actionsLoader = async (action: string, parameters: ActionParameters) => {
  const ACTIONS = {
    getCitiesByCountryId: async () => await getCitiesByCountryId(parameters as GetCitiesParameters),
    getCountries: async () => await getCountries(parameters as GetCountriesParameters)
  };

  if (action && action in ACTIONS) {
    return ACTIONS[action as keyof typeof ACTIONS]();
  }
  throw new Error('Invalid action');
}

interface LoaderData {
  data: {
    cities: City[];
    countries: Country[];
    selectedCountryId: string;
    selectedCountryCode: string;
  };
}

export async function loader({ request }: LoaderFunctionArgs) {
  // Load cities and countries globally for all routes
  const session = await getSession(request.headers.get("Cookie"));
  
  // Check if countries are already in session (to avoid reloading)
  const cachedCountries = session.get("cachedCountries") as Country[] | undefined;
  const selectedCountryId = session.get("selectedCountryId") as string | undefined;
  const selectedCountryCode = session.get("selectedCountryCode") as string | undefined;
  
  let countries: Country[] = [];
  
  // Only fetch countries if not cached
  if (cachedCountries && cachedCountries.length > 0) {
    countries = cachedCountries;
  } else {
    // Fetch countries from API - data comes already formatted
    const countriesResult = await actionsLoader('getCountries', { language: 'es' });
    countries = countriesResult.success ? countriesResult.data : [];
    
    // Cache countries in session
    session.set("cachedCountries", countries);
  }
  
  // Determine the country to filter by
  // Priority: 1. selectedCountryId from session, 2. First country from list (default to Mexico)
  let countryId = selectedCountryId;
  let countryCode = selectedCountryCode;
  
  if (!countryId && countries.length > 0) {
    // Use first country from the list (default to Mexico if it exists)
    const mexicoCountry = countries.find(c => c.name.toLowerCase() === 'mexico');
    const defaultCountry = mexicoCountry || countries[0];
    countryId = defaultCountry?.id;
    countryCode = defaultCountry?.code;
    
    // Save the default selection to session
    session.set("selectedCountryId", countryId);
    session.set("selectedCountryCode", countryCode);
  }
  
  let cities: City[] = [];
  
  if (countryId) {
    const filters = { countryId };
    // Fetch cities
    const citiesResult = await actionsLoader('getCitiesByCountryId', { filters, language: 'es' });
    cities = citiesResult.success ? citiesResult.data : [];
  }
  
  return data(
  {
    cities,
    countries,
    selectedCountryId: countryId || '',
    selectedCountryCode: countryCode || ''
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
  const [countries, setCountriesState] = useState<Country[]>([]);
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>('');

  // Load cities and countries into state
  useEffect(() => {
    const citiesData = loaderData?.data?.cities || loaderData?.cities || [];
    const countriesData = loaderData?.data?.countries || loaderData?.countries || [];
    const countryCode = loaderData?.data?.selectedCountryCode || loaderData?.selectedCountryCode || '';

    if (citiesData.length > 0) {
      setCities(citiesData);
    }
    
    if (countriesData.length > 0) {
      setCountriesState(countriesData);
    }
    
    if (countryCode) {
      setSelectedCountryCode(countryCode);
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
    <CitiesContext.Provider value={{ cities, countries }}>
      <ClientOnlyCitiesDispatcher cities={cities} countries={countries} selectedCountryCode={selectedCountryCode} />
      <ClientOnlyGlobalLoader />
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
