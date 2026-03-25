import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { inventoryApi, locationsApi, productsApi } from '../utils/inventoryApi';

export default function InventoryPage() {
  const api = useApi();
  const [inventory, setInventory] = useState([]);
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [loading, setLoading] = useState(true);
  const [showStockIn, setShowStockIn] = useState(false);
  const [products, setProducts] = useState([]);
  const [stockForm, setStockForm] = useState({ product_id: '', location_id: '', quantity: '' });

  const fetchData = async () => {
    try {
      const [invRes, locRes] = await Promise.all([
        inventoryApi.getAll(api, selectedLocation),
        locationsApi.getAll(api),
      ]);
      setInventory(invRes.data.data);
      const locs = locRes.data.data;
      setLocations(locs);
      // Set default location for stock-in form
      if (locs.length > 0 && !stockForm.location_id) {
        const defaultLoc = locs.find((l) => l.name === 'Guangzhou Warehouse') || locs[0];
        setStockForm((prev) => ({ ...prev, location_id: defaultLoc.id }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedLocation]);

  const handleStockIn = async (e) => {
    e.preventDefault();
    try {
      await inventoryApi.stockIn(api, {
        ...stockForm,
        quantity: parseInt(stockForm.quantity),
      });
      setShowStockIn(false);
      setStockForm({ product_id: '', location_id: '', quantity: '' });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Stock in failed');
    }
  };

  const openStockIn = async () => {
    if (products.length === 0) {
      const res = await productsApi.getAll(api);
      setProducts(res.data.data);
    }
    setShowStockIn(true);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Inventory</h1>
        <button
          onClick={openStockIn}
          className="px-4 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 font-medium"
        >
          + Stock In
        </button>
      </div>

      {/* Location Filter */}
      <div className="mb-4">
        <select
          value={selectedLocation}
          onChange={(e) => setSelectedLocation(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
        >
          <option value="">All Locations</option>
          {locations.filter((loc) => loc.name === 'Guangzhou Warehouse').map((loc) => (
            <option key={loc.id} value={loc.id}>Guangzhou Warehouse (Default)</option>
          ))}
          {locations.filter((loc) => loc.name !== 'Guangzhou Warehouse').map((loc) => (
            <option key={loc.id} value={loc.id}>{loc.name} ({loc.type})</option>
          ))}
        </select>
      </div>

      {/* Stock In Modal */}
      {showStockIn && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Stock In</h2>
            <form onSubmit={handleStockIn} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
                <select
                  value={stockForm.product_id}
                  onChange={(e) => setStockForm({ ...stockForm, product_id: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  <option value="">Select product</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} {p.barcode ? `(${p.barcode})` : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <select
                  value={stockForm.location_id}
                  onChange={(e) => setStockForm({ ...stockForm, location_id: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  <option value="">Select location</option>
                  {locations.filter((l) => l.name === 'Guangzhou Warehouse').map((l) => (
                    <option key={l.id} value={l.id}>Guangzhou Warehouse (Default)</option>
                  ))}
                  {locations.filter((l) => l.name !== 'Guangzhou Warehouse').map((l) => (
                    <option key={l.id} value={l.id}>{l.name} ({l.type})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={stockForm.quantity}
                  onChange={(e) => setStockForm({ ...stockForm, quantity: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-3">
                <button type="submit" className="flex-1 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 font-medium">
                  Add Stock
                </button>
                <button type="button" onClick={() => setShowStockIn(false)} className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inventory Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-700"></div>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Image</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Barcode</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {inventory.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    {inv.product?.image_url ? (
                      <img src={inv.product.image_url} alt={inv.product.name} className="w-10 h-10 rounded object-cover" />
                    ) : (
                      <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs">
                        N/A
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">{inv.product?.name || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{inv.product?.barcode || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{inv.location?.name || '-'}</td>
                  <td className="px-4 py-3 text-sm font-bold">{inv.quantity}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                      inv.quantity === 0 ? 'bg-red-100 text-red-800' :
                      inv.quantity <= 5 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {inv.quantity === 0 ? 'Out of Stock' : inv.quantity <= 5 ? 'Low Stock' : 'In Stock'}
                    </span>
                  </td>
                </tr>
              ))}
              {inventory.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No inventory records. Use "Stock In" to add stock.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
