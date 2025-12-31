/**
 * Users Route - Users and Roles Management
 */

import { Sidebar } from '~/components/layout/Sidebar';
import { Header } from '~/components/layout/Header';
import { Card } from '~/components/ui/Card';
import { Button } from '~/components/ui/Button';
import { Table } from '~/components/ui/Table';
import type { Column } from '~/components/ui/Table';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  subscriptionPlan: string;
  subscriptionStatus: string;
  lastLogin: string;
  createdAt: string;
}

const mockUsers: readonly User[] = [
  {
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
    role: 'Admin',
    subscriptionPlan: 'Top',
    subscriptionStatus: 'Active',
    lastLogin: '2025-01-05 10:30',
    createdAt: '2025-01-01',
  },
  {
    id: 2,
    name: 'Jane Smith',
    email: 'jane@example.com',
    role: 'Staff',
    subscriptionPlan: 'Premium',
    subscriptionStatus: 'Active',
    lastLogin: '2025-01-05 09:15',
    createdAt: '2025-01-02',
  },
  {
    id: 3,
    name: 'Bob Johnson',
    email: 'bob@example.com',
    role: 'Staff',
    subscriptionPlan: 'Basic',
    subscriptionStatus: 'Active',
    lastLogin: '2025-01-04 14:20',
    createdAt: '2025-01-03',
  },
  {
    id: 4,
    name: 'Alice Brown',
    email: 'alice@example.com',
    role: 'Staff',
    subscriptionPlan: 'Premium',
    subscriptionStatus: 'Inactive',
    lastLogin: '2025-01-03 11:00',
    createdAt: '2025-01-04',
  },
];

export default function Users() {
  const columns: Column<User>[] = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    {
      key: 'role',
      label: 'Role',
      render: (value: string) => {
        const roleColors: Record<string, string> = {
          Admin: 'bg-purple-100 text-purple-800',
          Staff: 'bg-blue-100 text-blue-800',
        };
        return (
          <span
            className={`inline-block px-2 py-1 rounded text-xs font-medium ${
              roleColors[value] || 'bg-gray-100 text-gray-800'
            }`}
          >
            {value}
          </span>
        );
      },
    },
    { key: 'subscriptionPlan', label: 'Plan' },
    {
      key: 'subscriptionStatus',
      label: 'Status',
      render: (value: string) => {
        const statusColors: Record<string, string> = {
          Active: 'bg-green-100 text-green-800',
          Inactive: 'bg-red-100 text-red-800',
          Cancelled: 'bg-gray-100 text-gray-800',
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
    { key: 'lastLogin', label: 'Last Login' },
    { key: 'createdAt', label: 'Created' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <main className="ml-64 pt-16">
        <Header title="Users & Roles Management" />

        <div className="p-6 space-y-6">
          <Card
            title="All Users"
            actions={
              <div className="flex gap-2">
                <Button variant="secondary">Export</Button>
                <Button variant="primary">Add New User</Button>
              </div>
            }
          >
            <div className="mb-4 flex gap-4 flex-wrap">
              <input
                type="search"
                placeholder="Search users..."
                className="flex-1 min-w-[200px] px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">All Roles</option>
                <option value="Admin">Admin</option>
                <option value="Staff">Staff</option>
              </select>
              <select className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">All Plans</option>
                <option value="Basic">Basic</option>
                <option value="Premium">Premium</option>
                <option value="Top">Top</option>
              </select>
              <select className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            <Table data={mockUsers} columns={columns} />
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card title="User Statistics">
              <div className="space-y-4">
                <StatCard title="Total Users" value="1,847" />
                <StatCard title="Active Users" value="1,234" />
                <StatCard title="Inactive Users" value="613" />
              </div>
            </Card>

            <Card title="Role Distribution">
              <div className="space-y-4">
                <RoleStat label="Admin" count={12} color="purple" />
                <RoleStat label="Staff" count={156} color="blue" />
                <RoleStat label="Users" count={1679} color="gray" />
              </div>
            </Card>

            <Card title="Subscription Plans">
              <div className="space-y-4">
                <PlanStat label="Basic" count={845} percentage="46%" />
                <PlanStat label="Premium" count={612} percentage="33%" />
                <PlanStat label="Top" count={390} percentage="21%" />
              </div>
            </Card>
          </div>

          <Card title="Recent Activity">
            <div className="space-y-4">
              {[
                { user: 'Jane Smith', action: 'Logged in', time: '2 minutes ago' },
                { user: 'John Doe', action: 'Updated profile', time: '15 minutes ago' },
                { user: 'Bob Johnson', action: 'Created reservation', time: '1 hour ago' },
                { user: 'Alice Brown', action: 'Cancelled subscription', time: '2 hours ago' },
              ].map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900">{item.user}</p>
                    <p className="text-sm text-gray-500">{item.action}</p>
                  </div>
                  <p className="text-sm text-gray-500">{item.time}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="bg-gray-50 p-3 rounded-lg">
      <p className="text-xs text-gray-500">{title}</p>
      <p className="text-xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function RoleStat({ label, count, color }: { label: string; count: string | number; color: string }) {
  const colorClasses: Record<string, string> = {
    purple: 'bg-purple-100 text-purple-800',
    blue: 'bg-blue-100 text-blue-800',
    gray: 'bg-gray-100 text-gray-800',
  };
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span
          className={`inline-block w-3 h-3 rounded ${colorClasses[color]}`}
        />
        <span className="text-sm text-gray-700">{label}</span>
      </div>
      <span className="font-semibold text-gray-900">{count}</span>
    </div>
  );
}

function PlanStat({ label, count, percentage }: { label: string; count: number; percentage: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-gray-700">{label}</span>
        <span className="text-sm font-semibold text-gray-900">{count}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full"
          style={{ width: percentage }}
        />
      </div>
      <p className="text-xs text-gray-500 mt-1">{percentage}</p>
    </div>
  );
}
