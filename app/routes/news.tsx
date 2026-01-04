/**
 * News Route - News and Content Management
 */

import { Card } from '~/components/ui/Card';
import { Button } from '~/components/ui/Button';
import { Table } from '~/components/ui/Table';
import type { Column } from '~/components/ui/Table';

interface NewsItem {
  id: number;
  title: string;
  category: string;
  status: string;
  publishDate: string;
  scheduledFor?: string;
  createdAt: string;
}

const mockNews: readonly NewsItem[] = [
  { id: 1, title: 'New Tour Launch in Madrid', category: 'Announcement', status: 'Published', publishDate: '2025-01-01', createdAt: '2025-01-01' },
  { id: 2, title: 'Summer Discount Campaign', category: 'Promotion', status: 'Published', publishDate: '2025-01-02', createdAt: '2025-01-02' },
  { id: 3, title: 'Museum Hours Update', category: 'Information', status: 'Scheduled', publishDate: '2025-01-10', scheduledFor: '2025-01-10', createdAt: '2025-01-03' },
  { id: 4, title: 'Holiday Special Tours', category: 'Promotion', status: 'Draft', publishDate: '', createdAt: '2025-01-04' },
];

export default function News() {
  const columns: Column<NewsItem>[] = [
    { key: 'title', label: 'Title' },
    { key: 'category', label: 'Category' },
    {
      key: 'status',
      label: 'Status',
      render: (value: string) => {
        const statusColors: Record<string, string> = {
          Published: 'bg-green-100 text-green-800',
          Scheduled: 'bg-blue-100 text-blue-800',
          Draft: 'bg-yellow-100 text-yellow-800',
        };
        return (
          <span
            className={`inline-block px-2 py-1 rounded text-xs font-medium ${
              statusColors[value] || 'bg-gray-100 text-gray-800'
            }`}
          >
            {value}
          </span>
        );
      },
    },
    { key: 'publishDate', label: 'Publish Date' },
    { key: 'scheduledFor', label: 'Scheduled For' },
    { key: 'createdAt', label: 'Created At' },
  ];

  return (
    <div className="space-y-6">
      <Card
        title="All News"
        actions={<Button variant="primary">Create New Article</Button>}
      >
            <div className="mb-4 flex gap-4">
              <input
                type="search"
                placeholder="Search news..."
                className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">All Categories</option>
                <option value="Announcement">Announcement</option>
                <option value="Promotion">Promotion</option>
                <option value="Information">Information</option>
              </select>
              <select className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">All Status</option>
                <option value="Published">Published</option>
                <option value="Scheduled">Scheduled</option>
                <option value="Draft">Draft</option>
              </select>
            </div>

            <Table data={mockNews} columns={columns} />
          </Card>

          <Card title="News Statistics">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatCard title="Total Articles" value="89" />
              <StatCard title="Published" value="65" />
              <StatCard title="Scheduled" value="12" />
              <StatCard title="Drafts" value="12" />
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
