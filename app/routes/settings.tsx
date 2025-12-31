/**
 * Settings Route - Application Settings
 */

import { Sidebar } from '~/components/layout/Sidebar';
import { Header } from '~/components/layout/Header';
import { Card } from '~/components/ui/Card';
import { Button } from '~/components/ui/Button';
import { Input } from '~/components/ui/Input';

export default function Settings() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <main className="ml-64 pt-16">
        <Header title="Application Settings" />

        <div className="p-6 space-y-6">
          <Card title="General Settings" actions={<Button variant="primary">Save Changes</Button>}>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input label="Application Name" placeholder="Tours Admin" defaultValue="Tours Admin" />
                <Input label="Support Email" type="email" placeholder="support@tours.com" defaultValue="support@tours.com" />
                <Input label="Contact Phone" type="tel" placeholder="+1 234 567 890" />
                <Input label="Default Language" type="select">
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                </Input>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Currency
                </label>
                <select className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="MXN">MXN - Mexican Peso</option>
                </select>
              </div>
            </div>
          </Card>

          <Card title="Design & Branding" actions={<Button variant="primary">Save Changes</Button>}>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Primary Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      defaultValue="#3B82F6"
                      className="w-12 h-12 rounded cursor-pointer"
                    />
                    <Input defaultValue="#3B82F6" className="flex-1" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Secondary Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      defaultValue="#10B981"
                      className="w-12 h-12 rounded cursor-pointer"
                    />
                    <Input defaultValue="#10B981" className="flex-1" />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Logo
                </label>
                <div className="flex items-center gap-4">
                  <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
                    <span className="text-gray-500">Logo</span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm">Upload</Button>
                    <Button variant="ghost" size="sm">Remove</Button>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card title="Payment Settings" actions={<Button variant="primary">Save Changes</Button>}>
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">Mercado Pago Configuration</h4>
                <p className="text-sm text-blue-700">
                  Configure your Mercado Pago integration to accept payments in Mexico
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input label="Access Token" type="password" placeholder="Enter access token" />
                <Input label="Public Key" type="password" placeholder="Enter public key" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Methods
                </label>
                <div className="space-y-2">
                  {[
                    { name: 'Credit Card', enabled: true },
                    { name: 'Debit Card', enabled: true },
                    { name: 'Cash', enabled: true },
                    { name: 'OXXO', enabled: false },
                    { name: 'Spei', enabled: false },
                  ].map((method) => (
                    <label key={method.name} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer">
                      <input
                        type="checkbox"
                        defaultChecked={method.enabled}
                        className="w-5 h-5 rounded"
                      />
                      <span className="font-medium text-gray-900">{method.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <Card title="Email Notifications" actions={<Button variant="primary">Save Changes</Button>}>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SMTP Server
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input label="Host" placeholder="smtp.gmail.com" />
                  <Input label="Port" type="number" placeholder="587" />
                  <Input label="Username" placeholder="your@email.com" />
                  <Input label="Password" type="password" placeholder="•••••••••" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notification Templates
                </label>
                <div className="space-y-2">
                  {[
                    { name: 'New Reservation', enabled: true },
                    { name: 'Reservation Confirmation', enabled: true },
                    { name: 'Payment Received', enabled: true },
                    { name: 'Tour Reminder (24h)', enabled: true },
                    { name: 'Cancellation Notice', enabled: true },
                  ].map((template) => (
                    <label key={template.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer">
                      <span className="font-medium text-gray-900">{template.name}</span>
                      <input
                        type="checkbox"
                        defaultChecked={template.enabled}
                        className="w-5 h-5 rounded"
                      />
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <Card title="Integration Settings" actions={<Button variant="primary">Save Changes</Button>}>
            <div className="space-y-6">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h4 className="font-semibold text-purple-900 mb-2">Auth0 Configuration</h4>
                <p className="text-sm text-purple-700">
                  Configure Auth0 for secure authentication and role-based access control
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input label="Domain" placeholder="your-domain.auth0.com" />
                <Input label="Client ID" placeholder="Enter client ID" />
                <Input label="Client Secret" type="password" placeholder="Enter client secret" />
                <Input label="Audience" placeholder="https://your-api.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enabled Providers
                </label>
                <div className="flex gap-4">
                  {['Google', 'Email/Password'].map((provider) => (
                    <label key={provider} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg cursor-pointer">
                      <input type="checkbox" defaultChecked className="w-5 h-5 rounded" />
                      <span className="font-medium text-gray-900">{provider}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <Card title="Danger Zone">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 space-y-4">
              <h4 className="font-semibold text-red-900">Dangerous Actions</h4>
              <p className="text-sm text-red-700">
                These actions are irreversible. Please proceed with caution.
              </p>
              <div className="flex gap-4">
                <Button variant="danger">Export All Data</Button>
                <Button variant="danger">Clear Cache</Button>
                <Button variant="danger">Reset to Defaults</Button>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
