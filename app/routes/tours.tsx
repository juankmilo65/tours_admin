/**
 * Tours Route - Tours Management List
 */

import { Sidebar } from '~/components/layout/Sidebar';
import { Header } from '~/components/layout/Header';
import { Card } from '~/components/ui/Card';
import { Button } from '~/components/ui/Button';
import { Table } from '~/components/ui/Table';
import type { Column } from '~/components/ui/Table';

interface Tour {
  id: number;
  title: string;
  category: string;
  city: string;
  price: number;
  status: string;
  createdAt: string;
}

const mockTours: readonly Tour[] = [
  {
    id: 1,
    title: 'Historical City Center Tour',
    category: 'Cultural',
    city: 'Madrid',
    price: 45,
    status: 'Active',
    createdAt: '2025-01-01',
  },
  {
    id: 2,
    title: 'Food Market Experience',
    category: 'Food',
    city: 'Barcelona',
    price: 60,
    status: 'Active',
    createdAt: '2025-01-02',
  },
  {
    id: 3,
    title: 'Museum Private Tour',
    category: 'Cultural',
    city: 'Seville',
    price: 75,
    status: 'Inactive',
    createdAt: '2025-01-03',
  },
];

export default function Tours() {
  const columns: Column<Tour>[] = [
    { key: 'title', label: 'Title' },
    { key: 'category', label: 'Category' },
    { key: 'city', label: 'City' },
    {
      key: 'price',
      label: 'Price',
      render: (value: number) => `$${value}`,
    },
    {
      key: 'status',
      label: 'Status',
      render: (value: string) => (
        <span
          className={`inline-block px-2 py-1 rounded text-xs font-medium ${
            value === 'Active'
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {value}
        </span>
      ),
    },
    { key: 'createdAt', label: 'Created At' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <main className="ml-64 pt-16">
        <Header title="Tours Management" />

        <div className="p-6 space-y-6">
          <Card
            title="All Tours"
            actions={<Button variant="primary">Create New Tour</Button>}
          >
            <div className="mb-4 flex gap-4">
              <input
                type="search"
                placeholder="Search tours..."
                className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">All Cities</option>
                <option value="Madrid">Madrid</option>
                <option value="Barcelona">Barcelona</option>
                <option value="Seville">Seville</option>
              </select>
              <select className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">All Categories</option>
                <option value="Cultural">Cultural</option>
                <option value="Food">Food</option>
                <option value="Adventure">Adventure</option>
              </select>
            </div>

            <Table data={mockTours} columns={columns} />
          </Card>

          <Card title="Tour Statistics">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatCard title="Total Tours" value="156" />
              <StatCard title="Active Tours" value="142" />
              <StatCard title="Inactive Tours" value="14" />
              <StatCard title="Featured Tours" value="23" />
            </div>
          </Card>
        </div>
      </main>
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
