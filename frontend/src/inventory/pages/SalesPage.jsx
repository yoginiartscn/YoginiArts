import React, { useState, useEffect, useRef } from 'react';
import { useApi } from '../hooks/useApi';
import { productsApi, locationsApi, inventoryApi } from '../utils/inventoryApi';

export default function SalesPage() {
  const api = useApi();
  const [products, setProducts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [form, setForm] = useState({ location_id: '', quantity: 1, price_type: 'retail' });
  const [message, setMessage] = useState(null);
  const barcodeRef = useRef(null);

  useEffect(() => {
    Promise.all([productsApi.getAll(api), locationsApi.getAll(api)])
      .then(([prodRes, locRes]) => {
        setProducts(prodRes.data.data);
        const locs = locRes.data.data;
        setLocations(locs);
        // Default to Guangzhou Warehouse
        const defaultLoc = locs.find((l) => l.name === 'Guangzhou Warehouse');
        if (defaultLoc) setForm((prev) => ({ ...prev, location_id: defaultLoc.id }));
      });
    barcodeRef.current?.focus();
  }, []);

  const handleBarcodeScan = (e) => {
    if (e.key === 'Enter' && barcodeInput.trim()) {
      const product = products.find(
        (p) => p.barcode && p.barcode.toLowerCase() === barcodeInput.trim().toLowerCase()
      );
      if (product) {
        setSelectedProduct(product);
        setMessage(null);
      } else {
        setMessage({ type: 'error', text: `No product found with barcode: ${barcodeInput}` });
        setSelectedProduct(null);
      }
      setBarcodeInput('');
    }
  };

  const handleProductSelect = (productId) => {
    const product = products.find((p) => p.id === productId);
    setSelectedProduct(product);
    setMessage(null);
  };

  const handleSale = async (e) => {
    e.preventDefault();
    if (!selectedProduct) return;

    try {
      const res = await inventoryApi.sale(api, {
        product_id: selectedProduct.id,
        location_id: form.location_id,
        quantity: parseInt(form.quantity),
        price_type: form.price_type,
      });

      const total = res.data.total;
      setMessage({ type: 'success', text: `Sale completed! Total: ${parseFloat(total).toFixed(2)}` });
      setSelectedProduct(null);
      setForm({ ...form, quantity: 1 });
      barcodeRef.current?.focus();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Sale failed' });
    }
  };

  const currentPrice = selectedProduct
    ? form.price_type === 'retail'
      ? parseFloat(selectedProduct.retail_price || 0)
      : parseFloat(selectedProduct.wholesale_price || 0)
    : 0;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Point of Sale</h1>

      {message && (
        <div className={`mb-4 p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' :
          'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Product Selection */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Select Product</h2>

          {/* Barcode Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Scan / Enter Barcode</label>
            <input
              ref={barcodeRef}
              type="text"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              onKeyDown={handleBarcodeScan}
              placeholder="Scan barcode or type and press Enter"
              className="w-full px-4 py-3 border-2 border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-lg"
              autoFocus
            />
          </div>

          <div className="text-center text-gray-400 my-2">or</div>

          {/* Product Dropdown */}
          <select
            onChange={(e) => handleProductSelect(e.target.value)}
            value={selectedProduct?.id || ''}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          >
            <option value="">Choose a product...</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} {p.barcode ? `(${p.barcode})` : ''}
              </option>
            ))}
          </select>

          {/* Selected Product Card */}
          {selectedProduct && (
            <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
              <h3 className="font-bold text-lg">{selectedProduct.name}</h3>
              {selectedProduct.barcode && (
                <p className="text-sm text-gray-600">Barcode: {selectedProduct.barcode}</p>
              )}
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                <span>Retail: <strong>{parseFloat(selectedProduct.retail_price || 0).toFixed(2)}</strong></span>
                <span>Wholesale: <strong>{parseFloat(selectedProduct.wholesale_price || 0).toFixed(2)}</strong></span>
              </div>
            </div>
          )}
        </div>

        {/* Right: Sale Form */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Complete Sale</h2>

          <form onSubmit={handleSale} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <select
                value={form.location_id}
                onChange={(e) => setForm({ ...form, location_id: e.target.value })}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Price Type</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="price_type"
                    value="retail"
                    checked={form.price_type === 'retail'}
                    onChange={(e) => setForm({ ...form, price_type: e.target.value })}
                    className="text-amber-700 focus:ring-amber-500"
                  />
                  <span className="text-sm font-medium">Retail</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="price_type"
                    value="wholesale"
                    checked={form.price_type === 'wholesale'}
                    onChange={(e) => setForm({ ...form, price_type: e.target.value })}
                    className="text-amber-700 focus:ring-amber-500"
                  />
                  <span className="text-sm font-medium">Wholesale</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
              <input
                type="number"
                min="1"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-lg"
              />
            </div>

            {/* Total */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center text-xl font-bold">
                <span>Total:</span>
                <span className="text-amber-700">
                  {(currentPrice * parseInt(form.quantity || 0)).toFixed(2)}
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={!selectedProduct}
              className="w-full py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold text-xl disabled:opacity-50 transition-colors"
            >
              Complete Sale
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
