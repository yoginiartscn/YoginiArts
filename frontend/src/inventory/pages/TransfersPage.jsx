import React, { useState, useEffect, useRef } from 'react';
import { useApi } from '../hooks/useApi';
import { productsApi, locationsApi, inventoryApi, reportsApi } from '../utils/inventoryApi';

export default function TransfersPage() {
  const api = useApi();
  const [products, setProducts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [inventoryData, setInventoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);
  const [fromLocationId, setFromLocationId] = useState('');
  const [toLocationId, setToLocationId] = useState('');
  const [message, setMessage] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [addingProduct, setAddingProduct] = useState(false);
  const [addForm, setAddForm] = useState({ product_id: '', quantity: 1 });

  // Product not found state
  const [notFoundBarcode, setNotFoundBarcode] = useState('');
  const [showNotFound, setShowNotFound] = useState(false);

  // Add Product form (same as ProductsPage)
  const [showProductForm, setShowProductForm] = useState(false);
  const [productForm, setProductForm] = useState({
    name: '', description: '', image_url: '', barcode: '',
    cost_price: '', retail_price: '', wholesale_price: '',
    category: '', weight: '', size: '',
  });
  const [imagePreview, setImagePreview] = useState(null);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const categoryOptions = ['Singing Bowl', 'Thanka', 'Jewelleries', 'Thanka Locket'];
  const productImageRef = useRef(null);

  // Barcode scanner device refs
  const globalScanBufferRef = useRef('');
  const globalLastKeyTimeRef = useRef(0);
  const globalScanTimerRef = useRef(null);

  useEffect(() => {
    Promise.all([
      productsApi.getAll(api),
      locationsApi.getAll(api),
      reportsApi.getTransactions(api, { type: 'transfer', limit: 20 }),
      inventoryApi.getAll(api),
    ]).then(([prodRes, locRes, txRes, invRes]) => {
      setProducts(prodRes.data.data);
      const locs = locRes.data.data;
      setLocations(locs);
      setTransfers(txRes.data.data);
      setInventoryData(invRes.data.data);
      const defaultLoc = locs.find((l) => l.name === 'Guangzhou Warehouse');
      if (defaultLoc) setFromLocationId(defaultLoc.id);
    }).finally(() => setLoading(false));
  }, []);

  const getStock = (productId, locationId) => {
    const inv = inventoryData.find(
      (i) => i.product_id === productId && i.location_id === locationId
    );
    return inv ? inv.quantity : 0;
  };

  const lookupBarcode = (barcode) => {
    return products.find(
      (p) => p.barcode && p.barcode.toLowerCase() === barcode.toLowerCase()
    ) || null;
  };

  const getCategoryFromBarcode = (barcode) => {
    if (!barcode) return '';
    const upper = barcode.toUpperCase();
    if (upper.includes('SB')) return 'Singing Bowl';
    if (upper.includes('YA')) return 'Thanka';
    return '';
  };

  const addProductToCart = (product) => {
    const existing = cart.find((item) => item.product_id === product.id);
    if (existing) {
      setCart(cart.map((item) =>
        item.product_id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, {
        product_id: product.id,
        product_name: product.name,
        product_barcode: product.barcode,
        product_image: product.image_url,
        quantity: 1,
      }]);
    }
    setMessage({ type: 'success', text: `Added "${product.name}" to cart.` });
    setTimeout(() => setMessage(null), 2000);
  };

  // Global barcode scanner device listener — detects rapid keystrokes from USB/Bluetooth scanner
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // Skip if any modal is open or user is typing in an input/textarea/select
      if (showNotFound || showProductForm || addingProduct) return;
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const now = Date.now();

      if (e.key === 'Enter') {
        e.preventDefault();
        const barcode = globalScanBufferRef.current.trim();
        if (barcode.length >= 3) {
          const matched = lookupBarcode(barcode);
          if (matched) {
            // Product exists — add to cart
            addProductToCart(matched);
          } else {
            // Product doesn't exist — show not found dialog
            setNotFoundBarcode(barcode);
            setShowNotFound(true);
          }
        }
        globalScanBufferRef.current = '';
        return;
      }

      if (e.key.length !== 1) return;

      const timeDiff = now - globalLastKeyTimeRef.current;
      globalLastKeyTimeRef.current = now;

      if (timeDiff > 100) {
        globalScanBufferRef.current = '';
      }

      globalScanBufferRef.current += e.key;

      clearTimeout(globalScanTimerRef.current);
      globalScanTimerRef.current = setTimeout(() => {
        if (globalScanBufferRef.current.length < 3) {
          globalScanBufferRef.current = '';
        }
      }, 300);
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [showNotFound, showProductForm, addingProduct, products, cart, fromLocationId, inventoryData]);

  const addToCart = () => {
    if (!addForm.product_id || addForm.quantity < 1) return;
    const product = products.find((p) => p.id === addForm.product_id);
    if (!product) return;

    const existing = cart.find((item) => item.product_id === addForm.product_id);
    if (existing) {
      setCart(cart.map((item) =>
        item.product_id === addForm.product_id
          ? { ...item, quantity: item.quantity + parseInt(addForm.quantity) }
          : item
      ));
    } else {
      setCart([...cart, {
        product_id: product.id,
        product_name: product.name,
        product_barcode: product.barcode,
        product_image: product.image_url,
        quantity: parseInt(addForm.quantity),
      }]);
    }
    setAddForm({ product_id: '', quantity: 1 });
    setAddingProduct(false);
  };

  const updateCartQty = (productId, qty) => {
    if (qty < 1) {
      setCart(cart.filter((item) => item.product_id !== productId));
    } else {
      setCart(cart.map((item) =>
        item.product_id === productId ? { ...item, quantity: qty } : item
      ));
    }
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter((item) => item.product_id !== productId));
  };

  const handleCheckout = async () => {
    if (!fromLocationId || !toLocationId || cart.length === 0) return;
    setProcessing(true);
    setMessage(null);

    try {
      for (const item of cart) {
        await inventoryApi.transfer(api, {
          product_id: item.product_id,
          from_location_id: fromLocationId,
          to_location_id: toLocationId,
          quantity: item.quantity,
        });
      }

      setMessage({ type: 'success', text: `Transfer complete! ${cart.length} item(s) moved successfully.` });
      setCart([]);

      const [txRes, invRes] = await Promise.all([
        reportsApi.getTransactions(api, { type: 'transfer', limit: 20 }),
        inventoryApi.getAll(api),
      ]);
      setTransfers(txRes.data.data);
      setInventoryData(invRes.data.data);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Transfer failed' });
    } finally {
      setProcessing(false);
    }
  };

  // Add Product form handlers
  const resetProductForm = () => {
    setProductForm({ name: '', description: '', image_url: '', barcode: '', cost_price: '', retail_price: '', wholesale_price: '', category: '', weight: '', size: '' });
    setImagePreview(null);
    setShowProductForm(false);
  };

  const handleOpenAddProduct = () => {
    setShowNotFound(false);
    setProductForm({
      name: '', description: '', image_url: '', barcode: notFoundBarcode,
      cost_price: '', retail_price: '', wholesale_price: '',
      category: getCategoryFromBarcode(notFoundBarcode), weight: '', size: '',
    });
    setImagePreview(null);
    setShowProductForm(true);
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    try {
      await productsApi.create(api, productForm);
      resetProductForm();
      // Refresh products list
      const res = await productsApi.getAll(api);
      setProducts(res.data.data);
      setMessage({ type: 'success', text: 'Product created! Scan again to add it to the cart.' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create product');
    }
  };

  const defaultWarehouse = locations.find((l) => l.name === 'Guangzhou Warehouse');
  const otherLocations = locations.filter((l) => l.name !== 'Guangzhou Warehouse');
  const fromLocation = locations.find((l) => l.id === fromLocationId);
  const toLocation = locations.find((l) => l.id === toLocationId);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-700"></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Transfer / Checkout</h1>

      {message && (
        <div className={`mb-4 p-4 rounded-[1.2rem] flex items-center gap-2 ${
          message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' :
          'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {message.type === 'success' ? (
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          {message.text}
        </div>
      )}

      {/* Location Selection — Stock Out / Stock In */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Stock Out From */}
        <div className="bg-white rounded-[1.2rem] shadow p-5 border-l-4 border-red-500">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <h2 className="font-semibold text-gray-800">Stock Out From</h2>
          </div>
          <select
            value={fromLocationId}
            onChange={(e) => setFromLocationId(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-[1.2rem] focus:outline-none text-sm"
          >
            <option value="">Select source location</option>
            {defaultWarehouse && (
              <option key={defaultWarehouse.id} value={defaultWarehouse.id}>
                Guangzhou Warehouse
              </option>
            )}
            {otherLocations.map((l) => (
              <option key={l.id} value={l.id}>{l.name} ({l.type})</option>
            ))}
          </select>
          {fromLocation && (
            <p className="mt-2 text-xs text-gray-500">
              {fromLocation.name === 'Guangzhou Warehouse' ? (
                <span className="text-amber-700 font-medium">Default Location</span>
              ) : (
                <>Type: <span className="capitalize font-medium">{fromLocation.type}</span></>
              )}
            </p>
          )}
        </div>

        {/* Stock In To */}
        <div className="bg-white rounded-[1.2rem] shadow p-5 border-l-4 border-green-500">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <h2 className="font-semibold text-gray-800">Stock In To</h2>
          </div>
          <select
            value={toLocationId}
            onChange={(e) => setToLocationId(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-[1.2rem] focus:outline-none text-sm"
          >
            <option value="">Select destination location</option>
            {defaultWarehouse && defaultWarehouse.id !== fromLocationId && (
              <option key={defaultWarehouse.id} value={defaultWarehouse.id}>
                Guangzhou Warehouse
              </option>
            )}
            {otherLocations.filter((l) => l.id !== fromLocationId).map((l) => (
              <option key={l.id} value={l.id}>{l.name} ({l.type})</option>
            ))}
          </select>
          {toLocation && (
            <p className="mt-2 text-xs text-gray-500">
              {toLocation.name === 'Guangzhou Warehouse' ? (
                <span className="text-amber-700 font-medium">Default Location</span>
              ) : (
                <>Type: <span className="capitalize font-medium">{toLocation.type}</span></>
              )}
            </p>
          )}
        </div>
      </div>

      {/* Transfer Cart — Inventory Table Style */}
      <div className="bg-white rounded-[1.2rem] shadow mb-6">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
            </svg>
            <h2 className="font-semibold text-gray-800">Transfer Cart</h2>
            {cart.length > 0 && (
              <span className="bg-amber-100 text-amber-800 text-xs font-semibold px-2 py-0.5 rounded-full">
                {totalItems} item{totalItems !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <button
            onClick={() => { setAddForm({ product_id: '', quantity: 1 }); setAddingProduct(true); }}
            disabled={!fromLocationId || !toLocationId}
            className="px-4 py-2 bg-amber-700 text-white rounded-[1.2rem] hover:bg-amber-800 font-medium text-sm disabled:opacity-40 transition-colors"
          >
            + Add Item
          </button>
        </div>

        {cart.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <p className="text-sm">No items in cart. Use your barcode scanner or add products manually.</p>
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Image</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Barcode</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Available</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transfer Qty</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {cart.map((item) => {
                    const stock = getStock(item.product_id, fromLocationId);
                    const overStock = item.quantity > stock;
                    return (
                      <tr key={item.product_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          {item.product_image ? (
                            <img src={item.product_image} alt={item.product_name} className="w-10 h-10 rounded object-cover" />
                          ) : (
                            <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs">
                              N/A
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-800">{item.product_name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 font-mono">{item.product_barcode || '-'}</td>
                        <td className="px-4 py-3 text-sm font-bold">{stock}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => updateCartQty(item.product_id, item.quantity - 1)}
                              className="w-8 h-8 rounded-[1.2rem] bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 font-medium transition-colors"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateCartQty(item.product_id, parseInt(e.target.value) || 1)}
                              className={`w-14 text-center py-1 border rounded-[1.2rem] text-sm font-medium ${
                                overStock ? 'border-red-300 text-red-600 bg-red-50' : 'border-gray-300'
                              }`}
                            />
                            <button
                              onClick={() => updateCartQty(item.product_id, item.quantity + 1)}
                              className="w-8 h-8 rounded-[1.2rem] bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 font-medium transition-colors"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                            overStock ? 'bg-red-100 text-red-800' :
                            stock === 0 ? 'bg-red-100 text-red-800' :
                            stock <= 5 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {overStock ? 'Over Stock' : stock === 0 ? 'Out of Stock' : stock <= 5 ? 'Low Stock' : 'In Stock'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => removeFromCart(item.product_id)}
                            className="text-red-400 hover:text-red-600 transition-colors p-1"
                            title="Remove from cart"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Checkout Summary */}
            <div className="p-5 bg-gray-50 rounded-b-[1.2rem]">
              <div className="flex items-center justify-between mb-4 text-sm">
                <span className="text-gray-600">
                  {fromLocation?.name || 'Source'} <span className="mx-2 text-gray-400">&rarr;</span> {toLocation?.name || 'Destination'}
                </span>
                <span className="font-semibold text-gray-800">{totalItems} total items</span>
              </div>
              <button
                onClick={handleCheckout}
                disabled={processing || !fromLocationId || !toLocationId || cart.length === 0}
                className="w-full py-3 bg-amber-700 text-white rounded-[1.2rem] hover:bg-amber-800 font-semibold text-lg disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
              >
                {processing ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Confirm Transfer
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Item Modal (manual select) */}
      {addingProduct && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">Add Item to Cart</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
                <select
                  value={addForm.product_id}
                  onChange={(e) => setAddForm({ ...addForm, product_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-[1.2rem] focus:outline-none"
                >
                  <option value="">Select product</option>
                  {products.map((p) => {
                    const stock = getStock(p.id, fromLocationId);
                    return (
                      <option key={p.id} value={p.id} disabled={stock === 0}>
                        {p.name} {p.barcode ? `(${p.barcode})` : ''} — Stock: {stock}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={addForm.quantity}
                  onChange={(e) => setAddForm({ ...addForm, quantity: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-[1.2rem] focus:outline-none"
                />
                {addForm.product_id && fromLocationId && (
                  <p className="mt-1 text-xs text-gray-500">
                    Available at {fromLocation?.name}: <span className="font-semibold">{getStock(addForm.product_id, fromLocationId)}</span>
                  </p>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={addToCart}
                  disabled={!addForm.product_id || addForm.quantity < 1}
                  className="flex-1 py-2 bg-amber-700 text-white rounded-[1.2rem] hover:bg-amber-800 font-medium disabled:opacity-40 transition-colors"
                >
                  Add to Cart
                </button>
                <button
                  onClick={() => setAddingProduct(false)}
                  className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-[1.2rem] hover:bg-gray-300 font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Product Not Found Modal */}
      {showNotFound && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Product Doesn't Exist</h2>
            <p className="text-gray-500 text-sm mb-2">No product found with barcode:</p>
            <p className="font-mono font-semibold text-gray-800 bg-gray-100 rounded-[1.2rem] px-4 py-2 mb-6 inline-block">
              {notFoundBarcode}
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleOpenAddProduct}
                className="flex-1 py-2.5 bg-amber-700 text-white rounded-[1.2rem] hover:bg-amber-800 font-medium transition-colors"
              >
                Add Product
              </button>
              <button
                onClick={() => setShowNotFound(false)}
                className="flex-1 py-2.5 bg-gray-200 text-gray-700 rounded-[1.2rem] hover:bg-gray-300 font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Product Form Modal (same as ProductsPage) */}
      {showProductForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Add New Product</h2>
            {productForm.barcode && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-[1.2rem] text-sm text-amber-800 flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <line x1="6" y1="8" x2="6" y2="16" />
                  <line x1="9" y1="8" x2="9" y2="16" />
                  <line x1="12" y1="8" x2="12" y2="16" />
                </svg>
                Barcode pre-filled: <span className="font-mono font-semibold">{productForm.barcode}</span>
              </div>
            )}
            <form onSubmit={handleProductSubmit} className="space-y-3">
              {/* Row 1: Name + Upload Picture */}
              <div className="flex justify-between items-start">
                <div className="flex-1 max-w-[65%]">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-[1.2rem] focus:outline-none"
                    autoFocus
                  />
                </div>
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    ref={productImageRef}
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const url = URL.createObjectURL(file);
                        setImagePreview(url);
                        setProductForm({ ...productForm, image_url: url });
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => productImageRef.current?.click()}
                    className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-[1.2rem] flex items-center justify-center hover:border-amber-500 hover:bg-amber-50 transition-colors overflow-hidden"
                  >
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover rounded-[1.2rem]" />
                    ) : (
                      <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 15V3" />
                        <path d="M7 7l5-5 5 5" />
                        <path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Row 2: Category + Barcode */}
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <button
                    type="button"
                    onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-[1.2rem] focus:outline-none bg-white text-left flex items-center justify-between"
                  >
                    <span className={productForm.category ? 'text-gray-900' : 'text-gray-400'}>
                      {productForm.category || 'Select category'}
                    </span>
                    <svg className={`w-4 h-4 text-gray-500 transition-transform ${showCategoryDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showCategoryDropdown && (
                    <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-[1.2rem] shadow-lg overflow-hidden">
                      {categoryOptions.map((option) => (
                        <li
                          key={option}
                          onClick={() => {
                            setProductForm({ ...productForm, category: option });
                            setShowCategoryDropdown(false);
                          }}
                          className={`px-4 py-2.5 cursor-pointer hover:bg-amber-50 transition-colors ${productForm.category === option ? 'bg-amber-100 text-amber-800 font-medium' : 'text-gray-700'}`}
                        >
                          {option}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Barcode</label>
                  <input
                    type="text"
                    value={productForm.barcode}
                    onChange={(e) => setProductForm({ ...productForm, barcode: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-[1.2rem] focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Row 3: Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-[1.2rem] focus:outline-none"
                />
              </div>

              {/* Row 4: Weight, Size */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Weight</label>
                  <input
                    type="text"
                    value={productForm.weight}
                    onChange={(e) => setProductForm({ ...productForm, weight: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-[1.2rem] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Size</label>
                  <input
                    type="text"
                    value={productForm.size}
                    onChange={(e) => setProductForm({ ...productForm, size: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-[1.2rem] focus:outline-none"
                  />
                </div>
              </div>

              {/* Row 5: Cost Price, Wholesale Price, Retail Price */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cost Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={productForm.cost_price}
                    onChange={(e) => setProductForm({ ...productForm, cost_price: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-[1.2rem] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Wholesale</label>
                  <input
                    type="number"
                    step="0.01"
                    value={productForm.wholesale_price}
                    onChange={(e) => setProductForm({ ...productForm, wholesale_price: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-[1.2rem] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Retail Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={productForm.retail_price}
                    onChange={(e) => setProductForm({ ...productForm, retail_price: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-[1.2rem] focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-amber-700 text-white rounded-[1.2rem] hover:bg-amber-800 font-medium"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={resetProductForm}
                  className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-[1.2rem] hover:bg-gray-300 font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer History */}
      <div className="bg-white rounded-[1.2rem] shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Transfers</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock Out</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock In</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {transfers.map((tx) => (
                <tr key={tx.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">{tx.product?.name || '-'}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className="inline-flex items-center gap-1 text-red-600">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 8 8"><circle cx="4" cy="4" r="4" /></svg>
                      {tx.fromLocation?.name || '-'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className="inline-flex items-center gap-1 text-green-600">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 8 8"><circle cx="4" cy="4" r="4" /></svg>
                      {tx.toLocation?.name || '-'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold">{tx.quantity}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(tx.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {transfers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">No transfers yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
