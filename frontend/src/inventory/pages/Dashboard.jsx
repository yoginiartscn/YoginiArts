import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { reportsApi } from '../utils/inventoryApi';
import { useLanguage } from '../context/LanguageContext';

export default function Dashboard() {
  const api = useApi();
  const { t, td } = useLanguage();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reportsApi.getSummary(api)
      .then((res) => setSummary(res.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [api]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-700"></div>
      </div>
    );
  }

  const cards = [
    { label: t('totalProducts'), value: summary?.totalProducts || 0, color: 'bg-blue-500' },
    { label: t('totalLocations'), value: summary?.totalLocations || 0, color: 'bg-green-500' },
    { label: t('todaySales'), value: summary?.todaySales || 0, color: 'bg-amber-500' },
    { label: t('lowStock'), value: summary?.lowStock || 0, color: 'bg-red-500' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">{t('dashboard')}</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((card) => (
          <div key={card.label} className="bg-white rounded-[1.2rem] shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className="text-3xl font-bold text-gray-800 mt-1">{card.value}</p>
              </div>
              <div className={`w-12 h-12 ${card.color} rounded-[1.2rem] flex items-center justify-center`}>
                <span className="text-white text-xl font-bold">{card.value}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-[1.2rem] shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">{t('recentTransactionsTitle')}</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('type')}</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('product')}</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('from')}</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('to')}</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('qty')}</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('date')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {(summary?.recentTransactions || []).map((tx) => (
                <tr key={tx.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                      tx.type === 'sale' ? 'bg-green-100 text-green-800' :
                      tx.type === 'transfer' ? 'bg-blue-100 text-blue-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {tx.type === 'stock_in' ? t('stockInLabel') : tx.type === 'transfer' ? t('transfer') : t('sale')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">{tx.product?.name || '-'}</td>
                  <td className="px-4 py-3 text-sm">{tx.fromLocation?.name || '-'}</td>
                  <td className="px-4 py-3 text-sm">{tx.toLocation?.name || '-'}</td>
                  <td className="px-4 py-3 text-sm font-medium">{tx.quantity}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(tx.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
