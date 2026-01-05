/**
 * Offers Route - Offers and Promotions Management
 */

import { useState } from 'react';
import { Card } from '~/components/ui/Card';
import { Button } from '~/components/ui/Button';
import { Table } from '~/components/ui/Table';
import Select from '~/components/ui/Select';
import type { Column } from '~/components/ui/Table';

interface Offer {
  id: number;
  name: string;
  type: string;
  discountValue: number;
  validFrom: string;
  validTo: string;
  subscriptionPlan: string;
  active: boolean;
  createdAt: string;
}

const mockOffers: readonly Offer[] = [
  {
    id: 1,
    name: 'Summer Sale 2025',
    type: 'percentage',
    discountValue: 20,
    validFrom: '2025-06-01',
    validTo: '2025-08-31',
    subscriptionPlan: 'Premium',
    active: true,
    createdAt: '2025-01-01',
  },
  {
    id: 2,
    name: 'Early Bird Discount',
    type: 'percentage',
    discountValue: 15,
    validFrom: '2025-01-15',
    validTo: '2025-02-28',
    subscriptionPlan: 'Basic',
    active: true,
    createdAt: '2025-01-02',
  },
  {
    id: 3,
    name: 'Fixed Price Special',
    type: 'fixed',
    discountValue: 10,
    validFrom: '2025-01-01',
    validTo: '2025-01-31',
    subscriptionPlan: 'Top',
    active: false,
    createdAt: '2025-01-03',
  },
  {
    id: 4,
    name: 'Buy 2 Get 1 Free',
    type: 'buy_x_get_y',
    discountValue: 0,
    validFrom: '2025-02-01',
    validTo: '2025-02-28',
    subscriptionPlan: 'Premium',
    active: true,
    createdAt: '2025-01-04',
  },
];

export default function Offers() {
  const columns: Column<Offer>[] = [
    { key: 'name', label: 'Offer Name' },
    {
      key: 'type',
      label: 'Type',
      render: (value: string) => {
        const typeLabels: Record<string, string> = {
          percentage: 'Percentage',
          fixed: 'Fixed',
          'buy_x_get_y': 'Buy X Get Y',
        };
        return typeLabels[value] || value;
      },
    },
    {
      key: 'discountValue',
      label: 'Discount',
      render: (value: number, row: Offer) => {
        if (row.type === 'percentage') {
          return `${value}%`;
        }
        return `$${value}`;
      },
    },
    { key: 'validFrom', label: 'Valid From' },
    { key: 'validTo', label: 'Valid To' },
    { key: 'subscriptionPlan', label: 'Plan' },
    {
      key: 'active',
      label: 'Status',
      render: (value: boolean) => (
        <span
          className={`inline-block px-2 py-1 rounded text-xs font-medium ${
            value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
        >
          {value ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    { key: 'createdAt', label: 'Created At' },
  ];

  const [typeFilter, setTypeFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');

  return (
    <div className="space-y-6">
      <Card
        title="All Offers"
        actions={<Button variant="primary">Create New Offer</Button>}
      >
            <div className="mb-4 flex gap-4">
              <input
                type="search"
                placeholder="Search offers..."
                className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Select
                options={[
                  { value: '', label: 'All Types' },
                  { value: 'percentage', label: 'Percentage' },
                  { value: 'fixed', label: 'Fixed' },
                  { value: 'buy_x_get_y', label: 'Buy X Get Y' },
                ]}
                value={typeFilter}
                onChange={setTypeFilter}
                placeholder="All Types"
                className="select-compact"
              />
              <Select
                options={[{ value: '', label: 'All Plans' }, { value: 'Basic', label: 'Basic' }, { value: 'Premium', label: 'Premium' }, { value: 'Top', label: 'Top' }]}
                value={planFilter}
                onChange={setPlanFilter}
                placeholder="All Plans"
                className="select-compact"
              />
            </div>

            <Table data={mockOffers} columns={columns} />
          </Card>

          <Card title="Offers Statistics">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatCard title="Total Offers" value="24" />
              <StatCard title="Active Offers" value="18" />
              <StatCard title="Inactive Offers" value="6" />
              <StatCard title="Expired This Month" value="3" />
            </div>
          </Card>

          <Card title="Subscription Plans Overview">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <PlanCard title="Basic" tours="50" price="$49/month" />
              <PlanCard title="Premium" tours="150" price="$99/month" />
              <PlanCard title="Top" tours="Unlimited" price="$199/month" />
            </div>
          </Card>
        </div>
  );
}

function StatCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="bg-gray-50 p-4 rounded-lg">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function PlanCard({ title, tours, price }: { title: string; tours: string; price: string }) {
  return (
    <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-lg">
      <h3 className="text-xl font-bold mb-2">{title} Plan</h3>
      <p className="text-4xl font-bold mb-2">{price}</p>
      <p className="text-blue-100 mb-4">{tours} tours/month</p>
      <ul className="space-y-2 text-sm">
        <li>✓ Dashboard access</li>
        <li>✓ Analytics included</li>
        <li>✓ Email support</li>
      </ul>
    </div>
  );
}
