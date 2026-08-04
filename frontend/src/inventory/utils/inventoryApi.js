// Centralized API call functions used by pages
// These are helper functions that accept an api (axios) instance

const API_BASE = import.meta.env.VITE_API_URL
  || (import.meta.env.PROD ? '' : 'http://localhost:5300');

// Server origin for static files (uploads) — strip /api suffix from API_BASE
const SERVER_ORIGIN = API_BASE.replace(/\/api\/?$/, '');

// Resolve image URLs — converts relative /uploads/... paths to full URLs in development.
// blob: URLs are ephemeral but valid for the current session, and we use them for optimistic UI
// during product saves (so the new image appears instantly while upload runs in the background).
export const getImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('blob:')) return url;
  if (url.startsWith('http')) return url;
  return `${SERVER_ORIGIN}${url}`;
};

// Widths at or below this resolve to the small thumbnail; anything larger to the
// preview-sized variant. Mirrors VARIANTS in backend/config/supabase.js.
const THUMB_MAX_WIDTH = 400;
const STORAGE_PUBLIC_MARKER = '/storage/v1/object/public/';

// Return the pre-generated variant of a Supabase Storage public URL for a given
// display width. Derivatives are produced once at upload time and stored as plain
// objects — we do NOT use the /render/image/ endpoint, which bills per unique
// origin image per month and so scales its cost with the size of the catalogue.
//
// The variant may be absent for images uploaded before the backfill ran, so every
// caller must pass the original URL as a fallback (ProductThumb's `fallbackSrc`,
// or an onError handler) — a 404 here is expected and recoverable, not a bug.
// Non-Supabase URLs (blob:, local /uploads/, other hosts) are returned unchanged.
export const getResizedImageUrl = (url, { width } = {}) => {
  if (!url) return null;
  if (url.startsWith('blob:')) return url;
  if (!width || !url.includes(STORAGE_PUBLIC_MARKER)) return url;
  const [base, query] = url.split('?');
  const stem = base.replace(/\.[^./]+$/, '');
  const variant = width <= THUMB_MAX_WIDTH ? '-thumb.jpg' : '-lg.webp';
  return `${stem}${variant}${query ? `?${query}` : ''}`;
};

export const productsApi = {
  getAll: (api, search = '') => api.get(`/products${search ? `?search=${search}` : ''}`),
  getById: (api, id) => api.get(`/products/${id}`),
  create: (api, data, imageFile, imageFile2) => {
    if (imageFile || imageFile2) {
      const formData = new FormData();
      if (imageFile) formData.append('image', imageFile);
      if (imageFile2) formData.append('image2', imageFile2);
      Object.entries(data).forEach(([key, val]) => {
        if (val !== undefined && val !== null && key !== 'image_url' && key !== 'image_url_2') formData.append(key, val);
      });
      // Let the browser set Content-Type with the correct multipart boundary
      return api.post('/products', formData);
    }
    const cleanData = { ...data };
    if (!cleanData.image_url) delete cleanData.image_url;
    if (!cleanData.image_url_2) delete cleanData.image_url_2;
    return api.post('/products', cleanData);
  },
  update: (api, id, data, imageFile, imageFile2) => {
    if (imageFile || imageFile2) {
      const formData = new FormData();
      if (imageFile) formData.append('image', imageFile);
      if (imageFile2) formData.append('image2', imageFile2);
      Object.entries(data).forEach(([key, val]) => {
        if (val !== undefined && val !== null && key !== 'image_url' && key !== 'image_url_2') formData.append(key, val);
      });
      // Only send an existing image URL when there's a real value. We must NOT send an empty
      // string for the slot we're not replacing — the backend would overwrite the saved URL
      // with '' and the image would disappear. Sending a non-empty URL preserves the other slot.
      if (data.image_url) formData.append('image_url', data.image_url);
      if (data.image_url_2) formData.append('image_url_2', data.image_url_2);
      // Let the browser set Content-Type with the correct multipart boundary
      return api.put(`/products/${id}`, formData);
    }
    return api.put(`/products/${id}`, data);
  },
  delete: (api, id) => api.delete(`/products/${id}`),
  importPrices: (api, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/products/import-prices', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

export const locationsApi = {
  getAll: (api) => api.get('/locations'),
  create: (api, data) => api.post('/locations', data),
  update: (api, id, data) => api.put(`/locations/${id}`, data),
  delete: (api, id) => api.delete(`/locations/${id}`),
};

export const inventoryApi = {
  getAll: (api, locationId = '') => api.get(`/inventory${locationId ? `?location_id=${locationId}` : ''}`),
  stockIn: (api, data) => api.post('/inventory/stock-in', data),
  transfer: (api, data) => api.post('/inventory/transfer', data),
  transferBatch: (api, data) => api.post('/inventory/transfer-batch', data),
  sale: (api, data) => api.post('/inventory/sale', data),
};

export const reportsApi = {
  getTransactions: (api, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/reports/transactions${query ? `?${query}` : ''}`);
  },
  getSummary: (api) => api.get('/reports/summary'),
  exportExcel: (api, locationId = '') => {
    return api.get(`/reports/export/excel${locationId ? `?location_id=${locationId}` : ''}`, {
      responseType: 'blob',
    });
  },
  exportQuotation: (api, category = '', priceType = 'retail_price', locationId = '') => {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (priceType) params.append('price_type', priceType);
    if (locationId) params.append('location_id', locationId);
    const query = params.toString();
    return api.get(`/reports/export/quotation${query ? `?${query}` : ''}`, {
      responseType: 'blob',
    });
  },
  exportTransfers: (api, locationId = '') => {
    return api.get(`/reports/export/transfers${locationId ? `?location_id=${locationId}` : ''}`, {
      responseType: 'blob',
    });
  },
  exportSales: (api, { locationId, startDate, endDate } = {}) => {
    const params = new URLSearchParams();
    if (locationId) params.append('location_id', locationId);
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    const query = params.toString();
    return api.get(`/reports/export/sales${query ? `?${query}` : ''}`, {
      responseType: 'blob',
    });
  },
};
