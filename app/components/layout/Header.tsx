/**
 * Header Component - Top Navigation Bar
 */

import { useState, useEffect, useRef } from 'react';

interface HeaderProps {
  title: string;
  isSidebarOpen: boolean;
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  onToggleSidebarCollapse: () => void;
}

export function Header({ title, isSidebarOpen, isSidebarCollapsed, onToggleSidebar, onToggleSidebarCollapse }: HeaderProps) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Check if screen is mobile
  useEffect(() => {
    function checkMobile() {
      setIsMobile(window.innerWidth < 1024);
    }
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header 
      style={{
        height: 'var(--header-height)',
        backgroundColor: 'var(--color-neutral-50)',
        borderBottom: '1px solid var(--color-neutral-200)',
        position: 'fixed',
        top: 0,
        left: isMobile ? 0 : (isSidebarCollapsed ? '80px' : '280px'),
        right: 0,
        zIndex: 'var(--z-fixed)',
        transition: 'left var(--transition-base)',
      }}
    >
      <div 
        style={{
          height: '100%',
          padding: '0 var(--space-6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          {/* Mobile: Hamburger Menu Button */}
          {isMobile && (
            <button
              onClick={onToggleSidebar}
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '4px',
                width: '32px',
                height: '32px',
                backgroundColor: 'transparent',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                padding: 'var(--space-1)',
                transition: 'background-color var(--transition-base)',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-neutral-200)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <span
                style={{
                  width: '20px',
                  height: '2px',
                  backgroundColor: 'var(--color-neutral-700)',
                }}
              ></span>
              <span
                style={{
                  width: '20px',
                  height: '2px',
                  backgroundColor: 'var(--color-neutral-700)',
                }}
              ></span>
              <span
                style={{
                  width: '20px',
                  height: '2px',
                  backgroundColor: 'var(--color-neutral-700)',
                }}
              ></span>
            </button>
          )}

          {/* Desktop: Collapse/Expand Button */}
          {!isMobile && (
            <button
              onClick={onToggleSidebarCollapse}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                backgroundColor: 'transparent',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                padding: 'var(--space-2)',
                transition: 'background-color var(--transition-base)',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-neutral-200)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              title={isSidebarCollapsed ? 'Expandir menú' : 'Colapsar menú'}
            >
              {isSidebarCollapsed ? (
                // Icono para expandir (flecha derecha)
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ color: 'var(--color-neutral-700)' }}
                >
                  <line x1="19" y1="12" x2="5" y2="12"></line>
                  <polyline points="12 19 5 12 12 5"></polyline>
                </svg>
              ) : (
                // Icono para colapsar (flecha izquierda)
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ color: 'var(--color-neutral-700)' }}
                >
                  <line x1="19" y1="12" x2="5" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              )}
            </button>
          )}
          <h2 
            style={{
              fontSize: 'var(--text-xl)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--color-neutral-700)',
            }}
          >
            {title}
          </h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <button
            style={{
              padding: 'var(--space-2)',
              color: 'var(--color-neutral-500)',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: 'var(--radius-lg)',
              cursor: 'pointer',
              fontSize: 'var(--text-lg)',
              transition: 'background-color var(--transition-base)',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-neutral-200)';
              e.currentTarget.style.color = 'var(--color-neutral-700)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--color-neutral-500)';
            }}
          >
            🔔
          </button>
          <div style={{ position: 'relative' }} ref={menuRef}>
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                padding: 'var(--space-2)',
                backgroundColor: 'transparent',
                border: 'none',
                borderRadius: 'var(--radius-lg)',
                cursor: 'pointer',
                transition: 'background-color var(--transition-base)',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-neutral-200)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <div style={{ textAlign: 'right' }}>
                <p 
                  style={{
                    fontSize: 'var(--text-sm)',
                    fontWeight: 'var(--font-weight-medium)',
                    color: 'var(--color-neutral-700)',
                    margin: 0,
                  }}
                >
                  Admin User
                </p>
                <p 
                  style={{
                    fontSize: 'var(--text-xs)',
                    color: 'var(--color-neutral-500)',
                    margin: 0,
                  }}
                >
                  admin@tours.com
                </p>
              </div>
              <div 
                style={{
                  width: '40px',
                  height: '40px',
                  backgroundColor: 'var(--color-primary-500)',
                  borderRadius: 'var(--radius-full)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 'var(--font-weight-semibold)',
                }}
              >
                A
              </div>
              <span style={{ color: 'var(--color-neutral-500)', fontSize: 'var(--text-sm)' }}>
                {isUserMenuOpen ? '▲' : '▼'}
              </span>
            </button>

            {/* User Menu Dropdown */}
            {isUserMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + var(--space-2))',
                  right: 0,
                  backgroundColor: 'white',
                  border: '1px solid var(--color-neutral-200)',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: 'var(--shadow-lg)',
                  minWidth: '200px',
                  padding: 'var(--space-2)',
                  zIndex: 'var(--z-dropdown)',
                }}
              >
                <button
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-3)',
                    padding: 'var(--space-3) var(--space-4)',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    fontSize: 'var(--text-sm)',
                    color: 'var(--color-neutral-700)',
                    transition: 'background-color var(--transition-base)',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-neutral-100)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <span>👤</span>
                  <span>Profile</span>
                </button>
                <button
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-3)',
                    padding: 'var(--space-3) var(--space-4)',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    fontSize: 'var(--text-sm)',
                    color: 'var(--color-neutral-700)',
                    transition: 'background-color var(--transition-base)',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-neutral-100)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <span>⚙️</span>
                  <span>Settings</span>
                </button>
                <div 
                  style={{
                    height: '1px',
                    backgroundColor: 'var(--color-neutral-200)',
                    margin: 'var(--space-2) 0',
                  }}
                ></div>
                <button
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-3)',
                    padding: 'var(--space-3) var(--space-4)',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    fontSize: 'var(--text-sm)',
                    color: 'var(--color-error-600)',
                    transition: 'background-color var(--transition-base)',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-error-50)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <span>🚪</span>
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
