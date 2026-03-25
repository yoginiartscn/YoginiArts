import React, { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { productsApi, inventoryApi, getImageUrl } from '../utils/inventoryApi';
import { useLanguage } from '../context/LanguageContext';
import BarcodeScanner from '../components/BarcodeScanner';

export default function ScanPage() {
  const api = useApi();
  const { t } = useLanguage();
  const [product, setProduct] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [error, setError] = useState('');
  const [manualBarcode, setManualBarcode] = useState('');

  const lookupBarcode = async (barcode) => {
    setError('');
    setProduct(null);
    setInventory([]);

    try {
      const res = await productsApi.getAll(api, barcode);
      const products = res.data.data;
      const found = products.find(
        (p) => p.barcode && p.barcode.toLowerCase() === barcode.toLowerCase()
      );

      if (!found) {
        setError(`No product found with barcode: ${barcode}`);
        return;
      }

      setProduct(found);

      // Get inventory for this product
      const invRes = await inventoryApi.getAll(api);
      const productInventory = invRes.data.data.filter((inv) => inv.product_id === found.id);
      setInventory(productInventory);
    } catch (err) {
      setError('Failed to lookup barcode');
    }
  };

  const handleScan = (decodedText) => {
    lookupBarcode(decodedText);
  };

  const handleManualSearch = (e) => {
    if (e.key === 'Enter' && manualBarcode.trim()) {
      lookupBarcode(manualBarcode.trim());
      setManualBarcode('');
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">{t('barcodeScanner')}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scanner */}
        <div className="bg-white rounded-[1.2rem] shadow p-6">
          <h2 className="text-lg font-semibold mb-4">{t('cameraScanner')}</h2>
          <BarcodeScanner
            onScan={handleScan}
            onError={(msg) => setError(msg)}
          />

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('enterBarcodeManually')}</label>
            <input
              type="text"
              value={manualBarcode}
              onChange={(e) => setManualBarcode(e.target.value)}
              onKeyDown={handleManualSearch}
              placeholder={t('typeBarcodeEnter')}
              className="w-full px-4 py-3 border border-gray-300 rounded-[1.2rem] focus:outline-none"
            />
          </div>
        </div>

        {/* Results */}
        <div className="bg-white rounded-[1.2rem] shadow p-6">
          <h2 className="text-lg font-semibold mb-4">{t('productInfo')}</h2>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-[1.2rem] mb-4">
              {error}
            </div>
          )}

          {product ? (
            <div>
              <div className="space-y-3 mb-6">
                {product.image_url && (
                  <img src={getImageUrl(product.image_url)} alt={product.name} className="w-32 h-32 object-cover rounded-[1.2rem]" />
                )}
                <h3 className="text-xl font-bold">{product.name}</h3>
                {product.description && (
                  <p className="text-gray-600">{product.description}</p>
                )}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="p-2 bg-gray-50 rounded">
                    <span className="text-gray-500">{t('barcode')}:</span>
                    <br />
                    <strong>{product.barcode}</strong>
                  </div>
                  <div className="p-2 bg-gray-50 rounded">
                    <span className="text-gray-500">{t('cost')}:</span>
                    <br />
                    <strong>{parseFloat(product.cost_price || 0).toFixed(2)}</strong>
                  </div>
                  <div className="p-2 bg-gray-50 rounded">
                    <span className="text-gray-500">{t('retail')}:</span>
                    <br />
                    <strong>{parseFloat(product.retail_price || 0).toFixed(2)}</strong>
                  </div>
                  <div className="p-2 bg-gray-50 rounded">
                    <span className="text-gray-500">{t('wholesale')}:</span>
                    <br />
                    <strong>{parseFloat(product.wholesale_price || 0).toFixed(2)}</strong>
                  </div>
                </div>
              </div>

              {/* Stock Levels */}
              <h4 className="font-semibold mb-2">{t('stockLevels')}</h4>
              {inventory.length > 0 ? (
                <div className="space-y-2">
                  {inventory.map((inv) => (
                    <div key={inv.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-[1.2rem]">
                      <span>{inv.location?.name || 'Unknown'}</span>
                      <span className={`font-bold ${
                        inv.quantity === 0 ? 'text-red-600' :
                        inv.quantity <= 5 ? 'text-yellow-600' :
                        'text-green-600'
                      }`}>
                        {inv.quantity} {t('units')}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">{t('noStockRecords')}</p>
              )}
            </div>
          ) : !error ? (
            <div className="text-center py-12 text-gray-400">
              <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              <p>{t('scanBarcodeToSee')}</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
