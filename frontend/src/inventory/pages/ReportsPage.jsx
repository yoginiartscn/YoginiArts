import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { reportsApi, locationsApi } from '../utils/inventoryApi';

export default function ReportsPage() {
  const api = useApi();
  const [transactions, setTransactions] = useState([]);
  const [locations, setLocations] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ type: '', start_date: '', end_date: '' });
  const [exportLocation, setExportLocation] = useState('');

  const fetchTransactions = async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 25 };
      if (filters.type) params.type = filters.type;
      if (filters.start_date) params.start_date = filters.start_date;
      if (filters.end_date) params.end_date = filters.end_date;

      const res = await reportsApi.getTransactions(api, params);
      setTransactions(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.all([fetchTransactions(), locationsApi.getAll(api).then((r) => setLocations(r.data.data))]);
  }, []);

  const handleFilter = (e) => {
    e.preventDefault();
    fetchTransactions(1);
  };

  const handleExport = async () => {
    try {
      const res = await reportsApi.exportExcel(api, exportLocation);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'yogini-arts-products.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Export failed');
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Reports</h1>
        <div className="flex gap-2 items-center">
          <select
            value={exportLocation}
            onChange={(e) => setExportLocation(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">All Products</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm"
          >
            Export Excel
          </button>
        </div>
      </div>

      {/* Filters */}
      <form onSubmit={handleFilter} className="bg-white rounded-xl shadow p-4 mb-6 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
          <select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">All</option>
            <option value="stock_in">Stock In</option>
            <option value="transfer">Transfer</option>
            <option value="sale">Sale</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">From Date</label>
          <input
            type="date"
            value={filters.start_date}
            onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">To Date</label>
          <input
            type="date"
            value={filters.end_date}
            onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
        <button type="submit" className="px-4 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 text-sm font-medium">
          Filter
        </button>
      </form>

      {/* Transactions Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-700"></div>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto bg-white rounded-lg shadow">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">From</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">To</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">By</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        tx.type === 'sale' ? 'bg-green-100 text-green-800' :
                        tx.type === 'transfer' ? 'bg-blue-100 text-blue-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {tx.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">{tx.product?.name || '-'}</td>
                    <td className="px-4 py-3 text-sm">{tx.fromLocation?.name || '-'}</td>
                    <td className="px-4 py-3 text-sm">{tx.toLocation?.name || '-'}</td>
                    <td className="px-4 py-3 text-sm font-medium">{tx.quantity}</td>
                    <td className="px-4 py-3 text-sm">{tx.price_type || '-'}</td>
                    <td className="px-4 py-3 text-sm">{tx.createdByUser?.name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(tx.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {transactions.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">No transactions found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              {Array.from({ length: pagination.pages }, (_, i) => (
                <button
                  key={i + 1}
                  onClick={() => fetchTransactions(i + 1)}
                  className={`px-3 py-1 rounded ${
                    pagination.page === i + 1
                      ? 'bg-amber-700 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
