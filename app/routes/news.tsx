/**
 * News Route - News and Content Management
 */

import type { JSX } from 'react';
import type { LoaderFunctionArgs } from '@remix-run/node';
import { requireAuth } from '~/utilities/auth.loader';
import { useState, useEffect, useRef, useMemo } from 'react';
import { Card } from '~/components/ui/Card';
import { Button } from '~/components/ui/Button';
import { Table } from '~/components/ui/Table';
import Select from '~/components/ui/Select';
import {
  getNews,
  createNews,
  uploadNewsImages,
  updateNews,
  publishNews,
  deleteNewsImage,
  setImageAsCover,
  toggleNewsStatus,
  type News,
  type NewsImage,
  type NewsResponse,
  type CreateNewsDto,
} from '~/server/news';
import type { Column } from '~/components/ui/Table';
import { useAppDispatch } from '~/store/hooks';
import { setGlobalLoading } from '~/store/slices/uiSlice';
import { useTranslation } from '~/lib/i18n/utils';
import { Input } from '~/components/ui/Input';
import { Dialog } from '~/components/ui/Dialog';
import { selectAuthToken } from '~/store/slices/authSlice';
import { useAppSelector } from '~/store/hooks';

export async function loader(args: LoaderFunctionArgs): Promise<null> {
  await requireAuth(args);
  return null;
}

export default function NewsRoute(): JSX.Element {
  const { t, language } = useTranslation();

  // Auth token for API calls
  const token = useAppSelector(selectAuthToken);

  // Local state for news and pagination
  const [news, setNews] = useState<News[]>([]);

  // Local state for modal and form
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newArticle, setNewArticle] = useState<CreateNewsDto>({
    title_es: '',
    title_en: '',
    content_es: '',
    content_en: '',
    excerpt_es: '',
    excerpt_en: '',
    author: '',
    isActive: true,
    isPublished: false,
  });
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<NewsImage[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingNewsId, setEditingNewsId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: '', message: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [publishedFilter, setPublishedFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const isInitialMount = useRef(true);
  const dispatch = useAppDispatch();

  // Fetch news when filters or pagination change (but not on initial mount)
  useEffect(() => {
    // Skip fetch on initial mount
    if (isInitialMount.current === true) {
      isInitialMount.current = false;
      return;
    }

    const fetchNews = async () => {
      // Show global loader when fetching starts
      dispatch(setGlobalLoading({ isLoading: true, message: t('common.loading') }));

      try {
        const result = (await getNews({
          page,
          limit,
          isActive: activeFilter === '' ? undefined : activeFilter === 'true',
          isPublished: publishedFilter === '' ? undefined : publishedFilter === 'true',
          language,
        })) as NewsResponse;

        if (result.success === true && result.data !== undefined) {
          setNews(result.data);
          setPagination(result.pagination);
          // Hide loader after state is updated (React will render before this)
          dispatch(setGlobalLoading({ isLoading: false, message: '' }));
        } else {
          // Hide loader if no success
          dispatch(setGlobalLoading({ isLoading: false, message: '' }));
        }
      } catch (error) {
        console.error('Error fetching news:', error);
        setNews([]);
        setPagination({ page: 1, limit: 10, total: 0, totalPages: 0 });
        // Hide loader on error after React renders
        window.requestAnimationFrame(() => {
          dispatch(setGlobalLoading({ isLoading: false, message: '' }));
        });
      }
    };

    void fetchNews();
  }, [page, activeFilter, publishedFilter, limit, language, dispatch, t]);

  // Handle image previews
  const imagePreviews = useMemo(() => {
    return selectedImages.map((file) => URL.createObjectURL(file));
  }, [selectedImages]);

  const resetForm = () => {
    setNewArticle({
      title_es: '',
      title_en: '',
      content_es: '',
      content_en: '',
      excerpt_es: '',
      excerpt_en: '',
      author: '',
      isActive: true,
      isPublished: false,
    });
    setSelectedImages([]);
    setExistingImages([]);
    setErrors({});
    setIsEditMode(false);
    setEditingNewsId(null);
  };

  const handleOpenEditModal = (article: News) => {
    setNewArticle({
      title_es: article.title_es,
      title_en: article.title_en,
      content_es: article.content_es,
      content_en: article.content_en,
      excerpt_es: article.excerpt_es ?? '',
      excerpt_en: article.excerpt_en ?? '',
      author: article.author,
      isActive: article.isActive,
      isPublished: article.isPublished,
    });
    // Map imageUrl to url for display
    const mappedImages = article.newsImages.map((img) => ({
      ...img,
      url: img.imageUrl ?? img.url,
    }));
    setExistingImages(mappedImages);
    setIsEditMode(true);
    setEditingNewsId(article.id);
    setIsCreateModalOpen(true);
  };

  // Handle status toggle
  const handleToggleActiveStatus = async (article: News) => {
    if (token === null || token === '') return;

    try {
      dispatch(
        setGlobalLoading({
          isLoading: true,
          message: t('news.updating') ?? 'Updating...',
        })
      );

      const result = (await toggleNewsStatus(article.id, token, language)) as {
        success?: boolean;
        message?: string;
        error?: { message?: string };
      };

      if (result.success === true) {
        setNews(news.map((n) => (n.id === article.id ? { ...n, isActive: !n.isActive } : n)));
        // Hide loader after React finishes rendering
        window.requestAnimationFrame(() => {
          dispatch(setGlobalLoading({ isLoading: false, message: '' }));
        });
      } else {
        setErrorModal({
          isOpen: true,
          title: t('news.errorUpdateTitle'),
          message: result.message ?? result.error?.message ?? t('news.errorUpdate'),
        });
        // Hide loader on error after React renders
        window.requestAnimationFrame(() => {
          dispatch(setGlobalLoading({ isLoading: false, message: '' }));
        });
      }
    } catch (error) {
      console.error('Error toggling news status:', error);
      // Hide loader on exception
      dispatch(setGlobalLoading({ isLoading: false, message: '' }));
    }
  };

  // Handle toggle published status
  const handleTogglePublishedStatus = async (article: News) => {
    if (token === null || token === '') return;

    try {
      dispatch(
        setGlobalLoading({
          isLoading: true,
          message: article.isPublished ? t('news.unpublishing') : t('news.publishing'),
        })
      );

      const result = (await publishNews(article.id, token, language)) as {
        success?: boolean;
        message?: string;
        error?: { message?: string };
      };

      if (result.success === true) {
        setNews(news.map((n) => (n.id === article.id ? { ...n, isPublished: !n.isPublished } : n)));
        // Hide loader after React finishes rendering
        window.requestAnimationFrame(() => {
          dispatch(setGlobalLoading({ isLoading: false, message: '' }));
        });
      } else {
        setErrorModal({
          isOpen: true,
          title: t('news.errorPublish'),
          message: result.message ?? result.error?.message ?? t('news.errorPublish'),
        });
        // Hide loader on error after React renders
        window.requestAnimationFrame(() => {
          dispatch(setGlobalLoading({ isLoading: false, message: '' }));
        });
      }
    } catch (error) {
      console.error('Error toggling published status:', error);
      // Hide loader on exception
      dispatch(setGlobalLoading({ isLoading: false, message: '' }));
    }
  };

  // Handle delete image
  const handleDeleteImage = async (imageId: string) => {
    if (token === null || token === '' || editingNewsId === null) return;

    try {
      dispatch(
        setGlobalLoading({
          isLoading: true,
          message: t('news.updating') ?? 'Updating...',
        })
      );

      const result = (await deleteNewsImage(editingNewsId, imageId, token, language)) as {
        success?: boolean;
        message?: string;
        error?: { message?: string };
      };

      if (result.success === true) {
        setExistingImages(existingImages.filter((img) => img.id !== imageId));
        window.requestAnimationFrame(() => {
          dispatch(setGlobalLoading({ isLoading: false, message: '' }));
        });
      } else {
        setErrorModal({
          isOpen: true,
          title: t('news.errorDeleteImage'),
          message: result.message ?? result.error?.message ?? t('news.errorDeleteImage'),
        });
        window.requestAnimationFrame(() => {
          dispatch(setGlobalLoading({ isLoading: false, message: '' }));
        });
      }
    } catch (error) {
      console.error('Error deleting image:', error);
    }
  };

  // Handle set as cover
  const handleSetAsCover = async (imageId: string) => {
    if (token === null || token === '' || editingNewsId === null) return;

    try {
      dispatch(
        setGlobalLoading({
          isLoading: true,
          message: t('news.updating') ?? 'Updating...',
        })
      );

      const result = (await setImageAsCover(editingNewsId, imageId, token, language)) as {
        success?: boolean;
        message?: string;
        error?: { message?: string };
      };

      if (result.success === true) {
        setExistingImages(
          existingImages.map((img) => ({
            ...img,
            isCover: img.id === imageId,
          }))
        );
        window.requestAnimationFrame(() => {
          dispatch(setGlobalLoading({ isLoading: false, message: '' }));
        });
      } else {
        setErrorModal({
          isOpen: true,
          title: t('news.errorSetCover'),
          message: result.message ?? result.error?.message ?? t('news.errorSetCover'),
        });
        window.requestAnimationFrame(() => {
          dispatch(setGlobalLoading({ isLoading: false, message: '' }));
        });
      }
    } catch (error) {
      console.error('Error setting cover image:', error);
    }
  };

  // Handle create or update news article
  const handleSaveNews = async () => {
    if (token === null || token === '') {
      console.error('No token available');
      return;
    }

    // Validation (Visual)
    const newErrors: Record<string, string> = {};

    if (!newArticle.title_es.trim()) newErrors.title_es = t('news.validation.titleRequired');
    if (!newArticle.title_en.trim()) newErrors.title_en = t('news.validation.titleRequired');
    if (!newArticle.content_es.trim()) newErrors.content_es = t('news.validation.contentRequired');
    if (!newArticle.content_en.trim()) newErrors.content_en = t('news.validation.contentRequired');
    if (!newArticle.author.trim()) newErrors.author = t('news.validation.authorRequired');

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Clear errors if valid
    setErrors({});

    try {
      dispatch(
        setGlobalLoading({
          isLoading: true,
          message: isEditMode
            ? (t('news.updating') ?? 'Updating...')
            : (t('news.creating') ?? 'Creating...'),
        })
      );

      let articleId = editingNewsId;

      // Step 1: Create or Update Article Metadata
      if (isEditMode === true && articleId !== null) {
        // Update
        const result = (await updateNews(articleId, newArticle, token, language)) as {
          success?: boolean;
          message?: string;
          error?: { message?: string };
        };

        if (result.error !== undefined || result.success === false) {
          console.error('Error updating news:', result.error ?? result);
          window.requestAnimationFrame(() => {
            dispatch(setGlobalLoading({ isLoading: false, message: '' }));
          });
          setErrorModal({
            isOpen: true,
            title: t('news.errorUpdateTitle') ?? 'Error',
            message: result.message ?? result.error?.message ?? t('news.errorUpdate'),
          });
          return;
        }
      } else {
        // Create
        const articleData: CreateNewsDto = {
          ...newArticle,
        };

        const result = (await createNews(articleData, token, language)) as {
          success?: boolean;
          message?: string;
          data?: { id: string };
          error?: { message?: string };
        };

        if (
          result.error !== undefined ||
          result.success === false ||
          result.data?.id === undefined
        ) {
          console.error('Error creating news:', result.error ?? result);
          window.requestAnimationFrame(() => {
            dispatch(setGlobalLoading({ isLoading: false, message: '' }));
          });
          setErrorModal({
            isOpen: true,
            title: t('news.errorCreateTitle'),
            message: result.message ?? result.error?.message ?? t('news.errorCreate'),
          });
          return;
        }
        articleId = result.data.id;
      }

      // Step 2: Upload Images if selected
      if (selectedImages.length > 0 && articleId !== null && articleId !== '') {
        dispatch(
          setGlobalLoading({
            isLoading: true,
            message: t('news.uploadingImages') ?? 'Uploading Images...',
          })
        );

        const uploadResult = (await uploadNewsImages(
          articleId,
          selectedImages,
          existingImages.length === 0, // Set first image as cover if no existing images
          token,
          language
        )) as {
          success?: boolean;
          message?: string;
          error?: { message?: string };
        };

        if (uploadResult.error !== undefined || uploadResult.success === false) {
          console.error('Error uploading images:', uploadResult.error ?? uploadResult);
          window.requestAnimationFrame(() => {
            dispatch(setGlobalLoading({ isLoading: false, message: '' }));
          });
          setErrorModal({
            isOpen: true,
            title: t('news.imagesUploadFailed'),
            message:
              uploadResult.message ??
              uploadResult.error?.message ??
              t('news.newsCreatedButUploadFailed'),
          });
        } else {
          // Hide loader after successful upload and React renders
          window.requestAnimationFrame(() => {
            dispatch(setGlobalLoading({ isLoading: false, message: '' }));
          });
        }
      }

      // Success - Keep loader open while refetching
      setIsCreateModalOpen(false);
      resetForm();

      // Refetch
      const params = {
        page: 1,
        limit,
        isActive: activeFilter === '' ? undefined : activeFilter === 'true',
        isPublished: publishedFilter === '' ? undefined : publishedFilter === 'true',
        language,
      };

      const refreshResult = (await getNews(params)) as NewsResponse;
      if (refreshResult.success === true && refreshResult.data !== undefined) {
        setNews(refreshResult.data);
        setPagination(refreshResult.pagination);
        setPage(1);
        // Hide loader after React finishes rendering
        window.requestAnimationFrame(() => {
          dispatch(setGlobalLoading({ isLoading: false, message: '' }));
        });
      } else {
        // Hide loader even if refetch fails after React renders
        window.requestAnimationFrame(() => {
          dispatch(setGlobalLoading({ isLoading: false, message: '' }));
        });
      }
    } catch (error) {
      console.error('Error in news saving flow:', error);
      window.requestAnimationFrame(() => {
        dispatch(setGlobalLoading({ isLoading: false, message: '' }));
      });
      setErrorModal({
        isOpen: true,
        title: 'Unexpected Error',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  // Filter news by search term
  const filteredNews = news.filter((article) => {
    const searchLower = searchTerm.toLowerCase();
    const title = language === 'en' ? article.title_en : article.title_es;
    const excerpt = language === 'en' ? article.excerpt_en : article.excerpt_es;

    return (
      title.toLowerCase().includes(searchLower) ||
      (excerpt?.toLowerCase().includes(searchLower) ?? false) ||
      article.author.toLowerCase().includes(searchLower)
    );
  });

  const columns: Column<News>[] = [
    {
      key: 'title',
      label: t('news.title'),
      render: (_: unknown, row: News) => (
        <div>
          <div className="font-semibold text-gray-900 text-base">
            {language === 'en' ? row.title_en : row.title_es}
          </div>
          <div className="text-sm text-gray-500 mt-0.5">
            {language === 'en' ? row.excerpt_en : row.excerpt_es}
          </div>
        </div>
      ),
    },
    {
      key: 'author',
      label: t('news.author'),
      render: (value: unknown) => (
        <div className="text-sm text-gray-700 font-medium">{value as string}</div>
      ),
    },
    {
      key: 'isActive',
      label: t('news.activeStatus'),
      render: (value: unknown) => (
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
            (value as boolean)
              ? 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border border-green-200'
              : 'bg-gradient-to-r from-red-50 to-rose-50 text-red-700 border border-red-200'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              (value as boolean) ? 'bg-green-600' : 'bg-red-600'
            }`}
          />
          {(value as boolean) ? t('news.isActive') : t('common.inactive')}
        </span>
      ),
    },
    {
      key: 'isPublished',
      label: t('news.publishedStatus'),
      render: (value: unknown, row: News) => (
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
            (value as boolean)
              ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border border-blue-200'
              : 'bg-gradient-to-r from-yellow-50 to-amber-50 text-yellow-700 border border-yellow-200'
          }`}
        >
          {(value as boolean)
            ? t('news.published')
            : row.publishedAt !== undefined
              ? t('news.scheduled')
              : t('news.draft')}
        </span>
      ),
    },
    {
      key: 'newsImages',
      label: t('news.images'),
      render: (_: unknown, row: News) => (
        <div className="text-sm text-gray-600">
          {row.newsImages.length > 0
            ? `${row.newsImages.length} ${t('news.images')}`
            : t('news.noImages')}
        </div>
      ),
      hideOnMobile: true,
    },
    {
      key: 'createdAt',
      label: t('common.createdAt'),
      render: (value: unknown) => (
        <div className="text-sm text-gray-600">
          {new Date(value as string).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </div>
      ),
      hideOnMobile: true,
    },
    {
      key: 'id',
      label: t('news.actions'),
      render: (_: unknown, row: News) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          {/* Edit Button */}
          <button
            type="button"
            onClick={() => handleOpenEditModal(row)}
            style={{
              padding: '10px',
              borderRadius: '12px',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              color: '#2563eb',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.2)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            title={t('news.editNews')}
          >
            <svg
              style={{ width: '20px', height: '20px' }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </button>

          {/* Publish Toggle */}
          <button
            type="button"
            onClick={() => void handleTogglePublishedStatus(row)}
            style={{
              padding: '10px',
              borderRadius: '12px',
              backgroundColor: row.isPublished
                ? 'rgba(59, 130, 246, 0.1)'
                : 'rgba(34, 197, 94, 0.1)',
              color: row.isPublished ? '#2563eb' : '#22c55e',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = row.isPublished
                ? 'rgba(59, 130, 246, 0.2)'
                : 'rgba(34, 197, 94, 0.2)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = row.isPublished
                ? 'rgba(59, 130, 246, 0.1)'
                : 'rgba(34, 197, 94, 0.1)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            title={row.isPublished ? t('news.unpublishing') : t('news.publish')}
          >
            <svg
              style={{ width: '20px', height: '20px' }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {row.isPublished ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              )}
            </svg>
          </button>

          {/* Active Status Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              onClick={() => void handleToggleActiveStatus(row)}
              style={{
                position: 'relative',
                width: '48px',
                height: '24px',
                backgroundColor: row.isActive ? '#10b981' : '#e5e7eb',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: row.isActive ? '0 0 10px rgba(16, 185, 129, 0.2)' : 'none',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: '2px',
                  left: row.isActive ? '26px' : '2px',
                  width: '20px',
                  height: '20px',
                  backgroundColor: 'white',
                  borderRadius: '50%',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                }}
              />
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <Card title={t('news.allNews')}>
        {/* Filters & Actions Toolbar */}
        <div
          style={{
            marginBottom: 'var(--space-6)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-4)',
          }}
        >
          {/* Search */}
          <div style={{ flex: 1 }}>
            <div style={{ position: 'relative' }}>
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: 0,
                  paddingLeft: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  pointerEvents: 'none',
                }}
              >
                <svg
                  style={{ height: '1.25rem', width: '1.25rem', color: 'var(--color-neutral-400)' }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <input
                type="search"
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
                placeholder={t('news.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>

          {/* Active Status Filter */}
          <div style={{ width: '14rem' }}>
            <Select
              options={[
                { value: '', label: t('news.allActiveStatus') },
                { value: 'true', label: t('common.active') },
                { value: 'false', label: t('common.inactive') },
              ]}
              value={activeFilter}
              onChange={(v: string) => {
                setActiveFilter(v);
                setPage(1);
              }}
              placeholder={t('news.allActiveStatus')}
              className="w-full"
            />
          </div>

          {/* Published Status Filter */}
          <div style={{ width: '14rem' }}>
            <Select
              options={[
                { value: '', label: t('news.allPublishedStatus') },
                { value: 'true', label: t('news.published') },
                { value: 'false', label: t('news.draft') },
              ]}
              value={publishedFilter}
              onChange={(v: string) => {
                setPublishedFilter(v);
                setPage(1);
              }}
              placeholder={t('news.allPublishedStatus')}
              className="w-full"
            />
          </div>

          {/* Add Button */}
          <Button
            variant="primary"
            className="whitespace-nowrap"
            onClick={() => {
              resetForm();
              setIsCreateModalOpen(true);
            }}
          >
            <span className="flex items-center gap-2">
              <svg
                style={{ width: '20px', height: '20px' }}
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              {t('news.addNewNews')}
            </span>
          </Button>
        </div>

        {/* Table */}
        {news.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
              />
            </svg>
            <p className="text-lg font-medium">{t('news.noNewsFound')}</p>
            <p className="text-sm">{t('news.noNewsDescription')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table data={filteredNews} columns={columns} />
          </div>
        )}

        {/* Pagination */}
        {pagination.total > 0 && (
          <div className="mt-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="text-sm text-gray-600">
              {t('news.showing')} <span className="font-medium">{(page - 1) * limit + 1}</span>{' '}
              {t('news.to')}{' '}
              <span className="font-medium">{Math.min(page * limit, pagination.total)}</span>{' '}
              {t('news.of')} <span className="font-medium">{pagination.total}</span>{' '}
              {t('news.results')}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page === 1}
                onClick={() => {
                  setPage((p) => Math.max(1, p - 1));
                }}
              >
                {t('news.previous')}
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === pagination.totalPages || Math.abs(p - page) <= 1)
                  .map((p, index, arr) => {
                    const prev = arr[index - 1];
                    const showEllipsis = prev !== undefined && prev + 1 !== p;

                    return (
                      <div key={p} className="flex items-center">
                        {showEllipsis && <span className="px-2 text-gray-400">...</span>}
                        <button
                          onClick={() => {
                            setPage(p);
                          }}
                          className={`px-3 py-1 rounded-md text-sm font-medium ${
                            page === p
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {p}
                        </button>
                      </div>
                    );
                  })}
              </div>
              <Button
                variant="secondary"
                size="sm"
                disabled={page === pagination.totalPages}
                onClick={() => {
                  setPage((p) => Math.min(pagination.totalPages, p + 1));
                }}
              >
                {t('news.next')}
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Create/Edit Modal */}
      <Dialog
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          resetForm();
        }}
        title={isEditMode === true ? t('news.editNewsTitle') : t('news.createNewsTitle')}
        size="lg"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setIsCreateModalOpen(false);
                resetForm();
              }}
            >
              {t('news.cancel')}
            </Button>
            <Button variant="primary" onClick={() => void handleSaveNews()}>
              {isEditMode === true ? t('common.save') : t('news.publish')}
            </Button>
          </>
        }
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 'var(--space-6)',
          }}
        >
          <Input
            label={t('news.titleEs')}
            placeholder="Título en español"
            value={newArticle.title_es}
            onChange={(e) => {
              setNewArticle({ ...newArticle, title_es: e.target.value });
              if (errors.title_es !== undefined && errors.title_es !== '')
                setErrors({ ...errors, title_es: '' });
            }}
            error={errors.title_es}
            required
          />
          <Input
            label={t('news.titleEn')}
            placeholder="Title in English"
            value={newArticle.title_en}
            onChange={(e) => {
              setNewArticle({ ...newArticle, title_en: e.target.value });
              if (errors.title_en !== undefined && errors.title_en !== '')
                setErrors({ ...errors, title_en: '' });
            }}
            error={errors.title_en}
            required
          />
          <Input
            label={t('news.excerptEs')}
            placeholder="Extracto corto en español"
            value={newArticle.excerpt_es}
            onChange={(e) => {
              setNewArticle({ ...newArticle, excerpt_es: e.target.value });
            }}
            required={false}
          />
          <Input
            label={t('news.excerptEn')}
            placeholder="Short excerpt in English"
            value={newArticle.excerpt_en}
            onChange={(e) => {
              setNewArticle({ ...newArticle, excerpt_en: e.target.value });
            }}
            required={false}
          />
          <Input
            label={t('news.author')}
            placeholder="Autor del artículo"
            value={newArticle.author}
            onChange={(e) => {
              setNewArticle({ ...newArticle, author: e.target.value });
              if (errors.author !== undefined && errors.author !== '')
                setErrors({ ...errors, author: '' });
            }}
            error={errors.author}
            required
            style={{ gridColumn: '1 / -1' }}
          />
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-2)',
              gridColumn: '1 / -1',
            }}
          >
            <label
              style={{
                display: 'block',
                marginBottom: 'var(--space-1)',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--font-weight-medium)',
                color: 'var(--color-neutral-700)',
              }}
            >
              {t('news.contentEs')}
            </label>
            <textarea
              value={newArticle.content_es}
              onChange={(e) => {
                setNewArticle({ ...newArticle, content_es: e.target.value });
                if (errors.content_es !== undefined && errors.content_es !== '')
                  setErrors({ ...errors, content_es: '' });
              }}
              placeholder="Contenido completo en español..."
              style={{
                width: '100%',
                minHeight: '150px',
                padding: 'var(--space-3)',
                border: `1px solid ${errors.content_es !== undefined && errors.content_es !== '' ? 'var(--color-error-500)' : 'var(--color-neutral-300)'}`,
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-base)',
                fontFamily: 'inherit',
                resize: 'vertical',
              }}
              required
            />
            {errors.content_es !== undefined && errors.content_es !== '' && (
              <p
                style={{
                  marginTop: 'var(--space-1)',
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-error-500)',
                }}
              >
                {errors.content_es}
              </p>
            )}
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-2)',
              gridColumn: '1 / -1',
            }}
          >
            <label
              style={{
                display: 'block',
                marginBottom: 'var(--space-1)',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--font-weight-medium)',
                color: 'var(--color-neutral-700)',
              }}
            >
              {t('news.contentEn')}
            </label>
            <textarea
              value={newArticle.content_en}
              onChange={(e) => {
                setNewArticle({ ...newArticle, content_en: e.target.value });
                if (errors.content_en !== undefined && errors.content_en !== '')
                  setErrors({ ...errors, content_en: '' });
              }}
              placeholder="Full content in English..."
              style={{
                width: '100%',
                minHeight: '150px',
                padding: 'var(--space-3)',
                border: `1px solid ${errors.content_en !== undefined && errors.content_en !== '' ? 'var(--color-error-500)' : 'var(--color-neutral-300)'}`,
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-base)',
                fontFamily: 'inherit',
                resize: 'vertical',
              }}
              required
            />
            {errors.content_en !== undefined && errors.content_en !== '' && (
              <p
                style={{
                  marginTop: 'var(--space-1)',
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-error-500)',
                }}
              >
                {errors.content_en}
              </p>
            )}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              gridColumn: '1 / -1',
            }}
          >
            <input
              type="checkbox"
              id="news-active"
              checked={newArticle.isActive}
              onChange={(e) => setNewArticle({ ...newArticle, isActive: e.target.checked })}
              style={{
                width: '1.25rem',
                height: '1.25rem',
                cursor: 'pointer',
                accentColor: 'var(--color-primary-600)',
              }}
            />
            <label
              htmlFor="news-active"
              style={{
                cursor: 'pointer',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--font-weight-medium)',
                color: 'var(--color-neutral-700)',
              }}
            >
              {t('news.isActive')}
            </label>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label
              style={{
                display: 'block',
                marginBottom: 'var(--space-1)',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--font-weight-medium)',
                color: 'var(--color-neutral-700)',
              }}
            >
              {t('news.images')}
            </label>
            {/* Existing Images */}
            {existingImages.length > 0 && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                  gap: 'var(--space-3)',
                  marginBottom: 'var(--space-4)',
                }}
              >
                {existingImages.map((image) => (
                  <div
                    key={image.id}
                    style={{
                      position: 'relative',
                      borderRadius: 'var(--radius-md)',
                      overflow: 'hidden',
                      boxShadow: 'var(--shadow-md)',
                    }}
                  >
                    <img
                      src={image.url}
                      alt="News image"
                      style={{
                        width: '100%',
                        height: '100px',
                        objectFit: 'cover',
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 'var(--space-1)',
                        opacity: 0,
                        transition: 'opacity 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.opacity = '1';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = '0';
                      }}
                    >
                      {image.isCover && (
                        <span
                          style={{
                            color: 'white',
                            fontSize: '10px',
                            fontWeight: 'bold',
                            textTransform: 'uppercase',
                            padding: '2px 6px',
                            backgroundColor: 'rgba(59, 130, 246, 0.8)',
                            borderRadius: '4px',
                          }}
                        >
                          {t('news.cover')}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => void handleSetAsCover(image.id)}
                        disabled={image.isCover}
                        style={{
                          padding: '6px',
                          borderRadius: '6px',
                          backgroundColor: 'rgba(255,255,255,0.9)',
                          color: '#2563eb',
                          border: 'none',
                          cursor: image.isCover ? 'not-allowed' : 'pointer',
                          fontSize: '11px',
                          fontWeight: '600',
                          opacity: image.isCover ? 0.5 : 1,
                        }}
                      >
                        {t('news.setAsCover')}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteImage(image.id)}
                        style={{
                          padding: '6px',
                          borderRadius: '6px',
                          backgroundColor: 'rgba(239, 68, 68, 0.9)',
                          color: 'white',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '11px',
                          fontWeight: '600',
                        }}
                      >
                        {t('news.removeImage')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* New Images */}
            <div
              style={{
                border: `2px dashed var(--color-neutral-300)`,
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-6)',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
                backgroundColor: 'var(--color-neutral-50)',
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.style.borderColor = 'var(--color-primary-500)';
                e.currentTarget.style.backgroundColor = 'var(--color-primary-50)';
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.currentTarget.style.borderColor = 'var(--color-neutral-300)';
                e.currentTarget.style.backgroundColor = 'var(--color-neutral-50)';
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.style.borderColor = 'var(--color-neutral-300)';
                e.currentTarget.style.backgroundColor = 'var(--color-neutral-50)';
                const files = e.dataTransfer.files;
                if (files !== null && files.length > 0) {
                  const validFiles = Array.from(files).filter((file) => {
                    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
                    return validTypes.includes(file.type);
                  });
                  setSelectedImages([...selectedImages, ...validFiles]);
                }
              }}
              onClick={() => {
                const input = document.getElementById('news-images-upload');
                if (input !== null) input.click();
              }}
            >
              <input
                id="news-images-upload"
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                multiple
                style={{ display: 'none' }}
                onChange={(e) => {
                  const files = e.target.files;
                  if (files !== null && files.length > 0) {
                    const validFiles = Array.from(files).filter((file) => {
                      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
                      return validTypes.includes(file.type);
                    });
                    setSelectedImages([...selectedImages, ...validFiles]);
                  }
                }}
              />
              {selectedImages.length === 0 && existingImages.length === 0 ? (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 'var(--space-2)',
                  }}
                >
                  <svg
                    style={{
                      width: 32,
                      height: 32,
                      color: 'var(--color-neutral-400)',
                    }}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-neutral-600)' }}>
                    {t('news.dropImages')}
                  </span>
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                    gap: 'var(--space-3)',
                  }}
                >
                  {existingImages.map((image) => (
                    <div
                      key={image.id}
                      style={{
                        borderRadius: 'var(--radius-md)',
                        overflow: 'hidden',
                        boxShadow: 'var(--shadow-md)',
                      }}
                    >
                      <img
                        src={image.url}
                        alt="Existing image"
                        style={{
                          width: '100%',
                          height: '100px',
                          objectFit: 'cover',
                        }}
                      />
                    </div>
                  ))}
                  {imagePreviews.map((preview, index) => (
                    <div
                      key={index}
                      style={{
                        position: 'relative',
                        borderRadius: 'var(--radius-md)',
                        overflow: 'hidden',
                        boxShadow: 'var(--shadow-md)',
                      }}
                    >
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        style={{
                          width: '100%',
                          height: '100px',
                          objectFit: 'cover',
                        }}
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedImages(selectedImages.filter((_, i) => i !== index));
                        }}
                        style={{
                          position: 'absolute',
                          top: '4px',
                          right: '4px',
                          padding: '4px',
                          borderRadius: '50%',
                          backgroundColor: 'rgba(239, 68, 68, 0.9)',
                          color: 'white',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <svg
                          style={{ width: '14px', height: '14px' }}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </Dialog>

      {/* Error Modal */}
      <Dialog
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal({ ...errorModal, isOpen: false })}
        title={errorModal.title}
        size="sm"
        footer={
          <Button
            variant="primary"
            onClick={() => {
              setErrorModal({ ...errorModal, isOpen: false });
              // Also close create modal if open
              setIsCreateModalOpen(false);
            }}
          >
            {t('common.accept')}
          </Button>
        }
      >
        <div style={{ padding: 'var(--space-2)' }}>
          <p
            style={{
              margin: 0,
              fontWeight: 'var(--font-weight-medium)',
              color: 'var(--color-neutral-900)',
              marginBottom: 'var(--space-4)',
            }}
          >
            {errorModal.title}
          </p>
          <p
            style={{
              color: 'var(--color-neutral-700)',
              lineHeight: 'var(--leading-relaxed)',
            }}
          >
            {errorModal.message}
          </p>
        </div>
      </Dialog>
    </div>
  );
}
