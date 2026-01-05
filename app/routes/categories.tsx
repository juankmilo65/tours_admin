/**
 * Categories Route - Categories Management
 */

import { useLoaderData } from '@remix-run/react';
import type { LoaderFunctionArgs } from '@remix-run/node';
import { Card } from '~/components/ui/Card';
import { Button } from '~/components/ui/Button';
import { Table } from '~/components/ui/Table';
import type { Column } from '~/components/ui/Table';
import categoriesBL from '~/server/businessLogic/categoriesBusinessLogic';
import { getSession } from '~/utilities/sessions';

interface Category {
  id: string;
  slug: string;
  name_es: string;
  description_es?: string;
  name_en: string;
  description_en?: string;
  imageUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface LoaderData {
  categories: Category[];
  language: string;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const currentLanguage = session.get("language") as string || 'es';
  
  const formData = new FormData();
  formData.append("action", 'getCategoriesBusiness');
  formData.append("language", currentLanguage);
  formData.append("isActive", 'true');
  
  const categoriesResult = await categoriesBL(formData) as { success: boolean; data: Category[] };
  const categories = categoriesResult.success ? categoriesResult.data : [];
  
  return {
    categories,
    language: currentLanguage
  };
}

export default function Categories() {
  const loaderData = useLoaderData<LoaderData>();
  const { categories, language } = loaderData;
  
  const columns: Column<Category>[] = [
    {
      key: 'name_es',
      label: 'Name',
      render: (_value: string, row: Category) => (
        <div className="flex items-center gap-2">
          <span>{language === 'es' ? row.name_es : row.name_en}</span>
        </div>
      ),
    },
    { key: 'slug', label: 'Slug' },
    {
      key: 'description_es',
      label: 'Description',
      render: (_value: string | undefined, row: Category) => (
        <span className="text-sm text-gray-600">
          {language === 'es' ? row.description_es : row.description_en}
        </span>
      ),
    },
    {
      key: 'isActive',
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
    {
      key: 'createdAt',
      label: 'Created At',
      render: (value: string) => new Date(value).toLocaleDateString()
    },
  ];

  return (
    <div className="space-y-6">
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

            <Table data={categories} columns={columns} />
          </Card>

          <Card title="Categories Statistics">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard title="Total Categories" value={categories.length.toString()} />
              <StatCard title="Active Categories" value={categories.filter(c => c.isActive).length.toString()} />
              <StatCard title="Inactive Categories" value={categories.filter(c => !c.isActive).length.toString()} />
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
