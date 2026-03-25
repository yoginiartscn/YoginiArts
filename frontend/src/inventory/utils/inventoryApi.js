// Centralized API call functions used by pages
// These are helper functions that accept an api (axios) instance

export const productsApi = {
  getAll: (api, search = '') => api.get(`/products${search ? `?search=${search}` : ''}`),
  getById: (api, id) => api.get(`/products/${id}`),
  create: (api, data) => api.post('/products', data),
  update: (api, id, data) => api.put(`/products/${id}`, data),
  delete: (api, id) => api.delete(`/products/${id}`),
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
};
