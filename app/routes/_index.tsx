/**
 * Home Route - Tours Admin Dashboard
 */

export default function Index() {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>Welcome to Tours Admin</h1>
      <p style={{ fontSize: '1.25rem', color: 'var(--color-neutral-600)' }}>
        Modern admin dashboard for managing tours, reservations, and payments
      </p>
      <div
        style={{
          marginTop: '3rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1.5rem',
          maxWidth: '1000px',
          marginInline: 'auto',
        }}
      >
        <FeatureCard
          title="Dashboard"
          description="View analytics and key performance indicators"
          status="Coming Soon"
        />
        <FeatureCard
          title="Tours Management"
          description="Create and manage tours with full CRUD operations"
          status="Coming Soon"
        />
        <FeatureCard
          title="Reservations"
          description="Track and manage all tour reservations"
          status="Coming Soon"
        />
        <FeatureCard
          title="Users & Roles"
          description="Manage users and assign administrative roles"
          status="Coming Soon"
        />
        <FeatureCard
          title="Payments"
          description="Integrate with Mercado Pago for secure payments"
          status="Coming Soon"
        />
        <FeatureCard
          title="Settings"
          description="Configure application settings and integrations"
          status="Coming Soon"
        />
      </div>
    </div>
  );
}

function FeatureCard({
  title,
  description,
  status,
}: {
  title: string;
  description: string;
  status: string;
}) {
  return (
    <div
      style={{
        padding: '1.5rem',
        borderRadius: 'var(--radius-lg)',
        backgroundColor: 'var(--color-neutral-50)',
        border: '1px solid var(--color-neutral-200)',
        boxShadow: 'var(--shadow-sm)',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      }}
    >
      <h3
        style={{
          fontSize: '1.25rem',
          fontWeight: '600',
          marginBottom: '0.5rem',
          color: 'var(--color-neutral-900)',
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontSize: '0.875rem',
          color: 'var(--color-neutral-600)',
          marginBottom: '1rem',
          lineHeight: '1.5',
        }}
      >
        {description}
      </p>
      <span
        style={{
          display: 'inline-block',
          padding: '0.25rem 0.75rem',
          borderRadius: 'var(--radius-full)',
          backgroundColor: 'var(--color-primary-100)',
          color: 'var(--color-primary-700)',
          fontSize: '0.75rem',
          fontWeight: '600',
        }}
      >
        {status}
      </span>
    </div>
  );
}
