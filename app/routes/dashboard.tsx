/**
 * Dashboard Route - Main Admin Dashboard
 */

import { Card } from '~/components/ui/Card';
import { Button } from '~/components/ui/Button';

export default function Dashboard() {
  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KPICard
              title="Active Reservations"
              value="127"
              change="+12%"
              positive
            />
            <KPICard
              title="Completed Payments"
              value="$45,230"
              change="+8%"
              positive
            />
            <KPICard
              title="Popular Tours"
              value="23"
              change="-2%"
            />
            <KPICard
              title="Total Users"
              value="1,847"
              change="+15%"
              positive
            />
          </div>

          {/* Recent Activity */}
          <Card title="Recent Reservations">
            <div className="space-y-4">
              {[
                { id: 1, tour: 'City Tour', customer: 'John Doe', date: '2025-01-02', status: 'Confirmed' },
                { id: 2, tour: 'Museum Visit', customer: 'Jane Smith', date: '2025-01-02', status: 'Pending' },
                { id: 3, tour: 'Food Tour', customer: 'Bob Johnson', date: '2025-01-01', status: 'Completed' },
                { id: 4, tour: 'Beach Walk', customer: 'Alice Brown', date: '2025-01-01', status: 'Confirmed' },
              ].map((reservation) => (
                <div
                  key={reservation.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900">{reservation.tour}</p>
                    <p className="text-sm text-gray-500">{reservation.customer}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">{reservation.date}</p>
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        reservation.status === 'Confirmed'
                          ? 'bg-green-100 text-green-800'
                          : reservation.status === 'Completed'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {reservation.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Button variant="secondary" className="w-full">
                View All Reservations
              </Button>
            </div>
          </Card>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <QuickActionCard
              title="Create New Tour"
              description="Add a new tour to your catalog"
              icon="🏛️"
            />
            <QuickActionCard
              title="Manage Users"
              description="View and manage user accounts"
              icon="👥"
            />
            <QuickActionCard
              title="View Reports"
              description="See analytics and performance metrics"
              icon="📊"
            />
        </div>
      </div>
  );
}

function KPICard({
  title,
  value,
  change,
  positive = false,
}: {
  title: string;
  value: string;
  change: string;
  positive?: boolean;
}) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
      <div className="mt-4 flex items-center gap-2">
        <span
          className={`text-sm font-medium ${
            positive ? 'text-green-600' : 'text-red-600'
          }`}
        >
          {change}
        </span>
        <span className="text-sm text-gray-500">from last month</span>
      </div>
    </div>
  );
}

function QuickActionCard({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 mb-4">{description}</p>
      <Button variant="secondary" className="w-full">
        Go to {title}
      </Button>
    </div>
  );
}
