import React, { useState, useEffect, useRef, useCallback } from 'react';
import Quagga from '@ericblade/quagga2';
import { useApi } from '../hooks/useApi';
import { productsApi } from '../utils/inventoryApi';

export default function ProductsPage() {
  const api = useApi();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showAddChoice, setShowAddChoice] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [scanStatus, setScanStatus] = useState('waiting'); // waiting | scanning | done
  const [scanMode, setScanMode] = useState('device'); // device | upload
  const [uploadPreview, setUploadPreview] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [matchedProduct, setMatchedProduct] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [form, setForm] = useState({
    name: '', description: '', image_url: '', barcode: '',
    cost_price: '', retail_price: '', wholesale_price: '',
    category: '', weight: '', size: '',
  });
  const [imagePreview, setImagePreview] = useState(null);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [deleteProduct, setDeleteProduct] = useState(null);
  const [duplicateProduct, setDuplicateProduct] = useState(null);
  const [duplicateQty, setDuplicateQty] = useState(1);
  const categoryOptions = ['Singing Bowl', 'Thanka', 'Jewelleries', 'Thanka Locket'];
  const productImageRef = useRef(null);

  const scanInputRef = useRef(null);
  const scanBufferRef = useRef('');
  const scanTimerRef = useRef(null);
  const lastKeyTimeRef = useRef(0);
  const fileInputRef = useRef(null);
  const globalScanBufferRef = useRef('');
  const globalLastKeyTimeRef = useRef(0);
  const globalScanTimerRef = useRef(null);

  const fetchProducts = async () => {
    try {
      const res = await productsApi.getAll(api, search);
      setProducts(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [search]);

  const resetForm = () => {
    setForm({ name: '', description: '', image_url: '', barcode: '', cost_price: '', retail_price: '', wholesale_price: '', category: '', weight: '', size: '' });
    setImagePreview(null);
    setEditingProduct(null);
    setShowForm(false);
  };

  const handleEdit = (product) => {
    setForm({
      name: product.name || '',
      description: product.description || '',
      image_url: product.image_url || '',
      barcode: product.barcode || '',
      cost_price: product.cost_price || '',
      retail_price: product.retail_price || '',
      wholesale_price: product.wholesale_price || '',
      category: product.category || '',
      weight: product.weight || '',
      size: product.size || '',
    });
    setImagePreview(product.image_url || null);
    setEditingProduct(product);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        await productsApi.update(api, editingProduct.id, form);
      } else {
        await productsApi.create(api, form);
      }
      resetForm();
      fetchProducts();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save product');
    }
  };

  const handleDelete = async () => {
    if (!deleteProduct) return;
    try {
      await productsApi.delete(api, deleteProduct.id);
      setDeleteProduct(null);
      fetchProducts();
    } catch (err) {
      alert('Failed to delete product');
    }
  };

  // Barcode scanner handler — detects rapid keystrokes from USB/Bluetooth scanner
  const handleScanKeyDown = useCallback((e) => {
    const now = Date.now();

    // Enter key = scanner finished
    if (e.key === 'Enter') {
      e.preventDefault();
      const barcode = scanBufferRef.current.trim();
      if (barcode.length >= 3) {
        setScannedBarcode(barcode);
        setScanStatus('done');
        setMatchedProduct(lookupBarcode(barcode));
      }
      scanBufferRef.current = '';
      return;
    }

    // Only accept printable characters
    if (e.key.length !== 1) return;

    const timeDiff = now - lastKeyTimeRef.current;
    lastKeyTimeRef.current = now;

    // If gap > 100ms, this is a new scan — reset buffer
    if (timeDiff > 100) {
      scanBufferRef.current = '';
    }

    scanBufferRef.current += e.key;
    setScanStatus('scanning');

    // Reset scanning status after idle
    clearTimeout(scanTimerRef.current);
    scanTimerRef.current = setTimeout(() => {
      if (scanBufferRef.current.length < 3) {
        scanBufferRef.current = '';
        setScanStatus('waiting');
      }
    }, 300);
  }, []);

  const openScanner = () => {
    setShowAddChoice(false);
    setScannedBarcode('');
    setScanStatus('waiting');
    setScanMode('device');
    setUploadPreview(null);
    setUploadError('');
    setMatchedProduct(null);
    scanBufferRef.current = '';
    setShowScanner(true);
  };

  // Global barcode scanner listener — auto-opens add product form on scan
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // Skip if any modal is open or user is typing in an input/textarea
      if (showForm || showScanner || showAddChoice) return;
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const now = Date.now();

      if (e.key === 'Enter') {
        e.preventDefault();
        const barcode = globalScanBufferRef.current.trim();
        if (barcode.length >= 3) {
          const matched = lookupBarcode(barcode);
          setScannedBarcode(barcode);
          setMatchedProduct(matched);
          if (matched) {
            setDuplicateProduct(matched);
            setDuplicateQty(1);
          } else {
            setForm((prev) => ({
              ...prev,
              barcode,
              name: '',
              category: getCategoryFromBarcode(barcode),
            }));
            setShowForm(true);
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
  }, [showForm, showScanner, showAddChoice, products]);

  // Auto-focus scanner input when modal opens
  useEffect(() => {
    if (showScanner && scanMode === 'device' && scanInputRef.current) {
      scanInputRef.current.focus();
    }
  }, [showScanner, scanMode]);

  const lookupBarcode = (barcode) => {
    return products.find(
      (p) => p.barcode && p.barcode.toLowerCase() === barcode.toLowerCase()
    ) || null;
  };

  // All 1D barcode readers for Quagga2
  const quaggaReaders = [
    'code_128_reader',
    'ean_reader',
    'ean_8_reader',
    'upc_reader',
    'upc_e_reader',
    'code_39_reader',
    'code_93_reader',
    'codabar_reader',
    'i2of5_reader',
  ];

  // Scan using Quagga2 with a specific image URL and size
  const tryQuagga = (imageUrl, size, patchSize) => {
    return new Promise((resolve) => {
      Quagga.decodeSingle({
        src: imageUrl,
        numOfWorkers: 0,
        locate: true,
        inputStream: {
          size,
          singleChannel: false,
        },
        locator: {
          patchSize,
          halfSample: true,
        },
        decoder: {
          readers: quaggaReaders,
          multiple: false,
        },
      }, (result) => {
        if (result && result.codeResult && result.codeResult.code) {
          resolve(result.codeResult.code);
        } else {
          resolve(null);
        }
      });
    });
  };

  // Create preprocessed image URL variants for better detection
  const createImageUrls = (file) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const urls = [URL.createObjectURL(file)]; // original

        // Create B&W high contrast version
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = imgData.data;
        for (let i = 0; i < d.length; i += 4) {
          const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
          const bw = gray < 140 ? 0 : 255;
          d[i] = bw; d[i + 1] = bw; d[i + 2] = bw;
        }
        ctx.putImageData(imgData, 0, 0);
        urls.push(canvas.toDataURL('image/png'));

        // Contrast boosted grayscale
        ctx.drawImage(img, 0, 0);
        const imgData2 = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d2 = imgData2.data;
        for (let i = 0; i < d2.length; i += 4) {
          let gray = 0.299 * d2[i] + 0.587 * d2[i + 1] + 0.114 * d2[i + 2];
          gray = Math.max(0, Math.min(255, ((gray - 128) * 2.0) + 128));
          d2[i] = gray; d2[i + 1] = gray; d2[i + 2] = gray;
        }
        ctx.putImageData(imgData2, 0, 0);
        urls.push(canvas.toDataURL('image/png'));

        // Scaled up 2x
        const canvas2 = document.createElement('canvas');
        canvas2.width = img.width * 2;
        canvas2.height = img.height * 2;
        const ctx2 = canvas2.getContext('2d');
        ctx2.imageSmoothingEnabled = false;
        ctx2.drawImage(img, 0, 0, canvas2.width, canvas2.height);
        urls.push(canvas2.toDataURL('image/png'));

        // Scaled up 2x + B&W
        const imgData3 = ctx2.getImageData(0, 0, canvas2.width, canvas2.height);
        const d3 = imgData3.data;
        for (let i = 0; i < d3.length; i += 4) {
          const gray = 0.299 * d3[i] + 0.587 * d3[i + 1] + 0.114 * d3[i + 2];
          const bw = gray < 140 ? 0 : 255;
          d3[i] = bw; d3[i + 1] = bw; d3[i + 2] = bw;
        }
        ctx2.putImageData(imgData3, 0, 0);
        urls.push(canvas2.toDataURL('image/png'));

        resolve(urls);
      };
      img.src = URL.createObjectURL(file);
    });
  };

  // Try native BarcodeDetector API (Chrome/Edge built-in)
  const tryNativeDetector = async (file) => {
    if (!('BarcodeDetector' in window)) return null;
    try {
      const img = new Image();
      await new Promise((resolve) => { img.onload = resolve; img.src = URL.createObjectURL(file); });
      const detector = new BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'code_93',
                  'codabar', 'itf', 'qr_code', 'data_matrix', 'aztec', 'pdf417'],
      });
      const results = await detector.detect(img);
      if (results.length > 0 && results[0].rawValue) return results[0].rawValue;
    } catch (e) { /* not supported */ }
    return null;
  };

  const processImageFile = async (file) => {
    if (!file || !file.type.startsWith('image/')) return;

    setUploadError('');
    setMatchedProduct(null);
    setUploadPreview(URL.createObjectURL(file));
    setScanStatus('scanning');

    let result = null;

    // 1. Try native BarcodeDetector (best for real-world photos in Chrome/Edge)
    result = await tryNativeDetector(file);

    // 2. Try Quagga2 with multiple image variants and settings
    if (!result) {
      try {
        const imageUrls = await createImageUrls(file);
        const sizes = [800, 1280, 1920];
        const patchSizes = ['medium', 'large', 'small', 'x-large'];

        for (const url of imageUrls) {
          for (const size of sizes) {
            for (const patchSize of patchSizes) {
              result = await tryQuagga(url, size, patchSize);
              if (result) break;
            }
            if (result) break;
          }
          if (result) break;
        }
      } catch (e) { /* failed */ }
    }

    if (result) {
      setScannedBarcode(result);
      setScanStatus('done');
      setMatchedProduct(lookupBarcode(result));
    } else {
      setScanStatus('waiting');
      setUploadError('Could not detect barcode. Try cropping the image closer to the barcode label.');
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImageUpload = (e) => {
    processImageFile(e.target.files?.[0]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processImageFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const getCategoryFromBarcode = (barcode) => {
    if (!barcode) return '';
    const upper = barcode.toUpperCase();
    if (upper.includes('SB')) return 'Singing Bowl';
    if (upper.includes('YA')) return 'Thanka';
    return '';
  };

  const handleScanComplete = () => {
    setShowScanner(false);
    if (matchedProduct) {
      setDuplicateProduct(matchedProduct);
      setDuplicateQty(1);
    } else {
      setForm({
        ...form,
        barcode: scannedBarcode,
        name: '',
        category: getCategoryFromBarcode(scannedBarcode),
      });
      setShowForm(true);
    }
  };

  const handleDuplicateStockIn = async () => {
    if (!duplicateProduct) return;
    try {
      const locsRes = await api.get('/locations');
      const locs = locsRes.data.data;
      const guangzhou = locs.find((l) => l.name === 'Guangzhou Warehouse') || locs[0];
      await api.post('/inventory/stock-in', {
        product_id: duplicateProduct.id,
        location_id: guangzhou.id,
        quantity: duplicateQty,
      });
      setDuplicateProduct(null);
      fetchProducts();
    } catch (err) {
      alert(err.response?.data?.message || 'Stock in failed');
    }
  };

  const handleManualBarcodeSubmit = () => {
    if (scannedBarcode.trim().length >= 1) {
      handleScanComplete();
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Products</h1>
        <button
          onClick={() => { resetForm(); setShowAddChoice(true); }}
          className="px-4 py-2 bg-amber-700 text-white rounded-[1.2rem] hover:bg-amber-800 font-medium"
        >
          + Add Product
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search products by name, barcode..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-[1.2rem] focus:outline-none"
        />
      </div>

      {/* Add Product Choice Modal */}
      {showAddChoice && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm text-center">
            <h2 className="text-xl font-bold text-gray-800 mb-2">Add New Product</h2>
            <p className="text-gray-500 text-sm mb-6">Choose how you'd like to add a product</p>
            <div className="space-y-3">
              <button
                onClick={() => { setShowAddChoice(false); setShowForm(true); }}
                className="w-full flex items-center gap-3 px-5 py-4 rounded-[1.2rem] border-2 border-gray-200 hover:border-amber-700 hover:bg-amber-50 transition-all duration-200 group"
              >
                <span className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 group-hover:bg-amber-700 group-hover:text-white transition-all duration-200">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </span>
                <div className="text-left">
                  <span className="block font-semibold text-gray-800">Add Manually</span>
                  <span className="block text-xs text-gray-500">Fill in product details by hand</span>
                </div>
              </button>
              <button
                onClick={openScanner}
                className="w-full flex items-center gap-3 px-5 py-4 rounded-[1.2rem] border-2 border-gray-200 hover:border-amber-700 hover:bg-amber-50 transition-all duration-200 group"
              >
                <span className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 group-hover:bg-amber-700 group-hover:text-white transition-all duration-200">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <line x1="6" y1="8" x2="6" y2="16" />
                    <line x1="9" y1="8" x2="9" y2="16" />
                    <line x1="12" y1="8" x2="12" y2="16" />
                    <line x1="15" y1="8" x2="15" y2="16" />
                    <line x1="18" y1="8" x2="18" y2="16" />
                  </svg>
                </span>
                <div className="text-left">
                  <span className="block font-semibold text-gray-800">Scan Barcode</span>
                  <span className="block text-xs text-gray-500">Use USB/Bluetooth barcode scanner</span>
                </div>
              </button>
            </div>
            <button
              onClick={() => setShowAddChoice(false)}
              className="mt-5 text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Barcode Scanner Modal */}
      {showScanner && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
            {/* Status Icon */}
            <div className="text-center mb-5">
              <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center transition-all duration-300 ${
                scanStatus === 'done' ? 'bg-green-100' :
                scanStatus === 'scanning' ? 'bg-amber-100 animate-pulse' :
                'bg-gray-100'
              }`}>
                {scanStatus === 'done' ? (
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className={`w-8 h-8 ${scanStatus === 'scanning' ? 'text-amber-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <line x1="6" y1="8" x2="6" y2="16" />
                    <line x1="9" y1="8" x2="9" y2="16" />
                    <line x1="12" y1="8" x2="12" y2="16" />
                    <line x1="15" y1="8" x2="15" y2="16" />
                    <line x1="18" y1="8" x2="18" y2="16" />
                  </svg>
                )}
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-1">
                {scanStatus === 'done' ? 'Barcode Scanned!' :
                 scanStatus === 'scanning' ? 'Scanning...' :
                 'Scan Barcode'}
              </h2>
            </div>

            {/* Tabs: Device / Upload Image */}
            {scanStatus !== 'done' && (
              <div className="flex mb-5 bg-gray-100 rounded-[1.2rem] p-1">
                <button
                  onClick={() => { setScanMode('device'); setUploadPreview(null); setUploadError(''); }}
                  className={`flex-1 py-2 rounded-[1.2rem] text-sm font-medium transition-all duration-200 flex items-center justify-center gap-1.5 ${
                    scanMode === 'device' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <line x1="6" y1="8" x2="6" y2="16" />
                    <line x1="10" y1="8" x2="10" y2="16" />
                    <line x1="14" y1="8" x2="14" y2="16" />
                    <line x1="18" y1="8" x2="18" y2="16" />
                  </svg>
                  Scan Device
                </button>
                <button
                  onClick={() => { setScanMode('upload'); }}
                  className={`flex-1 py-2 rounded-[1.2rem] text-sm font-medium transition-all duration-200 flex items-center justify-center gap-1.5 ${
                    scanMode === 'upload' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Upload Image
                </button>
              </div>
            )}

            {/* Device Scan Mode */}
            {scanMode === 'device' && scanStatus !== 'done' && (
              <div className="text-center">
                <p className="text-gray-500 text-sm mb-3">
                  Point your USB/Bluetooth barcode scanner at the product or type manually
                </p>
                <input
                  ref={scanInputRef}
                  type="text"
                  value={scannedBarcode}
                  onChange={(e) => setScannedBarcode(e.target.value)}
                  onKeyDown={handleScanKeyDown}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-[1.2rem] text-center text-lg font-mono tracking-wider focus:outline-none transition-colors"
                  placeholder="Waiting for scan..."
                  autoFocus
                />
              </div>
            )}

            {/* Upload Image Mode */}
            {scanMode === 'upload' && scanStatus !== 'done' && (
              <div className="text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />

                {uploadPreview ? (
                  <div className="mb-4">
                    <img
                      src={uploadPreview}
                      alt="Uploaded barcode"
                      className="max-h-48 mx-auto rounded-[1.2rem] border border-gray-200 object-contain"
                    />
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    className={`border-2 border-dashed rounded-[1.2rem] p-8 cursor-pointer transition-all duration-200 mb-4 ${
                      isDragging
                        ? 'border-amber-500 bg-amber-50 scale-[1.02]'
                        : 'border-gray-300 hover:border-amber-500 hover:bg-amber-50'
                    }`}
                  >
                    <svg className={`w-10 h-10 mx-auto mb-3 transition-colors ${isDragging ? 'text-amber-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-sm text-gray-600 font-medium">
                      {isDragging ? 'Drop image here' : 'Drag & drop or click to upload'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Upload a photo of barcode or QR code</p>
                  </div>
                )}

                {uploadError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-[1.2rem] text-sm text-red-600 mb-3">
                    {uploadError}
                  </div>
                )}

                {uploadPreview && scanStatus !== 'scanning' && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-sm text-amber-700 hover:text-amber-800 font-medium"
                  >
                    Try a different image
                  </button>
                )}
              </div>
            )}

            {/* Scan Result */}
            {scanStatus === 'done' && (
              <div>
                <div className="p-4 bg-green-50 rounded-[1.2rem] border border-green-200 mb-4 text-center">
                  <p className="text-sm text-green-600 mb-1">Detected barcode</p>
                  <p className="text-lg font-mono font-bold text-green-800">{scannedBarcode}</p>
                </div>

                {uploadPreview && (
                  <img
                    src={uploadPreview}
                    alt="Scanned"
                    className="max-h-32 mx-auto rounded-[1.2rem] border border-gray-200 object-contain mb-4"
                  />
                )}

                {/* Product found — show info */}
                {matchedProduct ? (
                  <div className="p-4 bg-blue-50 rounded-[1.2rem] border border-blue-200 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <p className="text-sm font-semibold text-blue-800">Product Found!</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {matchedProduct.image_url ? (
                        <img src={matchedProduct.image_url} alt={matchedProduct.name} className="w-14 h-14 rounded-[1.2rem] object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-14 h-14 bg-blue-100 rounded-[1.2rem] flex items-center justify-center text-blue-400 text-xs flex-shrink-0">N/A</div>
                      )}
                      <div className="text-left min-w-0">
                        <p className="font-bold text-gray-800 truncate">{matchedProduct.name}</p>
                        <p className="text-xs text-gray-500 font-mono">{matchedProduct.barcode}</p>
                        <div className="flex gap-3 mt-1 text-xs text-gray-600">
                          <span>Retail: <strong>{parseFloat(matchedProduct.retail_price || 0).toFixed(2)}</strong></span>
                          <span>Wholesale: <strong>{parseFloat(matchedProduct.wholesale_price || 0).toFixed(2)}</strong></span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50 rounded-[1.2rem] border border-amber-200 mb-4 text-center">
                    <p className="text-sm text-amber-700">No existing product matches this barcode. You can use it to create a new product.</p>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 mt-5">
              {scanStatus === 'done' ? (
                <>
                  <button
                    onClick={handleScanComplete}
                    className="flex-1 py-2.5 bg-amber-700 text-white rounded-[1.2rem] hover:bg-amber-800 font-medium transition-colors"
                  >
                    {matchedProduct ? 'Add Product' : 'Use This Barcode'}
                  </button>
                  <button
                    onClick={() => { setScannedBarcode(''); setScanStatus('waiting'); setUploadPreview(null); setUploadError(''); setMatchedProduct(null); scanBufferRef.current = ''; if (scanMode === 'device') scanInputRef.current?.focus(); }}
                    className="flex-1 py-2.5 bg-gray-200 text-gray-700 rounded-[1.2rem] hover:bg-gray-300 font-medium transition-colors"
                  >
                    Scan Again
                  </button>
                </>
              ) : (
                <>
                  {scanMode === 'device' && (
                    <button
                      onClick={handleManualBarcodeSubmit}
                      disabled={!scannedBarcode.trim()}
                      className="flex-1 py-2.5 bg-amber-700 text-white rounded-[1.2rem] hover:bg-amber-800 font-medium transition-colors disabled:opacity-40"
                    >
                      Use This Barcode
                    </button>
                  )}
                  {scanMode === 'upload' && !uploadPreview && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 py-2.5 bg-amber-700 text-white rounded-[1.2rem] hover:bg-amber-800 font-medium transition-colors"
                    >
                      Choose Image
                    </button>
                  )}
                  <button
                    onClick={() => { setShowScanner(false); setUploadPreview(null); }}
                    className="flex-1 py-2.5 bg-gray-200 text-gray-700 rounded-[1.2rem] hover:bg-gray-300 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Product Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingProduct ? 'Edit Product' : 'Add New Product'}
            </h2>
            {form.barcode && !editingProduct && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-[1.2rem] text-sm text-amber-800 flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <line x1="6" y1="8" x2="6" y2="16" />
                  <line x1="9" y1="8" x2="9" y2="16" />
                  <line x1="12" y1="8" x2="12" y2="16" />
                </svg>
                Barcode pre-filled: <span className="font-mono font-semibold">{form.barcode}</span>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Row 1: Name + Upload Picture */}
              <div className="flex justify-between items-start">
                <div className="flex-1 max-w-[65%]">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
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
                        setForm({ ...form, image_url: url });
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
                    <span className={form.category ? 'text-gray-900' : 'text-gray-400'}>
                      {form.category || 'Select category'}
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
                            setForm({ ...form, category: option });
                            setShowCategoryDropdown(false);
                          }}
                          className={`px-4 py-2.5 cursor-pointer hover:bg-amber-50 transition-colors ${form.category === option ? 'bg-amber-100 text-amber-800 font-medium' : 'text-gray-700'}`}
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
                    value={form.barcode}
                    onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-[1.2rem] focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Row 3: Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
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
                    value={form.weight}
                    onChange={(e) => setForm({ ...form, weight: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-[1.2rem] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Size</label>
                  <input
                    type="text"
                    value={form.size}
                    onChange={(e) => setForm({ ...form, size: e.target.value })}
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
                    value={form.cost_price}
                    onChange={(e) => setForm({ ...form, cost_price: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-[1.2rem] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Wholesale</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.wholesale_price}
                    onChange={(e) => setForm({ ...form, wholesale_price: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-[1.2rem] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Retail Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.retail_price}
                    onChange={(e) => setForm({ ...form, retail_price: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-[1.2rem] focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-amber-700 text-white rounded-[1.2rem] hover:bg-amber-800 font-medium"
                >
                  {editingProduct ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-[1.2rem] hover:bg-gray-300 font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Products Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-700"></div>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-[1.2rem] shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Image</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Barcode</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Weight</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Wholesale</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Retail</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    {p.image_url ? (
                      <img
                        src={p.image_url}
                        alt={p.name}
                        className="w-10 h-10 rounded object-cover cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setPreviewImage(p.image_url)}
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs">
                        N/A
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">{p.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 font-mono">{p.barcode || '-'}</td>
                  <td className="px-4 py-3 text-sm">{p.weight ? `${p.weight} kg` : '-'}</td>
                  <td className="px-4 py-3 text-sm">{p.size || '-'}</td>
                  <td className="px-4 py-3 text-sm">{parseFloat(p.cost_price || 0).toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm">{parseFloat(p.wholesale_price || 0).toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm">{parseFloat(p.retail_price || 0).toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm">
                    <button
                      onClick={() => handleEdit(p)}
                      className="text-blue-600 hover:text-blue-800 mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteProduct(p)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    No products found. Click "Add Product" to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {/* Duplicate Product Popup */}
      {duplicateProduct && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[1.2rem] shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Product Already Exists</h3>
            <p className="text-gray-600 mb-4">
              Do you want to add <span className="font-semibold">{duplicateProduct.name}</span> again?
            </p>
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDuplicateQty(Math.max(1, duplicateQty - 1))}
                  className="w-10 h-10 flex items-center justify-center border border-gray-300 rounded-[1.2rem] text-lg font-bold text-gray-600 hover:bg-gray-100"
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  value={duplicateQty}
                  onChange={(e) => setDuplicateQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-[1.2rem] text-center focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setDuplicateQty(duplicateQty + 1)}
                  className="w-10 h-10 flex items-center justify-center border border-gray-300 rounded-[1.2rem] text-lg font-bold text-gray-600 hover:bg-gray-100"
                >
                  +
                </button>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleDuplicateStockIn}
                className="flex-1 py-2 bg-amber-700 text-white rounded-[1.2rem] hover:bg-amber-800 font-medium"
              >
                Add Stock
              </button>
              <button
                onClick={() => setDuplicateProduct(null)}
                className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-[1.2rem] hover:bg-gray-300 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Popup */}
      {deleteProduct && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[1.2rem] shadow-xl p-6 w-full max-w-sm text-center">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Delete Product</h3>
            <p className="text-gray-600 mb-5">
              Are you sure you want to delete <span className="font-semibold">{deleteProduct.name}</span>?
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                className="flex-1 py-2 bg-red-600 text-white rounded-[1.2rem] hover:bg-red-700 font-medium"
              >
                Delete
              </button>
              <button
                onClick={() => setDeleteProduct(null)}
                className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-[1.2rem] hover:bg-gray-300 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Popup */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-lg max-h-[80vh]" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-600 hover:text-gray-900"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img src={previewImage} alt="Product" className="max-w-full max-h-[80vh] object-contain rounded-[1.2rem]" />
          </div>
        </div>
      )}
    </div>
  );
}
