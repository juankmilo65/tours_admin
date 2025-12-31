/**
 * Categories Route - Categories Management
 */

import { Sidebar } from '~/components/layout/Sidebar';
import { Header } from '~/components/layout/Header';
import { Card } from '~/components/ui/Card';
import { Button } from '~/components/ui/Button';
import { Table } from '~/components/ui/Table';
import type { Column } from '~/components/ui/Table';

interface Category {
  id: number;
  name: string;
  slug: string;
  icon: string;
  color: string;
  toursCount: number;
  active: boolean;
  createdAt: string;
}

const mockCategories: readonly Category[] = [
  { id: 1, name: 'Cultural', slug: 'cultural', icon: '🏛️', color: '#3B82F6', toursCount: 45, active: true, createdAt: '2025-01-01' },
  { id: 2, name: 'Food', slug: 'food', icon: '🍽️', color: '#EF4444', toursCount: 32, active: true, createdAt: '2025-01-02' },
  { id: 3, name: 'Adventure', slug: 'adventure', icon: '🏔️', color: '#10B981', toursCount: 28, active: true, createdAt: '2025-01-03' },
  { id: 4, name: 'Nightlife', slug: 'nightlife', icon: '🌙', color: '#8B5CF6', toursCount: 15, active: false, createdAt: '2025-01-04' },
];

export default function Categories() {
  const columns: Column<Category>[] = [
    {
      key: 'name',
      label: 'Name',
      render: (value: string, row: Category) => (
        <div className="flex items-center gap-2">
          <span className="text-xl">{row.icon}</span>
          <span>{value}</span>
        </div>
      ),
    },
    { key: 'slug', label: 'Slug' },
    {
      key: 'color',
      label: 'Color',
      render: (value: string) => (
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-full border"
            style={{ backgroundColor: value }}
          />
          <span className="text-sm">{value}</span>
        </div>
      ),
    },
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <main className="ml-64 pt-16">
        <Header title="Categories Management" />

        <div className="p-6 space-y-6">
          <Card
            title="All Categories"
            actions={<Button variant="primary">Add New Category</Button>}
          >
            <div className="mb-4 flex gap-4">
              <input
                type="search"
                placeholder="Search categories..."
                className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <Table data={mockCategories} columns={columns} />
          </Card>

          <Card title="Categories Statistics">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard title="Total Categories" value="18" />
              <StatCard title="Active Categories" value="15" />
              <StatCard title="Inactive Categories" value="3" />
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
