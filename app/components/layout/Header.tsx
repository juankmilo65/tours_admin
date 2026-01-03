/**
 * Header Component - Top Navigation Bar
 */

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  return (
    <header 
      style={{
        height: 'var(--header-height)',
        backgroundColor: 'white',
        borderBottom: '1px solid var(--color-neutral-200)',
        position: 'fixed',
        top: 0,
        left: 'var(--sidebar-width)',
        right: 0,
        zIndex: 'var(--z-fixed)',
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
        <div>
          <h2 
            style={{
              fontSize: 'var(--text-xl)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--color-neutral-900)',
            }}
          >
            {title}
          </h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <button
            style={{
              padding: 'var(--space-2)',
              color: 'var(--color-neutral-600)',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: 'var(--radius-lg)',
              cursor: 'pointer',
              fontSize: 'var(--text-lg)',
              transition: 'background-color var(--transition-base)',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-neutral-100)';
              e.currentTarget.style.color = 'var(--color-neutral-900)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--color-neutral-600)';
            }}
          >
            🔔
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <div style={{ textAlign: 'right' }}>
              <p 
                style={{
                  fontSize: 'var(--text-sm)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: 'var(--color-neutral-900)',
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
                backgroundColor: 'var(--color-primary-600)',
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
          </div>
        </div>
      </div>
    </header>
  );
}
