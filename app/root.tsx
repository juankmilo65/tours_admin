import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLocation,
  useLoaderData,
  Navigate,
} from '@remix-run/react';
import { data, redirect, type LinksFunction, type LoaderFunctionArgs } from '@remix-run/node';
import { useMemo, useState, useEffect, createContext, type ReactNode } from 'react';
import React from 'react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { makeStore, makePersistor } from './store';

import './styles/global.css';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { Footer } from './components/layout/Footer';
import { GlobalLoader } from './components/ui/GlobalLoader';
import { LogoutModal } from './components/ui/LogoutModal';
import { ModalRoot } from './components/ui/Modal';
import { useAppSelector } from '~/store/hooks';
import { selectIsAuthenticated, selectIsOtpVerified } from './store/slices/authSlice';
import citiesBL from './server/businessLogic/citiesBusinessLogic';
import countriesBL from './server/businessLogic/countriesBusinessLogic';
import type { City } from './store/slices/citiesSlice';
import type { Country } from './store/slices/countriesSlice';
import { getSession, commitSession } from '~/utilities/sessions';
import { useAppDispatch } from '~/store/hooks';
import { fetchCitiesSuccess } from './store/slices/citiesSlice';
import { fetchCountriesSuccess, setSelectedCountryByCode } from './store/slices/countriesSlice';
import { setAuthenticatedFromServer } from './store/slices/authSlice';

// Context for sharing cities and countries globally
export const CitiesContext = createContext<{
  cities: City[];
  countries: Country[];
} | null>(null);

// Client component to sync loader data with Redux
function DataSyncDispatcher({
  cities,
  countries,
  selectedCountryCode,
  isAuthenticated,
  authToken,
}: {
  cities: City[];
  countries: Country[];
  selectedCountryCode: string;
  isAuthenticated: boolean;
  authToken: string | null;
}) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    // Sync countries to Redux - always sync, even if empty
    dispatch(fetchCountriesSuccess(countries));

    // Sync cities to Redux - always sync, even if empty
    dispatch(fetchCitiesSuccess(cities));

    // Set selected country
    if (
      selectedCountryCode !== null &&
      selectedCountryCode !== undefined &&
      selectedCountryCode !== ''
    ) {
      dispatch(setSelectedCountryByCode(selectedCountryCode));
    }

    // Sync authentication state from server
    // If server says not authenticated, clear client state
    // If server says authenticated, sync token to Redux and localStorage
    dispatch(setAuthenticatedFromServer({ isAuthenticated, authToken }));
  }, [cities, countries, selectedCountryCode, isAuthenticated, authToken, dispatch]);

  return null;
}

// AuthGuard component to protect routes that require full authentication (token + OTP)
function AuthGuard({ children }: { children: ReactNode }): ReactNode {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const isOtpVerified = useAppSelector(selectIsOtpVerified);
  const location = useLocation();

  // If not authenticated or OTP not verified, redirect to login
  if (!isAuthenticated || !isOtpVerified) {
    // Allow access to public routes (/, /register, /newPassword, /forgot-password)
    if (
      location.pathname === '/' ||
      location.pathname === '/register' ||
      location.pathname === '/newPassword' ||
      location.pathname === '/forgot-password'
    ) {
      return children;
    }
    // For protected routes, redirect to login
    return <Navigate to="/" replace />;
  }

  return children;
}
function ClientOnlySidebar({
  isOpen,
  isCollapsed,
  onToggle,
}: {
  isOpen: boolean;
  isCollapsed: boolean;
  onToggle: () => void;
}): ReactNode {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Defer setState to avoid cascading renders
    const timeoutId = window.setTimeout(() => {
      setIsClient(true);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  if (!isClient) {
    return null;
  }

  return <Sidebar isOpen={isOpen} isCollapsed={isCollapsed} onToggle={onToggle} />;
}

// Wrapper to only render Header on client with data from loader
function ClientOnlyHeader({
  title,
  isSidebarOpen,
  isSidebarCollapsed,
  onToggleSidebar,
  onToggleSidebarCollapse,
  countries,
  selectedCountryCode,
}: {
  title: string;
  isSidebarOpen: boolean;
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  onToggleSidebarCollapse: () => void;
  countries: Country[];
  selectedCountryCode: string;
}): ReactNode {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Defer setState to avoid cascading renders
    const timeoutId = window.setTimeout(() => {
      setIsClient(true);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  if (!isClient) {
    return (
      <div style={{ height: 'var(--header-height)', backgroundColor: 'var(--color-white)' }} />
    );
  }

  return (
    <Header
      title={title}
      isSidebarOpen={isSidebarOpen}
      isSidebarCollapsed={isSidebarCollapsed}
      onToggleSidebar={onToggleSidebar}
      onToggleSidebarCollapse={onToggleSidebarCollapse}
      countries={countries}
      selectedCountryCode={selectedCountryCode}
    />
  );
}

// Wrapper to only render Footer on client
function ClientOnlyFooter(): ReactNode {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Defer setState to avoid cascading renders
    const timeoutId = window.setTimeout(() => {
      setIsClient(true);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  if (!isClient) {
    return <div style={{ height: '80px', backgroundColor: 'var(--color-white)' }} />;
  }

  return <Footer />;
}

// Wrapper to only render GlobalLoader on client
function ClientOnlyGlobalLoader(): ReactNode {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Defer setState to avoid cascading renders
    const timeoutId = window.setTimeout(() => {
      setIsClient(true);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  if (!isClient) {
    return (
      <div style={{ position: 'fixed', inset: 0, backgroundColor: 'white', zIndex: 9999 }}></div>
    );
  }

  return <GlobalLoader />;
}

// Wrapper to only render LogoutModal on client
function ClientOnlyLogoutModal(): ReactNode {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Defer setState to avoid cascading renders
    const timeoutId = window.setTimeout(() => {
      setIsClient(true);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  if (!isClient) {
    return null;
  }

  return <LogoutModal />;
}

// Wrapper to only render Modal on client
function ClientOnlyModal(): ReactNode {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Defer setState to avoid cascading renders
    const timeoutId = window.setTimeout(() => {
      setIsClient(true);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  });

  if (!isClient) return null;
  return <ModalRoot />;
}

// Wrapper to handle PersistGate only when persistor is available
function PersistGateWrapper({ children }: { children: ReactNode }): ReactNode {
  if (persistor === null) {
    return (
      <>
        {children}
        <ClientOnlyGlobalLoader />
        <ScrollRestoration />
        <Scripts />
      </>
    );
  }

  return (
    <PersistGate loading={null} persistor={persistor}>
      {children}
      <ClientOnlyGlobalLoader />
      <ScrollRestoration />
      <Scripts />
    </PersistGate>
  );
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

// Redux store para cliente
const store = makeStore();
const persistor = typeof window !== 'undefined' ? makePersistor(store) : null;

export function Layout({ children }: { children: ReactNode }): ReactNode {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body
        style={{ backgroundColor: 'var(--color-neutral-50)', position: 'relative' }}
        suppressHydrationWarning
      >
        <Provider store={store}>
          <PersistGateWrapper>{children}</PersistGateWrapper>
        </Provider>
      </body>
    </html>
  );
}

interface GetCitiesParameters {
  filters: { countryId: string };
  language?: string;
}

const getCitiesByCountryId = (parameters: GetCitiesParameters) => {
  const formData = new FormData();
  const { filters } = parameters;

  formData.append('action', 'getCitiesByCountryIdBusiness');
  formData.append('filters', JSON.stringify(filters));
  formData.append('language', parameters.language ?? 'es');

  return citiesBL(formData);
};

interface GetCountriesParameters {
  language?: string;
}

const getCountries = (parameters: GetCountriesParameters) => {
  const formData = new FormData();

  formData.append('action', 'getCountriesBusiness');
  formData.append('language', parameters.language ?? 'es');

  return countriesBL(formData);
};

type ActionParameters = GetCitiesParameters | GetCountriesParameters;

const actionsLoader = (action: string, parameters: ActionParameters) => {
  const ACTIONS = {
    getCitiesByCountryId: () => getCitiesByCountryId(parameters as GetCitiesParameters),
    getCountries: () => getCountries(parameters as GetCountriesParameters),
  };

  if (action && action in ACTIONS) {
    return ACTIONS[action as keyof typeof ACTIONS]();
  }
  throw new Error('Invalid action');
};

interface LoaderData {
  cities: City[];
  countries: Country[];
  selectedCountryId: string;
  selectedCountryCode: string;
  language: string;
  isAuthenticated: boolean;
  authToken: string | null; // Add token from server session
  user: unknown; // We'll add proper typing later
}

export async function loader({ request }: LoaderFunctionArgs): Promise<{
  data: LoaderData;
}> {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Rutas públicas que no requieren autenticación
  const publicRoutes = ['/', '/register', '/newPassword', '/forgot-password'];
  const isPublicRoute = publicRoutes.includes(pathname);

  // Load session to check authentication
  const session = await getSession(request.headers.get('Cookie'));
  const authToken = session.get('authToken') as string | undefined;
  const hasToken = (authToken?.trim() ?? '') !== '';

  // Si no es una ruta pública y no hay token, redirigir al login
  if (!isPublicRoute && !hasToken) {
    throw redirect('/');
  }

  // Si es una ruta pública (/ o /register) y el usuario SÍ está autenticado, redirigir al dashboard
  // EXCEPTO para /newPassword y /forgot-password que permiten acceso aunque estés autenticado
  if (isPublicRoute && hasToken && pathname !== '/newPassword' && pathname !== '/forgot-password') {
    throw redirect('/dashboard');
  }
  // Get selected country from session
  const selectedCountryId = session.get('selectedCountryId') as string | undefined;
  const selectedCountryCode = session.get('selectedCountryCode') as string | undefined;

  // Get current language from session or default to 'es'
  const currentLanguage = (session.get('language') as string) ?? 'es';

  // Fetch countries from API with proper language header
  // Redux Persist will cache them on client side
  const countriesResult = (await actionsLoader('getCountries', {
    language: currentLanguage,
  })) as {
    success: boolean;
    data: Country[];
  };
  const countries = countriesResult.success === true ? countriesResult.data : [];

  // Determine country to filter by
  // Priority: 1. selectedCountryId from session (if valid), 2. Default to Mexico
  let countryId = selectedCountryId;
  let countryCode = selectedCountryCode;

  // Validate that the countryId from session exists in current countries list
  const isValidCountry =
    countryId !== null &&
    countryId !== undefined &&
    countries.some((c: Country) => c.id === countryId);

  if (!isValidCountry && countries.length > 0) {
    // Session countryId is invalid or not found, default to Mexico
    const mexicoCountry = countries.find(
      (c: Country) =>
        c.code === 'MX' ||
        c.name_es?.toLowerCase() === 'méxico' ||
        c.name_en?.toLowerCase() === 'mexico'
    );
    const defaultCountry = mexicoCountry ?? countries[0];
    countryId = defaultCountry?.id;
    countryCode = defaultCountry?.code;

    // Save default selection to session
    session.set('selectedCountryId', countryId);
    session.set('selectedCountryCode', countryCode);
  }

  let cities: City[] = [];

  if (countryId !== null && countryId !== undefined && countryId !== '') {
    const filters = { countryId };
    // Fetch cities for selected country
    const citiesResult = (await actionsLoader('getCitiesByCountryId', {
      filters,
      language: currentLanguage,
    })) as { success: boolean; data: City[] };
    cities = citiesResult.success ? citiesResult.data : [];
  }

  const loaderResponse = {
    cities,
    countries,
    selectedCountryId: countryId ?? '',
    selectedCountryCode: countryCode ?? '',
    language: currentLanguage,
    isAuthenticated: (authToken?.trim() ?? '') !== '',
    authToken: authToken ?? null, // Pass token from server session to client
    user: null, // For now, we'll set this to null and handle user data separately
  };

  return data(loaderResponse, {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

export default function App(): React.JSX.Element {
  const location = useLocation();
  const loaderData = useLoaderData<LoaderData>();
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [isClient, setIsClient] = useState(false);

  // Extract loader data - Los datos están en loaderData.data cuando usamos data() con headers
  const typedLoader = loaderData as unknown as { data?: LoaderData };
  const hasData = typedLoader.data !== undefined && typedLoader.data !== null;
  const dataOrLoader = hasData
    ? (typedLoader as { data: LoaderData }).data
    : (loaderData as LoaderData);
  const cities = useMemo(() => dataOrLoader?.cities ?? [], [dataOrLoader]);
  const countries = useMemo(() => dataOrLoader?.countries ?? [], [dataOrLoader]);
  const selectedCountryCode = dataOrLoader?.selectedCountryCode ?? '';
  const isAuthenticated = dataOrLoader?.isAuthenticated ?? false;

  // Check if we're on client
  useEffect(() => {
    // Defer setState to avoid cascading renders
    const timeoutId = window.setTimeout(() => {
      setIsClient(true);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

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
    const exactMatch = pathMap[location.pathname];
    if (exactMatch !== undefined && exactMatch !== null && exactMatch !== '') {
      return exactMatch;
    }

    // Check for partial matches (e.g., /tours/123)
    const matchedPath = Object.keys(pathMap).find((path) =>
      location.pathname.startsWith(`${path}/`)
    );

    if (
      matchedPath !== undefined &&
      matchedPath !== null &&
      matchedPath !== '' &&
      pathMap[matchedPath] !== undefined &&
      pathMap[matchedPath] !== null &&
      pathMap[matchedPath] !== ''
    ) {
      const matched = pathMap[matchedPath];
      if (matched !== undefined && matched !== null && matched !== '') {
        return matched;
      }
    }

    return 'Tours Admin';
  }, [location.pathname]);

  // Provide loader data via context (Redux will sync on client)
  const contextValue = useMemo(
    () => ({
      cities,
      countries,
    }),
    [cities, countries]
  );

  // Check if current page is an auth page (login, register, newPassword, forgot-password)
  const isAuthPage =
    location.pathname === '/' ||
    location.pathname === '/register' ||
    location.pathname === '/newPassword' ||
    location.pathname === '/forgot-password';

  return (
    <>
      <ClientOnlyLogoutModal />
      <ClientOnlyModal />
      <CitiesContext.Provider value={contextValue}>
        {isClient && (
          <DataSyncDispatcher
            cities={cities}
            countries={countries}
            selectedCountryCode={selectedCountryCode}
            isAuthenticated={isAuthenticated}
            authToken={dataOrLoader?.authToken ?? null}
          />
        )}

        {isAuthPage ? (
          <Outlet />
        ) : (
          <div style={{ minHeight: '100vh' }}>
            <ClientOnlySidebar
              isOpen={isSidebarOpen}
              isCollapsed={isSidebarCollapsed}
              onToggle={toggleSidebar}
            />
            <div
              style={{
                marginLeft: isMobile ? 0 : isSidebarCollapsed ? '80px' : '280px',
                transition: 'margin-left var(--transition-base)',
              }}
            >
              <ClientOnlyHeader
                title={pageTitle}
                isSidebarOpen={isSidebarOpen}
                isSidebarCollapsed={isSidebarCollapsed}
                onToggleSidebar={toggleSidebar}
                onToggleSidebarCollapse={toggleSidebarCollapse}
                countries={countries}
                selectedCountryCode={selectedCountryCode}
              />
              <AuthGuard>
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
              </AuthGuard>
              <ClientOnlyFooter />
            </div>
          </div>
        )}
      </CitiesContext.Provider>
    </>
  );
}
