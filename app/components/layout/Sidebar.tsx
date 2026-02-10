/**
 * Sidebar Component - Navigation Menu
 */

import type { JSX } from 'react';
import { Link, useLocation, useNavigation } from '@remix-run/react';
import { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '~/store/hooks';
import { setGlobalLoading } from '~/store/slices/uiSlice';
import { selectAuthToken } from '~/store/slices/authSlice';
import type { NavItem } from '~/types/MenuProps';
import { getUserMenuBusiness } from '~/server/businessLogic/menusBusinessLogic';

interface SidebarProps {
  isOpen: boolean;
  isCollapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ isOpen, isCollapsed, onToggle }: SidebarProps): JSX.Element {
  const token = useAppSelector(selectAuthToken);
  const currentLanguage = useAppSelector((state) => state.ui.language);
  const location = useLocation();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const currentPath = location.pathname;
  const [isMobile, setIsMobile] = useState(false);
  const [navItems, setNavItems] = useState<NavItem[]>([]);
  const [isLoadingMenu, setIsLoadingMenu] = useState(true);

  // Turn off global loading when navigation completes
  useEffect(() => {
    if (navigation.state === 'idle') {
      dispatch(setGlobalLoading({ isLoading: false }));
    }
  }, [navigation.state, dispatch]);

  // Fetch menu from API based on user's role
  useEffect(() => {
    async function fetchMenu() {
      try {
        const language = currentLanguage ?? 'es';

        if (token === null || token === '') {
          setNavItems([]);
          setIsLoadingMenu(false);
          return;
        }

        const result = await getUserMenuBusiness(token, language, 'admin');

        if (result.success === true && result.data !== undefined && Array.isArray(result.data)) {
          setNavItems(result.data);
        } else {
          setNavItems([]);
        }
      } catch {
        setNavItems([]);
      } finally {
        setIsLoadingMenu(false);
      }
    }

    void fetchMenu();
  }, [token, currentLanguage]);

  // Check if screen is mobile
  useEffect(() => {
    function checkMobile() {
      setIsMobile(window.innerWidth < 1024);
    }

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle link click - show loading and close sidebar on mobile
  function handleLinkClick(targetPath: string) {
    // Only show loading if navigating to a different page
    if (targetPath !== currentPath) {
      dispatch(setGlobalLoading({ isLoading: true }));
    }

    if (isMobile) {
      onToggle();
    }
  }

  return (
    <>
      {/* Backdrop Overlay for Mobile */}
      {isMobile && isOpen && (
        <div
          onClick={onToggle}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 999,
            transition: 'opacity var(--transition-base)',
          }}
        ></div>
      )}

      <aside
        style={{
          width: isMobile ? '280px' : isCollapsed ? '80px' : '280px',
          backgroundColor: 'var(--color-primary-light-50)',
          color: 'var(--color-neutral-800)',
          height: '100vh',
          position: 'fixed',
          left: isMobile ? (isOpen ? '0' : '-280px') : 0,
          top: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          borderRight: '1px solid var(--color-neutral-200)',
          zIndex: 'var(--z-modal)',
          transition: 'width var(--transition-base), left var(--transition-base)',
        }}
      >
        {isMobile && (
          <div
            style={{
              padding: 'var(--space-4)',
              borderBottom: '1px solid var(--color-neutral-200)',
              display: 'flex',
              justifyContent: 'flex-end',
            }}
          >
            <button
              onClick={onToggle}
              style={{
                width: '32px',
                height: '32px',
                backgroundColor: 'transparent',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 'var(--text-lg)',
                color: 'var(--color-neutral-700)',
                transition: 'background-color var(--transition-base)',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-neutral-200)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Logo/Title Section */}
        <div
          style={{
            padding: isCollapsed ? 'var(--space-3)' : 'var(--space-4)',
            borderBottom: '1px solid var(--color-neutral-200)',
            display: 'flex',
            justifyContent: isCollapsed ? 'center' : 'flex-start',
            alignItems: 'center',
          }}
        >
          <img
            src={isCollapsed ? '/logo-small.svg' : '/logo-large.svg'}
            alt="Tours Admin"
            style={{
              width: isCollapsed ? '40px' : '160px',
              height: isCollapsed ? '40px' : '48px',
              objectFit: 'contain',
              transition: 'all var(--transition-base)',
            }}
          />
        </div>

        <nav
          style={{
            padding: 'var(--space-4)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-1)',
          }}
        >
          {isLoadingMenu ? (
            <div
              style={{
                textAlign: 'center',
                padding: 'var(--space-4)',
                color: 'var(--color-neutral-500)',
              }}
            >
              Loading menu...
            </div>
          ) : navItems.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: 'var(--space-4)',
                color: 'var(--color-neutral-500)',
              }}
            >
              No menu items available
            </div>
          ) : (
            navItems.map((item) => {
              const hasSubmenu = item.submenu !== undefined && item.submenu.length > 0;
              const label = currentLanguage === 'en' ? item.label_en : item.label_es;

              // Check if this item or any of its submenus are active
              let isActive = false;
              if (hasSubmenu && item.submenu !== undefined) {
                isActive = item.submenu.some((sub) => currentPath === sub.path);
              }

              return (
                <div key={item.id}>
                  {/* Main menu item */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: isCollapsed ? 0 : 'var(--space-3)',
                      padding: isCollapsed ? 'var(--space-3)' : 'var(--space-3) var(--space-4)',
                      borderRadius: 'var(--radius-lg)',
                      transition: 'all var(--transition-base)',
                      color: isActive ? 'var(--color-primary-700)' : 'var(--color-neutral-600)',
                      backgroundColor: isActive ? 'var(--color-primary-50)' : 'transparent',
                      fontWeight: isActive
                        ? 'var(--font-weight-semibold)'
                        : 'var(--font-weight-normal)',
                      justifyContent: isCollapsed ? 'center' : 'flex-start',
                      cursor: hasSubmenu ? 'pointer' : 'default',
                    }}
                    onMouseOver={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'var(--color-neutral-100)';
                        e.currentTarget.style.color = 'var(--color-neutral-800)';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = 'var(--color-neutral-600)';
                      }
                    }}
                    title={isCollapsed ? label : ''}
                  >
                    <span style={{ fontSize: 'var(--text-xl)' }}>{item.icon}</span>
                    {!isCollapsed && (
                      <span>
                        {label}
                        {hasSubmenu && (
                          <span
                            style={{ marginLeft: 'var(--space-2)', fontSize: 'var(--text-sm)' }}
                          >
                            ▼
                          </span>
                        )}
                      </span>
                    )}
                  </div>

                  {/* Submenu items */}
                  {!isCollapsed && hasSubmenu && (
                    <div
                      style={{
                        paddingLeft: 'var(--space-8)',
                        marginTop: 'var(--space-1)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 'var(--space-1)',
                      }}
                    >
                      {item.submenu.map((subItem) => {
                        const isSubActive = currentPath === subItem.path;
                        const subLabel =
                          currentLanguage === 'en' ? subItem.label_en : subItem.label_es;
                        return (
                          <Link
                            key={subItem.id}
                            to={subItem.path}
                            onClick={() => handleLinkClick(subItem.path)}
                            style={{
                              textDecoration: 'none',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 'var(--space-2)',
                              padding: 'var(--space-2) var(--space-3)',
                              borderRadius: 'var(--radius-md)',
                              transition: 'all var(--transition-base)',
                              color: isSubActive
                                ? 'var(--color-primary-700)'
                                : 'var(--color-neutral-600)',
                              backgroundColor: isSubActive
                                ? 'var(--color-primary-50)'
                                : 'transparent',
                              fontSize: 'var(--text-sm)',
                            }}
                            onMouseOver={(e) => {
                              if (!isSubActive) {
                                e.currentTarget.style.backgroundColor = 'var(--color-neutral-100)';
                                e.currentTarget.style.color = 'var(--color-neutral-800)';
                              }
                            }}
                            onMouseOut={(e) => {
                              if (!isSubActive) {
                                e.currentTarget.style.backgroundColor = 'transparent';
                                e.currentTarget.style.color = 'var(--color-neutral-600)';
                              }
                            }}
                          >
                            <span style={{ fontSize: 'var(--text-base)' }}>{subItem.icon}</span>
                            <span>{subLabel}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </nav>
      </aside>
    </>
  );
}
