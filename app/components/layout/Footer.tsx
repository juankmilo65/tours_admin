/**
 * Footer Component - Copyright Information
 */

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer 
      style={{
        backgroundColor: 'white',
        borderTop: '1px solid var(--color-neutral-200)',
        padding: 'var(--space-4) var(--space-6)',
      }}
    >
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 'var(--text-sm)',
          color: 'var(--color-neutral-600)',
        }}
      >
        <p style={{ margin: 0 }}>© {currentYear} Tours Admin. All rights reserved.</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <a 
            href="#"
            style={{
              color: 'inherit',
              textDecoration: 'none',
              transition: 'color var(--transition-base)',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.color = 'var(--color-neutral-900)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.color = 'inherit';
            }}
          >
            Privacy Policy
          </a>
          <a 
            href="#"
            style={{
              color: 'inherit',
              textDecoration: 'none',
              transition: 'color var(--transition-base)',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.color = 'var(--color-neutral-900)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.color = 'inherit';
            }}
          >
            Terms of Service
          </a>
          <a 
            href="#"
            style={{
              color: 'inherit',
              textDecoration: 'none',
              transition: 'color var(--transition-base)',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.color = 'var(--color-neutral-900)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.color = 'inherit';
            }}
          >
            Support
          </a>
        </div>
      </div>
    </footer>
  );
}
