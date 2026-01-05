/**
 * Reservations Route - Reservations Management
 */

import { useState } from 'react';
import { Card } from '~/components/ui/Card';
import { Button } from '~/components/ui/Button';
import { Table } from '~/components/ui/Table';
import Select from '~/components/ui/Select';
import type { Column } from '~/components/ui/Table';

interface Reservation {
  id: number;
  customerName: string;
  customerEmail: string;
  tourName: string;
  date: string;
  time: string;
  participants: number;
  totalPrice: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
}

const mockReservations: readonly Reservation[] = [
  {
    id: 1,
    customerName: 'John Doe',
    customerEmail: 'john@example.com',
    tourName: 'Historical City Center Tour',
    date: '2025-01-15',
    time: '10:00',
    participants: 4,
    totalPrice: 180,
    status: 'Confirmed',
    paymentStatus: 'Paid',
    createdAt: '2025-01-01',
  },
  {
    id: 2,
    customerName: 'Jane Smith',
    customerEmail: 'jane@example.com',
    tourName: 'Food Market Experience',
    date: '2025-01-16',
    time: '14:00',
    participants: 2,
    totalPrice: 120,
    status: 'Pending',
    paymentStatus: 'Pending',
    createdAt: '2025-01-02',
  },
  {
    id: 3,
    customerName: 'Bob Johnson',
    customerEmail: 'bob@example.com',
    tourName: 'Museum Private Tour',
    date: '2025-01-14',
    time: '09:00',
    participants: 6,
    totalPrice: 450,
    status: 'Completed',
    paymentStatus: 'Paid',
    createdAt: '2025-01-03',
  },
  {
    id: 4,
    customerName: 'Alice Brown',
    customerEmail: 'alice@example.com',
    tourName: 'Beach Walk',
    date: '2025-01-17',
    time: '11:00',
    participants: 3,
    totalPrice: 135,
    status: 'Confirmed',
    paymentStatus: 'Pending',
    createdAt: '2025-01-04',
  },
];

export default function Reservations() {
  const columns: Column<Reservation>[] = [
    { key: 'customerName', label: 'Customer' },
    { key: 'customerEmail', label: 'Email' },
    { key: 'tourName', label: 'Tour' },
    { key: 'date', label: 'Date' },
    { key: 'time', label: 'Time' },
    { key: 'participants', label: 'Participants' },
    {
      key: 'totalPrice',
      label: 'Total',
      render: (value: number) => `$${value}`,
    },
    {
      key: 'status',
      label: 'Status',
      render: (value: string) => {
        const statusColors: Record<string, string> = {
          Confirmed: 'bg-green-100 text-green-800',
          Pending: 'bg-yellow-100 text-yellow-800',
          Completed: 'bg-blue-100 text-blue-800',
          Cancelled: 'bg-red-100 text-red-800',
          Refunded: 'bg-gray-100 text-gray-800',
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
    {
      key: 'paymentStatus',
      label: 'Payment',
      render: (value: string) => {
        const paymentColors: Record<string, string> = {
          Paid: 'bg-green-100 text-green-800',
          Pending: 'bg-yellow-100 text-yellow-800',
          Failed: 'bg-red-100 text-red-800',
          Refunded: 'bg-gray-100 text-gray-800',
        };
        return (
          <span
            className={`inline-block px-2 py-1 rounded text-xs font-medium ${
              paymentColors[value] || 'bg-gray-100 text-gray-800'
            }`}
          >
            {value}
          </span>
        );
      },
    },
    { key: 'createdAt', label: 'Created' },
  ];

  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');

  return (
    <div className="space-y-6">
      <Card
        title="All Reservations"
        actions={<Button variant="primary">Create Reservation</Button>}
      >
            <div className="mb-4 flex gap-4 flex-wrap">
              <input
                type="search"
                placeholder="Search reservations..."
                className="flex-1 min-w-[200px] px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="date"
                className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Select
                options={[
                  { value: '', label: 'All Status' },
                  { value: 'Confirmed', label: 'Confirmed' },
                  { value: 'Pending', label: 'Pending' },
                  { value: 'Completed', label: 'Completed' },
                  { value: 'Cancelled', label: 'Cancelled' },
                  { value: 'Refunded', label: 'Refunded' },
                ]}
                value={statusFilter}
                onChange={setStatusFilter}
                placeholder="All Status"
                className="select-compact"
              />
              <Select
                options={[
                  { value: '', label: 'All Payment Status' },
                  { value: 'Paid', label: 'Paid' },
                  { value: 'Pending', label: 'Pending' },
                  { value: 'Failed', label: 'Failed' },
                  { value: 'Refunded', label: 'Refunded' },
                ]}
                value={paymentFilter}
                onChange={setPaymentFilter}
                placeholder="All Payment Status"
                className="select-compact"
              />
            </div>

            <Table data={mockReservations} columns={columns} />
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card title="Reservations Statistics">
              <div className="grid grid-cols-2 gap-4">
                <StatCard title="Total" value="127" />
                <StatCard title="Today" value="12" />
                <StatCard title="This Week" value="45" />
                <StatCard title="This Month" value="127" />
              </div>
            </Card>

            <Card title="Revenue Overview">
              <div className="grid grid-cols-2 gap-4">
                <StatCard title="Total Revenue" value="$45,230" />
                <StatCard title="Pending Revenue" value="$8,500" />
                <StatCard title="Avg. Order" value="$356" />
                <StatCard title="Conversion" value="12.5%" />
              </div>
            </Card>
          </div>

          <Card title="Upcoming Reservations">
            <div className="space-y-4">
              {[
                { tour: 'Historical City Center Tour', time: 'Tomorrow 10:00', customers: 4 },
                { tour: 'Food Market Experience', time: 'Tomorrow 14:00', customers: 6 },
                { tour: 'Museum Private Tour', time: 'Jan 15 09:00', customers: 2 },
              ].map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900">{item.tour}</p>
                    <p className="text-sm text-gray-500">{item.time}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{item.customers} guests</p>
                  </div>
                </div>
              ))}
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
