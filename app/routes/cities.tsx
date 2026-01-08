/**
 * Cities Route - Cities Management
 */

import type { JSX } from 'react';
import { useState } from 'react';
import { Card } from '~/components/ui/Card';
import { Button } from '~/components/ui/Button';
import { Table } from '~/components/ui/Table';
import Select from '~/components/ui/Select';
import type { Column } from '~/components/ui/Table';

interface City {
  id: number;
  name: string;
  country: string;
  toursCount: number;
  active: boolean;
  createdAt: string;
}

const mockCities: readonly City[] = [
  {
    id: 1,
    name: 'Madrid',
    country: 'Spain',
    toursCount: 45,
    active: true,
    createdAt: '2025-01-01',
  },
  {
    id: 2,
    name: 'Barcelona',
    country: 'Spain',
    toursCount: 38,
    active: true,
    createdAt: '2025-01-02',
  },
  {
    id: 3,
    name: 'Seville',
    country: 'Spain',
    toursCount: 22,
    active: true,
    createdAt: '2025-01-03',
  },
  {
    id: 4,
    name: 'Valencia',
    country: 'Spain',
    toursCount: 15,
    active: false,
    createdAt: '2025-01-04',
  },
];

export default function Cities(): JSX.Element {
  const columns: Column<City>[] = [
    { key: 'name', label: 'Name' },
    { key: 'country', label: 'Country' },
    { key: 'toursCount', label: 'Tours Count' },
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

  const [countryFilter, setCountryFilter] = useState('');

  return (
    <div className="space-y-6">
      <Card title="All Cities" actions={<Button variant="primary">Add New City</Button>}>
        <div className="mb-4 flex gap-4">
          <input
            type="search"
            placeholder="Search cities..."
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Select
            options={[
              { value: '', label: 'All Countries' },
              { value: 'Spain', label: 'Spain' },
              { value: 'France', label: 'France' },
              { value: 'Italy', label: 'Italy' },
            ]}
            value={countryFilter}
            onChange={(v: string) => {
              setCountryFilter(v);
            }}
            placeholder="All Countries"
            className="select-compact"
          />
        </div>

        <Table data={mockCities} columns={columns} />
      </Card>

      <Card title="Cities Statistics">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard title="Total Cities" value="24" />
          <StatCard title="Active Cities" value="20" />
          <StatCard title="Inactive Cities" value="4" />
        </div>
      </Card>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: string | number }): JSX.Element {
  return (
    <div className="bg-gray-50 p-4 rounded-lg">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
