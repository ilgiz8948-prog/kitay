import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, 
  ShoppingBag, 
  Search, 
  DollarSign, 
  Tag, 
  TrendingUp, 
  Wallet, 
  CheckCircle2, 
  AlertCircle, 
  Package, 
  Coins, 
  User, 
  Phone, 
  Receipt,
  ArrowRight,
  Sparkles,
  Image as ImageIcon,
  Check,
  Camera,
  Upload
} from 'lucide-react';
import { Product } from '../types';

export interface CalculatedProductForSale extends Product {
  landedUnitCost: number;
  wholesalePriceUSD: number;
  retailPriceUSD: number;
  totalItemLandedCost: number;
}

interface SellProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: CalculatedProductForSale[];
  batchName: string;
  currencySymbol: string;
  targetCurrency: 'USD' | 'KGS';
  onCompleteSale: (saleData: {
    productId: string;
    productName: string;
    quantity: number;
    priceType: 'wholesale' | 'retail';
    unitPrice: number;
    totalAmount: number;
    isDebt: boolean;
    debtorName?: string;
    debtorPhone?: string;
    debtorPhotoUrl?: string;
    initialPayment?: number;
    deductStock: boolean;
  }) => void;
}

export default function SellProductModal({
  isOpen,
  onClose,
  products,
  batchName,
  currencySymbol,
  targetCurrency,
  onCompleteSale
}: SellProductModalProps) {
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [priceType, setPriceType] = useState<'wholesale' | 'retail'>('retail');
  const [customUnitPrice, setCustomUnitPrice] = useState<string>('');
  const [deductStock, setDeductStock] = useState<boolean>(true);
  
  // Debt mode toggles
  const [isDebtMode, setIsDebtMode] = useState<boolean>(false);
  const [debtorName, setDebtorName] = useState<string>('');
  const [debtorPhone, setDebtorPhone] = useState<string>('');
  const [debtorPhotoUrl, setDebtorPhotoUrl] = useState<string>('');
  const [initialPayment, setInitialPayment] = useState<string>('0');

  // Debtor photo upload handler with compression
  const handleDebtorPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX_SIZE = 500;
        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setDebtorPhotoUrl(compressedDataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Success message modal state
  const [showSuccessToast, setShowSuccessToast] = useState<boolean>(false);
  const [lastSoldSummary, setLastSoldSummary] = useState<string>('');

  // Auto select first product on open or products change
  useEffect(() => {
    if (products.length > 0 && !selectedProductId) {
      setSelectedProductId(products[0].id);
    }
  }, [products, selectedProductId]);

  // Find currently selected product
  const selectedProduct = useMemo(() => {
    return products.find(p => p.id === selectedProductId) || products[0] || null;
  }, [products, selectedProductId]);

  // Default unit price based on price type choice (Wholesale vs Retail)
  const defaultUnitPrice = useMemo(() => {
    if (!selectedProduct) return 0;
    return priceType === 'wholesale' 
      ? selectedProduct.wholesalePriceUSD 
      : selectedProduct.retailPriceUSD;
  }, [selectedProduct, priceType]);

  // When selected product or price type changes, sync custom unit price input
  useEffect(() => {
    if (selectedProduct) {
      setCustomUnitPrice(defaultUnitPrice.toString());
    }
  }, [selectedProduct, priceType, defaultUnitPrice]);

  if (!isOpen) return null;

  // Filtered products list for selector
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Financial calculations
  const unitPriceNum = Number(customUnitPrice) || 0;
  const totalAmount = quantity * unitPriceNum;
  const unitLandedCost = selectedProduct?.landedUnitCost || 0;
  const totalCost = quantity * unitLandedCost;
  const estimatedProfit = totalAmount - totalCost;
  const profitMarginPercent = totalAmount > 0 ? Math.round((estimatedProfit / totalAmount) * 100) : 0;

  // Max stock limit check
  const availableStock = selectedProduct?.quantity || 0;
  const isExceedingStock = deductStock && quantity > availableStock;

  const handleQuantityChange = (val: number) => {
    const validVal = Math.max(1, val);
    setQuantity(validVal);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    if (quantity <= 0) {
      alert('Пожалуйста, укажите количество больше 0.');
      return;
    }
    if (isDebtMode && !debtorName.trim()) {
      alert('Пожалуйста, укажите имя покупателя / должника.');
      return;
    }

    const initPayNum = Number(initialPayment) || 0;

    onCompleteSale({
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      quantity,
      priceType,
      unitPrice: unitPriceNum,
      totalAmount,
      isDebt: isDebtMode,
      debtorName: isDebtMode ? debtorName.trim() : undefined,
      debtorPhone: isDebtMode ? debtorPhone.trim() : undefined,
      debtorPhotoUrl: isDebtMode ? debtorPhotoUrl || undefined : undefined,
      initialPayment: isDebtMode ? initPayNum : undefined,
      deductStock
    });

    const summaryText = isDebtMode
      ? `Продано в долг: "${selectedProduct.name}" (${quantity} шт) на сумму ${totalAmount.toLocaleString('ru-RU')} ${currencySymbol} (Покупатель: ${debtorName})`
      : `Успешно продано: "${selectedProduct.name}" (${quantity} шт) на сумму ${totalAmount.toLocaleString('ru-RU')} ${currencySymbol}!`;

    setLastSoldSummary(summaryText);
    setShowSuccessToast(true);

    setTimeout(() => {
      setShowSuccessToast(false);
      onClose();
    }, 1800);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* HEADER */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>Окно продажи товаров</span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-mono font-bold border border-emerald-500/30">
                  {batchName}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Оформление оптовой и розничной продажи с мгновенным расчетом прибыли
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-xl transition-all"
            title="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TOAST / SUCCESS OVERLAY */}
        {showSuccessToast ? (
          <div className="p-8 flex flex-col items-center justify-center text-center space-y-4 my-auto animate-scaleIn">
            <div className="w-16 h-16 bg-emerald-500/20 border-2 border-emerald-500/40 text-emerald-400 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 animate-bounce" />
            </div>
            <h3 className="text-xl font-bold text-white">Продажа зафиксирована!</h3>
            <p className="text-sm text-slate-300 max-w-md font-medium bg-slate-950 p-4 rounded-2xl border border-slate-800">
              {lastSoldSummary}
            </p>
          </div>
        ) : (
          /* FORM BODY */
          <form onSubmit={handleFormSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs">
            
            {/* 1. ВЫБОР ТОВАРА (PRODUCT SELECTION WITH PHOTO AND TITLE) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-slate-300 font-bold flex items-center gap-1.5 text-xs">
                  <Package className="w-4 h-4 text-emerald-400" />
                  <span>1. Выберите товар (Наименование и фото):</span>
                </label>
                <span className="text-[11px] text-slate-400">
                  Доступно позиций: <strong className="text-white">{products.length}</strong>
                </span>
              </div>

              {/* Product search input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск по наименованию товара..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 pl-8 pr-3 py-2 rounded-xl text-xs text-white placeholder-slate-500 outline-none"
                />
              </div>

              {/* VISUAL PRODUCTS LIST WITH IMAGE AND TITLE */}
              <div className="max-h-56 overflow-y-auto space-y-2 pr-1 border border-slate-800/80 rounded-2xl p-2 bg-slate-950/60">
                {filteredProducts.length > 0 ? (
                  filteredProducts.map((p) => {
                    const isSelected = p.id === selectedProductId;
                    return (
                      <div
                        key={p.id}
                        onClick={() => setSelectedProductId(p.id)}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-emerald-950/30 border-emerald-500 shadow-md shadow-emerald-950/40'
                            : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/90'
                        }`}
                      >
                        {/* LEFT: PHOTO + NAME */}
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {p.imageUrl ? (
                            <img
                              src={p.imageUrl}
                              alt={p.name}
                              className="w-12 h-12 rounded-lg object-cover border border-slate-700 flex-shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-slate-800 border border-slate-700 flex flex-col items-center justify-center text-slate-500 flex-shrink-0">
                              <ImageIcon className="w-5 h-5 text-slate-400" />
                              <span className="text-[8px] text-slate-500 mt-0.5">Нет фото</span>
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-white text-xs flex items-center gap-1.5 flex-wrap">
                              <span>{p.name}</span>
                              {isSelected && (
                                <span className="px-1.5 py-0.2 bg-emerald-500 text-slate-950 text-[9px] font-black rounded-full uppercase">
                                  Выбран
                                </span>
                              )}
                            </h4>
                            <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400 font-mono flex-wrap">
                              <span>Остаток: <strong className="text-amber-400">{p.quantity} шт</strong></span>
                              <span>•</span>
                              <span>Опт: <strong className="text-emerald-400">{p.wholesalePriceUSD} {currencySymbol}</strong></span>
                              <span>•</span>
                              <span>Розница: <strong className="text-purple-400">{p.retailPriceUSD} {currencySymbol}</strong></span>
                            </div>
                          </div>
                        </div>

                        {/* RIGHT: SELECT CHECK */}
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all flex-shrink-0 ${
                          isSelected 
                            ? 'bg-emerald-500 border-emerald-400 text-slate-950' 
                            : 'border-slate-700 bg-slate-950 text-transparent'
                        }`}>
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-4 text-center text-slate-500 italic">
                    Товары по запросу "{searchQuery}" не найдены
                  </div>
                )}
              </div>

              {/* SELECTED PRODUCT CARD SUMMARY */}
              {selectedProduct && (
                <div className="p-3 bg-slate-950/90 border border-slate-800 rounded-2xl flex flex-col sm:flex-row items-center gap-3">
                  {selectedProduct.imageUrl ? (
                    <img
                      src={selectedProduct.imageUrl}
                      alt={selectedProduct.name}
                      className="w-16 h-16 rounded-xl object-cover border border-slate-700 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-slate-800 border border-slate-700 flex flex-col items-center justify-center text-slate-500 flex-shrink-0">
                      <ImageIcon className="w-6 h-6 text-slate-400" />
                      <span className="text-[9px] mt-1 text-slate-400">Нет фото</span>
                    </div>
                  )}
                  <div className="flex-1 w-full space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white tracking-tight">{selectedProduct.name}</span>
                      <span className="text-[10px] text-emerald-400 font-mono">Выбранная позиция</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
                      <div className="p-2 bg-slate-900/80 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-500 uppercase block font-sans">Остаток</span>
                        <span className="text-xs font-bold text-amber-400">{selectedProduct.quantity} шт</span>
                      </div>
                      <div className="p-2 bg-slate-900/80 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-500 uppercase block font-sans">Себестоимость</span>
                        <span className="text-xs font-bold text-blue-400">{selectedProduct.landedUnitCost.toFixed(1)} {currencySymbol}</span>
                      </div>
                      <div className="p-2 bg-slate-900/80 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-500 uppercase block font-sans">ОПТ</span>
                        <span className="text-xs font-bold text-emerald-400">{selectedProduct.wholesalePriceUSD} {currencySymbol}</span>
                      </div>
                      <div className="p-2 bg-slate-900/80 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-500 uppercase block font-sans">РОЗНИЦА</span>
                        <span className="text-xs font-bold text-purple-400">{selectedProduct.retailPriceUSD} {currencySymbol}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 2. ВЫБОР ЦЕНОВОЙ КАТЕГОРИИ: ОПТОМ ИЛИ В РОЗНИЦУ (Wholesale / Retail Toggle) */}
            <div className="space-y-2">
              <label className="text-slate-300 font-bold flex items-center gap-1.5 text-xs">
                <Tag className="w-4 h-4 text-emerald-400" />
                <span>2. Режим цены продажи:</span>
              </label>

              <div className="grid grid-cols-2 gap-3">
                
                {/* BUTTON 1: ОПТОМ */}
                <button
                  type="button"
                  onClick={() => setPriceType('wholesale')}
                  className={`p-3.5 rounded-2xl border transition-all flex flex-col items-center justify-center gap-1 text-center font-bold ${
                    priceType === 'wholesale'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-lg shadow-emerald-950/50'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 text-sm">
                    <Coins className="w-4 h-4 text-emerald-400" />
                    <span>ОПТОМ</span>
                  </div>
                  <span className="text-[11px] font-mono font-normal">
                    {selectedProduct?.wholesalePriceUSD || 0} {currencySymbol} / шт
                  </span>
                </button>

                {/* BUTTON 2: В РОЗНИЦУ */}
                <button
                  type="button"
                  onClick={() => setPriceType('retail')}
                  className={`p-3.5 rounded-2xl border transition-all flex flex-col items-center justify-center gap-1 text-center font-bold ${
                    priceType === 'retail'
                      ? 'bg-purple-500/20 border-purple-500 text-purple-300 shadow-lg shadow-purple-950/50'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 text-sm">
                    <ShoppingBag className="w-4 h-4 text-purple-400" />
                    <span>В РОЗНИЦУ</span>
                  </div>
                  <span className="text-[11px] font-mono font-normal">
                    {selectedProduct?.retailPriceUSD || 0} {currencySymbol} / шт
                  </span>
                </button>

              </div>
            </div>

            {/* 3. КОЛИЧЕСТВО И ИНДИВИДУАЛЬНАЯ ЦЕНА (Quantity & Price per unit) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Quantity Field */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold block text-xs">
                  Количество для продажи (шт):
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(quantity - 1)}
                    className="w-9 h-9 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold flex items-center justify-center text-base"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl py-2 px-3 text-center text-sm font-mono font-bold text-amber-400 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(quantity + 1)}
                    className="w-9 h-9 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold flex items-center justify-center text-base"
                  >
                    +
                  </button>
                </div>

                {/* Quick Add Buttons */}
                <div className="flex items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-500">Быстро:</span>
                  {[1, 5, 10, 50].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setQuantity(num)}
                      className="px-2 py-0.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-mono"
                    >
                      +{num}
                    </button>
                  ))}
                  {selectedProduct && selectedProduct.quantity > 0 && (
                    <button
                      type="button"
                      onClick={() => setQuantity(selectedProduct.quantity)}
                      className="px-2 py-0.5 bg-amber-950/50 hover:bg-amber-900 border border-amber-800 text-amber-300 rounded-lg text-[10px] font-mono font-bold ml-auto"
                    >
                      Все ({selectedProduct.quantity})
                    </button>
                  )}
                </div>

                {isExceedingStock && (
                  <p className="text-[11px] text-red-400 flex items-center gap-1 mt-1 font-medium">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Внимание: Продажа больше, чем остаток на складе ({availableStock} шт)
                  </p>
                )}
              </div>

              {/* Price per unit field */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold block text-xs">
                  Цена за 1 шт ({currencySymbol}):
                </label>
                <input
                  type="number"
                  step="any"
                  value={customUnitPrice}
                  onChange={(e) => setCustomUnitPrice(e.target.value)}
                  placeholder="0"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl py-2 px-3 text-sm font-mono font-bold text-emerald-400 outline-none"
                />
                <span className="text-[10px] text-slate-500 block">
                  Вы можете изменить цену вручную при скидке
                </span>
              </div>

            </div>

            {/* FINANCIAL RESULT SUMMARY CARD */}
            <div className="p-4 bg-gradient-to-br from-slate-950 to-slate-900 border border-emerald-500/30 rounded-2xl space-y-2">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400 font-medium">Итоговая сумма продажи:</span>
                <span className="text-lg font-bold font-mono text-emerald-400">
                  {totalAmount.toLocaleString('ru-RU')} {currencySymbol}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-1">
                <div>
                  <span className="text-slate-500 block">Себестоимость партии:</span>
                  <span className="text-blue-400 font-bold">{totalCost.toLocaleString('ru-RU')} {currencySymbol}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Расчетная чистая прибыль:</span>
                  <span className={`font-bold ${estimatedProfit >= 0 ? 'text-purple-400' : 'text-red-400'}`}>
                    +{estimatedProfit.toLocaleString('ru-RU')} {currencySymbol} ({profitMarginPercent}%)
                  </span>
                </div>
              </div>
            </div>

            {/* DEDUCT STOCK CHECKBOX */}
            <div className="flex items-center gap-2 bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/80">
              <input
                type="checkbox"
                id="deductStock"
                checked={deductStock}
                onChange={(e) => setDeductStock(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 bg-slate-900 border-slate-700 cursor-pointer"
              />
              <label htmlFor="deductStock" className="text-slate-300 font-medium cursor-pointer text-xs">
                Автоматически списывать продаваемое количество ({quantity} шт) из остатков партии
              </label>
            </div>

            {/* PAYMENT TYPE / DEBT TOGGLE */}
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-bold flex items-center gap-1.5 text-xs">
                  <Wallet className="w-4 h-4 text-amber-400" />
                  <span>Способ оплаты:</span>
                </span>
                
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsDebtMode(false)}
                    className={`px-3 py-1 rounded-xl font-bold text-xs transition-all ${
                      !isDebtMode
                        ? 'bg-emerald-600 text-white shadow'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    💵 Оплата сразу (Наличные)
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsDebtMode(true)}
                    className={`px-3 py-1 rounded-xl font-bold text-xs transition-all ${
                      isDebtMode
                        ? 'bg-amber-600 text-white shadow'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    📝 Продать в долг
                  </button>
                </div>
              </div>

              {/* DEBTOR EXTRA FIELDS */}
              {isDebtMode && (
                <div className="p-4 bg-amber-950/20 border border-amber-800/60 rounded-2xl space-y-3 animate-fadeIn">
                  <p className="text-amber-300 text-[11px] font-medium flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Запись будет автоматически добавлена в модуль дебиторской задолженности (Долги)
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-slate-300 font-bold block text-[11px]">
                        Имя покупателя / Магазин <span className="text-red-400">*</span>:
                      </label>
                      <div className="relative">
                        <User className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required={isDebtMode}
                          value={debtorName}
                          onChange={(e) => setDebtorName(e.target.value)}
                          placeholder="Например: Асан (Магазин #12)"
                          className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 pl-8 pr-3 py-2 rounded-xl text-xs text-white outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-slate-300 font-bold block text-[11px]">
                        Телефон покупателя (необязательно):
                      </label>
                      <div className="relative">
                        <Phone className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={debtorPhone}
                          onChange={(e) => setDebtorPhone(e.target.value)}
                          placeholder="+996 555 123456"
                          className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 pl-8 pr-3 py-2 rounded-xl text-xs text-white outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Фото должника */}
                  <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-2">
                    <label className="block text-[11px] text-slate-300 font-bold flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5 text-amber-400" />
                        <span>Фото должника (необязательно)</span>
                      </span>
                      {debtorPhotoUrl && (
                        <button
                          type="button"
                          onClick={() => setDebtorPhotoUrl('')}
                          className="text-[10px] text-red-400 hover:underline"
                        >
                          Удалить фото
                        </button>
                      )}
                    </label>

                    <div className="flex items-center gap-3">
                      {debtorPhotoUrl ? (
                        <img 
                          src={debtorPhotoUrl} 
                          alt="Фото должника" 
                          className="w-12 h-12 rounded-xl object-cover border border-amber-500/50 shadow-md flex-shrink-0" 
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-slate-900 border border-dashed border-slate-700 flex flex-col items-center justify-center text-slate-500 flex-shrink-0">
                          <Camera className="w-4 h-4 text-slate-600" />
                          <span className="text-[8px] text-slate-500 mt-0.5">Нет фото</span>
                        </div>
                      )}

                      <div className="flex-1 space-y-1.5">
                        <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors">
                          <Upload className="w-3.5 h-3.5 text-amber-400" />
                          <span>{debtorPhotoUrl ? 'Заменить фото' : 'Загрузить фото'}</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleDebtorPhotoChange} 
                            className="hidden" 
                          />
                        </label>

                        <input
                          type="url"
                          value={debtorPhotoUrl.startsWith('data:') ? '' : debtorPhotoUrl}
                          onChange={(e) => setDebtorPhotoUrl(e.target.value)}
                          placeholder="Или ссылка на фото (URL)"
                          className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl py-1 px-2.5 text-[10px] text-white outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-300 font-bold block text-[11px]">
                      Первоначальный взнос при покупке ({currencySymbol}):
                    </label>
                    <input
                      type="number"
                      value={initialPayment}
                      onChange={(e) => setInitialPayment(e.target.value)}
                      placeholder="0"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 px-3 py-2 rounded-xl text-xs font-mono font-bold text-emerald-400 outline-none"
                    />
                    <span className="text-[10px] text-slate-400 block">
                      Остаток долга: <strong className="text-amber-400 font-mono">{Math.max(0, totalAmount - (Number(initialPayment) || 0)).toLocaleString('ru-RU')} {currencySymbol}</strong>
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* SUBMIT BUTTONS */}
            <div className="pt-3 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-colors text-xs"
              >
                Отмена
              </button>
              
              <button
                type="submit"
                className={`px-6 py-2.5 font-bold rounded-xl transition-all shadow-lg flex items-center gap-2 text-xs ${
                  isDebtMode
                    ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-950/50'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/50'
                }`}
              >
                <span>{isDebtMode ? 'Зафиксировать продажу в долг' : 'Подтвердить продажу'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
}
