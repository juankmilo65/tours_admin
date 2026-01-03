/**
 * Home Route - Tours Admin Dashboard
 */

import { Link } from '@remix-run/react';

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
        <LinkCard
          title="Dashboard"
          description="View analytics and key performance indicators"
          to="/dashboard"
          icon="📊"
        />
        <LinkCard
          title="Tours Management"
          description="Create and manage tours with full CRUD operations"
          to="/tours"
          icon="🗺️"
        />
        <LinkCard
          title="Reservations"
          description="Track and manage all tour reservations"
          to="/reservations"
          icon="📅"
        />
        <LinkCard
          title="Users & Roles"
          description="Manage users and assign administrative roles"
          to="/users"
          icon="👥"
        />
        <LinkCard
          title="Categories"
          description="Manage tour categories and classifications"
          to="/categories"
          icon="🏷️"
        />
        <LinkCard
          title="Cities"
          description="Manage available tour destinations"
          to="/cities"
          icon="🏙️"
        />
        <LinkCard
          title="News"
          description="Publish and manage news articles"
          to="/news"
          icon="📰"
        />
        <LinkCard
          title="Offers"
          description="Create and manage special offers"
          to="/offers"
          icon="🎁"
        />
        <LinkCard
          title="Settings"
          description="Configure application settings and integrations"
          to="/settings"
          icon="⚙️"
        />
      </div>
    </div>
  );
}

function LinkCard({
  title,
  description,
  to,
  icon,
}: {
  title: string;
  description: string;
  to: string;
  icon: string;
}) {
  return (
    <Link
      to={to}
      style={{
        textDecoration: 'none',
        display: 'block',
      }}
    >
      <div
        style={{
          padding: '1.5rem',
          borderRadius: 'var(--radius-lg)',
          backgroundColor: 'var(--color-neutral-50)',
          border: '1px solid var(--color-neutral-200)',
          boxShadow: 'var(--shadow-sm)',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
          cursor: 'pointer',
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = 'var(--shadow-md)';
          e.currentTarget.style.borderColor = 'var(--color-primary-300)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
          e.currentTarget.style.borderColor = 'var(--color-neutral-200)';
        }}
      >
        <div
          style={{
            fontSize: '2.5rem',
            marginBottom: '0.75rem',
          }}
        >
          {icon}
        </div>
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
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            padding: '0.25rem 0.75rem',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--color-primary-50)',
            color: 'var(--color-primary-700)',
            fontSize: '0.75rem',
            fontWeight: '600',
            transition: 'background-color 0.2s ease',
          }}
        >
          Access
          <span style={{ fontSize: '0.875rem' }}>→</span>
        </span>
      </div>
    </Link>
  );
}
