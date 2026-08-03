import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, 
  ShoppingBag, 
  Search, 
  Tag, 
  Wallet, 
  CheckCircle2, 
  AlertCircle, 
  Package, 
  Coins, 
  User, 
  Phone, 
  ArrowRight,
  Sparkles,
  Image as ImageIcon,
  Check,
  Camera,
  Upload,
  Trash2,
  Plus,
  Minus,
  CheckSquare,
  Square,
  ShoppingCart
} from 'lucide-react';
import { Product } from '../types';

export interface CalculatedProductForSale extends Product {
  landedUnitCost: number;
  wholesalePriceUSD: number;
  retailPriceUSD: number;
  totalItemLandedCost: number;
}

export interface SaleItemData {
  productId: string;
  productName: string;
  quantity: number;
  priceType: 'wholesale' | 'retail';
  unitPrice: number;
  totalAmount: number;
}

export interface CompleteSalePayload {
  items: SaleItemData[];
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
}

interface SellProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: CalculatedProductForSale[];
  batchName: string;
  currencySymbol: string;
  targetCurrency: 'USD' | 'KGS';
  onCompleteSale: (saleData: CompleteSalePayload) => void;
}

export interface CartItem {
  productId: string;
  productName: string;
  imageUrl?: string;
  availableStock: number;
  landedUnitCost: number;
  wholesalePriceUSD: number;
  retailPriceUSD: number;
  quantity: number;
  priceType: 'wholesale' | 'retail';
  customUnitPrice: string; // stored as string for input flexibility
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
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [deductStock, setDeductStock] = useState<boolean>(true);
  
  // Debt mode toggles
  const [isDebtMode, setIsDebtMode] = useState<boolean>(false);
  const [debtorName, setDebtorName] = useState<string>('');
  const [debtorPhone, setDebtorPhone] = useState<string>('');
  const [debtorPhotoUrl, setDebtorPhotoUrl] = useState<string>('');
  const [initialPayment, setInitialPayment] = useState<string>('0');

  // Success message modal state
  const [showSuccessToast, setShowSuccessToast] = useState<boolean>(false);
  const [lastSoldSummary, setLastSoldSummary] = useState<string>('');

  // Initialize cart when modal opens
  useEffect(() => {
    if (isOpen && products.length > 0 && cart.length === 0) {
      // Auto select the first product to get started
      const first = products[0];
      setCart([{
        productId: first.id,
        productName: first.name,
        imageUrl: first.imageUrl,
        availableStock: first.quantity,
        landedUnitCost: first.landedUnitCost,
        wholesalePriceUSD: first.wholesalePriceUSD,
        retailPriceUSD: first.retailPriceUSD,
        quantity: 1,
        priceType: 'retail',
        customUnitPrice: first.retailPriceUSD.toString()
      }]);
    }
  }, [isOpen, products]);

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

  if (!isOpen) return null;

  // Filtered products list for left panel selector
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Cart operations
  const isProductInCart = (productId: string) => cart.some(item => item.productId === productId);

  const toggleProductInCart = (p: CalculatedProductForSale) => {
    if (isProductInCart(p.id)) {
      setCart(prev => prev.filter(item => item.productId !== p.id));
    } else {
      setCart(prev => [
        ...prev,
        {
          productId: p.id,
          productName: p.name,
          imageUrl: p.imageUrl,
          availableStock: p.quantity,
          landedUnitCost: p.landedUnitCost,
          wholesalePriceUSD: p.wholesalePriceUSD,
          retailPriceUSD: p.retailPriceUSD,
          quantity: 1,
          priceType: 'retail',
          customUnitPrice: p.retailPriceUSD.toString()
        }
      ]);
    }
  };

  const selectAllProducts = () => {
    const newCart: CartItem[] = products.map(p => {
      const existing = cart.find(item => item.productId === p.id);
      if (existing) return existing;
      return {
        productId: p.id,
        productName: p.name,
        imageUrl: p.imageUrl,
        availableStock: p.quantity,
        landedUnitCost: p.landedUnitCost,
        wholesalePriceUSD: p.wholesalePriceUSD,
        retailPriceUSD: p.retailPriceUSD,
        quantity: 1,
        priceType: 'retail',
        customUnitPrice: p.retailPriceUSD.toString()
      };
    });
    setCart(newCart);
  };

  const clearCart = () => {
    setCart([]);
  };

  const updateCartItemQuantity = (productId: string, val: number) => {
    const validVal = Math.max(1, val);
    setCart(prev => prev.map(item => {
      if (item.productId === productId) {
        return { ...item, quantity: validVal };
      }
      return item;
    }));
  };

  const updateCartItemPriceType = (productId: string, priceType: 'wholesale' | 'retail') => {
    setCart(prev => prev.map(item => {
      if (item.productId === productId) {
        const defaultPrice = priceType === 'wholesale' ? item.wholesalePriceUSD : item.retailPriceUSD;
        return {
          ...item,
          priceType,
          customUnitPrice: defaultPrice.toString()
        };
      }
      return item;
    }));
  };

  const updateCartItemUnitPrice = (productId: string, priceStr: string) => {
    setCart(prev => prev.map(item => {
      if (item.productId === productId) {
        return { ...item, customUnitPrice: priceStr };
      }
      return item;
    }));
  };

  const removeCartItem = (productId: string) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  // Financial totals calculation
  const totalAmount = cart.reduce((sum, item) => {
    const price = Number(item.customUnitPrice) || 0;
    return sum + (item.quantity * price);
  }, 0);

  const totalLandedCost = cart.reduce((sum, item) => {
    return sum + (item.quantity * item.landedUnitCost);
  }, 0);

  const totalPcs = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPositions = cart.length;

  const estimatedProfit = totalAmount - totalLandedCost;
  const profitMarginPercent = totalAmount > 0 ? Math.round((estimatedProfit / totalAmount) * 100) : 0;

  // Check if any cart item exceeds stock
  const cartStockExeeded = deductStock && cart.some(item => item.quantity > item.availableStock);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      alert('Пожалуйста, выберите хотя бы один товар для продажи.');
      return;
    }
    if (isDebtMode && !debtorName.trim()) {
      alert('Пожалуйста, укажите имя покупателя / должника.');
      return;
    }

    const initPayNum = Number(initialPayment) || 0;

    const saleItemsData: SaleItemData[] = cart.map(item => {
      const priceNum = Number(item.customUnitPrice) || 0;
      return {
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        priceType: item.priceType,
        unitPrice: priceNum,
        totalAmount: item.quantity * priceNum
      };
    });

    const primaryItem = cart[0];
    const primaryUnitPrice = Number(primaryItem.customUnitPrice) || 0;
    const summaryTitle = cart.length === 1 
      ? `"${primaryItem.productName}" (${primaryItem.quantity} шт)`
      : `${cart.length} наименований (${totalPcs} шт)`;

    onCompleteSale({
      items: saleItemsData,
      productId: primaryItem.productId,
      productName: primaryItem.productName,
      quantity: primaryItem.quantity,
      priceType: primaryItem.priceType,
      unitPrice: primaryUnitPrice,
      totalAmount,
      isDebt: isDebtMode,
      debtorName: isDebtMode ? debtorName.trim() : undefined,
      debtorPhone: isDebtMode ? debtorPhone.trim() : undefined,
      debtorPhotoUrl: isDebtMode ? debtorPhotoUrl || undefined : undefined,
      initialPayment: isDebtMode ? initPayNum : undefined,
      deductStock
    });

    const summaryText = isDebtMode
      ? `Продано в долг: ${summaryTitle} на сумму ${totalAmount.toLocaleString('ru-RU')} ${currencySymbol} (Покупатель: ${debtorName})`
      : `Успешно продано: ${summaryTitle} на сумму ${totalAmount.toLocaleString('ru-RU')} ${currencySymbol}!`;

    setLastSoldSummary(summaryText);
    setShowSuccessToast(true);

    setTimeout(() => {
      setShowSuccessToast(false);
      onClose();
    }, 1800);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 animate-fadeIn">
      {/* Full-width responsive container */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl w-full max-w-7xl max-h-[96vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* HEADER */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2 flex-wrap">
                <span>Окно продажи товаров</span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-mono font-bold border border-emerald-500/30">
                  {batchName}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold border border-purple-500/30">
                  Выбрано: {cart.length} {cart.length === 1 ? 'товар' : 'товаров'}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5 hidden sm:block">
                Выбирайте несколько товаров из партии для одновременного оформления продажи или передачи в долг
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
          /* MAIN FORM CONTENT - Split 2-panel view on desktop */
          <form onSubmit={handleFormSubmit} className="flex flex-col lg:flex-row flex-1 overflow-hidden">
            
            {/* LEFT PANEL: PRODUCT SELECTION CATALOG */}
            <div className="lg:w-5/12 border-b lg:border-b-0 lg:border-r border-slate-800 flex flex-col bg-slate-950/40 p-4 sm:p-5 space-y-3 overflow-y-auto max-h-[40vh] lg:max-h-none">
              
              <div className="flex items-center justify-between">
                <label className="text-slate-300 font-bold flex items-center gap-1.5 text-xs">
                  <Package className="w-4 h-4 text-emerald-400" />
                  <span>1. Выберите товары ({filteredProducts.length} в каталоге):</span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={selectAllProducts}
                    className="text-[11px] text-emerald-400 hover:underline font-semibold"
                  >
                    Выбрать все
                  </button>
                  {cart.length > 0 && (
                    <button
                      type="button"
                      onClick={clearCart}
                      className="text-[11px] text-red-400 hover:underline font-semibold"
                    >
                      Сбросить
                    </button>
                  )}
                </div>
              </div>

              {/* Search filter */}
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

              {/* PRODUCTS CATALOG LIST */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {filteredProducts.length > 0 ? (
                  filteredProducts.map((p) => {
                    const inCart = isProductInCart(p.id);
                    const cartItem = cart.find(c => c.productId === p.id);

                    return (
                      <div
                        key={p.id}
                        onClick={() => toggleProductInCart(p)}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          inCart
                            ? 'bg-emerald-950/30 border-emerald-500/80 shadow-md shadow-emerald-950/30'
                            : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                        }`}
                      >
                        {/* LEFT: CHECKBOX + PHOTO + NAME */}
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all flex-shrink-0 ${
                            inCart
                              ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                              : 'border-slate-700 bg-slate-950 text-slate-600'
                          }`}>
                            <Check className={`w-3.5 h-3.5 stroke-[3] ${inCart ? 'opacity-100' : 'opacity-0'}`} />
                          </div>

                          {p.imageUrl ? (
                            <img
                              src={p.imageUrl}
                              alt={p.name}
                              className="w-11 h-11 rounded-lg object-cover border border-slate-700 flex-shrink-0"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-lg bg-slate-800 border border-slate-700 flex flex-col items-center justify-center text-slate-500 flex-shrink-0">
                              <ImageIcon className="w-4 h-4 text-slate-400" />
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-white text-xs flex items-center gap-1.5 flex-wrap">
                              <span>{p.name}</span>
                              {inCart && (
                                <span className="px-1.5 py-0.2 bg-emerald-500 text-slate-950 text-[9px] font-black rounded-full">
                                  В чеке ({cartItem?.quantity} шт)
                                </span>
                              )}
                            </h4>
                            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400 font-mono flex-wrap">
                              <span>Остаток: <strong className="text-amber-400">{p.quantity} шт</strong></span>
                              <span>•</span>
                              <span>Опт: <strong className="text-emerald-400">{p.wholesalePriceUSD} {currencySymbol}</strong></span>
                              <span>•</span>
                              <span>Розница: <strong className="text-purple-400">{p.retailPriceUSD} {currencySymbol}</strong></span>
                            </div>
                          </div>
                        </div>

                      </div>
                    );
                  })
                ) : (
                  <div className="p-6 text-center text-slate-500 italic text-xs">
                    Товары не найдены
                  </div>
                )}
              </div>

            </div>

            {/* RIGHT PANEL: SALE BASKET & TRANSACTION DETAILS */}
            <div className="lg:w-7/12 p-4 sm:p-5 flex flex-col space-y-4 overflow-y-auto flex-1 text-xs">
              
              {/* SECTION HEADER: BASKET */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2 font-bold text-white text-xs">
                  <ShoppingCart className="w-4 h-4 text-purple-400" />
                  <span>2. Выбранные товары в чеке ({cart.length} поз., всего {totalPcs} шт):</span>
                </div>
                {cart.length > 0 && (
                  <span className="text-[11px] font-mono text-emerald-400 font-bold">
                    Итого: {totalAmount.toLocaleString('ru-RU')} {currencySymbol}
                  </span>
                )}
              </div>

              {/* CART ITEMS LIST */}
              <div className="space-y-3 max-h-64 sm:max-h-72 overflow-y-auto pr-1">
                {cart.length === 0 ? (
                  <div className="p-8 border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center text-center text-slate-500 space-y-2">
                    <ShoppingCart className="w-8 h-8 text-slate-600" />
                    <p className="font-semibold text-slate-400 text-xs">Чек пуст</p>
                    <p className="text-[11px] text-slate-500">Нажмите на товары в панели слева, чтобы добавить их в продажу</p>
                  </div>
                ) : (
                  cart.map((item) => {
                    const itemUnitPriceNum = Number(item.customUnitPrice) || 0;
                    const itemTotal = item.quantity * itemUnitPriceNum;
                    const isItemStockExceeded = deductStock && item.quantity > item.availableStock;

                    return (
                      <div 
                        key={item.productId}
                        className="p-3 bg-slate-950/80 border border-slate-800/90 hover:border-slate-700 rounded-2xl space-y-2.5 transition-all"
                      >
                        {/* ITEM HEADER */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {item.imageUrl ? (
                              <img src={item.imageUrl} alt={item.productName} className="w-8 h-8 rounded-lg object-cover border border-slate-700 flex-shrink-0" />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500 flex-shrink-0">
                                <Package className="w-4 h-4" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <span className="font-bold text-white text-xs block truncate">{item.productName}</span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                Остаток: <strong className="text-amber-400">{item.availableStock} шт</strong>
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-xs font-bold font-mono text-emerald-400">
                              {itemTotal.toLocaleString('ru-RU')} {currencySymbol}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeCartItem(item.productId)}
                              className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-900 rounded-lg transition-colors"
                              title="Удалить из чека"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* PRICE MODE & QUANTITY & UNIT PRICE ROW */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-slate-900">
                          
                          {/* Price mode toggle */}
                          <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800">
                            <button
                              type="button"
                              onClick={() => updateCartItemPriceType(item.productId, 'wholesale')}
                              className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-bold transition-all ${
                                item.priceType === 'wholesale'
                                  ? 'bg-emerald-600 text-white'
                                  : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              ОПТ ({item.wholesalePriceUSD})
                            </button>
                            <button
                              type="button"
                              onClick={() => updateCartItemPriceType(item.productId, 'retail')}
                              className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-bold transition-all ${
                                item.priceType === 'retail'
                                  ? 'bg-purple-600 text-white'
                                  : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              РОЗНИЦА ({item.retailPriceUSD})
                            </button>
                          </div>

                          {/* Quantity control */}
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => updateCartItemQuantity(item.productId, item.quantity - 1)}
                              className="w-7 h-7 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold flex items-center justify-center text-xs"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateCartItemQuantity(item.productId, parseInt(e.target.value) || 1)}
                              className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-lg py-1 px-2 text-center text-xs font-mono font-bold text-amber-400 outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => updateCartItemQuantity(item.productId, item.quantity + 1)}
                              className="w-7 h-7 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold flex items-center justify-center text-xs"
                            >
                              +
                            </button>
                            {item.availableStock > 0 && (
                              <button
                                type="button"
                                onClick={() => updateCartItemQuantity(item.productId, item.availableStock)}
                                className="px-1.5 py-1 bg-amber-950/50 hover:bg-amber-900 text-amber-300 text-[9px] font-mono rounded font-bold"
                                title="Все доступные"
                              >
                                Все
                              </button>
                            )}
                          </div>

                          {/* Unit price input */}
                          <div className="relative">
                            <input
                              type="number"
                              step="any"
                              value={item.customUnitPrice}
                              onChange={(e) => updateCartItemUnitPrice(item.productId, e.target.value)}
                              placeholder="Цена за 1 шт"
                              className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-lg py-1 px-2 text-right text-xs font-mono font-bold text-emerald-400 outline-none"
                            />
                            <span className="text-[9px] text-slate-500 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none">
                              {currencySymbol} / шт
                            </span>
                          </div>

                        </div>

                        {isItemStockExceeded && (
                          <p className="text-[10px] text-red-400 flex items-center gap-1 font-medium pt-0.5">
                            <AlertCircle className="w-3 h-3" />
                            Внимание: Продажа ({item.quantity} шт) превышает остаток на складе ({item.availableStock} шт)
                          </p>
                        )}

                      </div>
                    );
                  })
                )}
              </div>

              {/* FINANCIAL SUMMARY CARD */}
              <div className="p-3.5 bg-gradient-to-br from-slate-950 to-slate-900 border border-emerald-500/30 rounded-2xl space-y-2">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <div>
                    <span className="text-slate-400 font-medium block">Итоговая сумма чека:</span>
                    <span className="text-[10px] text-slate-500">{totalPositions} поз. • {totalPcs} шт товаров</span>
                  </div>
                  <span className="text-lg font-bold font-mono text-emerald-400">
                    {totalAmount.toLocaleString('ru-RU')} {currencySymbol}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-0.5">
                  <div>
                    <span className="text-slate-500 block">Себестоимость:</span>
                    <span className="text-blue-400 font-bold">{totalLandedCost.toLocaleString('ru-RU')} {currencySymbol}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Чистая прибыль:</span>
                    <span className={`font-bold ${estimatedProfit >= 0 ? 'text-purple-400' : 'text-red-400'}`}>
                      +{estimatedProfit.toLocaleString('ru-RU')} {currencySymbol} ({profitMarginPercent}%)
                    </span>
                  </div>
                </div>
              </div>

              {/* DEDUCT STOCK CHECKBOX */}
              <div className="flex items-center gap-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                <input
                  type="checkbox"
                  id="deductStock"
                  checked={deductStock}
                  onChange={(e) => setDeductStock(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 bg-slate-900 border-slate-700 cursor-pointer"
                />
                <label htmlFor="deductStock" className="text-slate-300 font-medium cursor-pointer text-xs">
                  Автоматически списать проданные товары ({totalPcs} шт) из остатков партии
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
                  <div className="p-3.5 bg-amber-950/20 border border-amber-800/60 rounded-2xl space-y-3 animate-fadeIn">
                    <p className="text-amber-300 text-[11px] font-medium flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      Запись о долге будет добавлена в модуль «Долги»
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
                            className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 pl-8 pr-3 py-1.5 rounded-xl text-xs text-white outline-none"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-slate-300 font-bold block text-[11px]">
                          Телефон покупателя:
                        </label>
                        <div className="relative">
                          <Phone className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={debtorPhone}
                            onChange={(e) => setDebtorPhone(e.target.value)}
                            placeholder="+996 555 123456"
                            className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 pl-8 pr-3 py-1.5 rounded-xl text-xs text-white outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Фото должника */}
                    <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 space-y-2">
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
                            className="w-10 h-10 rounded-xl object-cover border border-amber-500/50 shadow-md flex-shrink-0" 
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-slate-900 border border-dashed border-slate-700 flex flex-col items-center justify-center text-slate-500 flex-shrink-0">
                            <Camera className="w-3.5 h-3.5 text-slate-600" />
                          </div>
                        )}

                        <div className="flex-1 space-y-1">
                          <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold rounded-xl border border-slate-700 transition-colors">
                            <Upload className="w-3 h-3 text-amber-400" />
                            <span>{debtorPhotoUrl ? 'Заменить' : 'Загрузить фото'}</span>
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
                            placeholder="Ссылка на фото (URL)"
                            className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl py-0.5 px-2 text-[10px] text-white outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-slate-300 font-bold block text-[11px]">
                        Первоначальный взнос ({currencySymbol}):
                      </label>
                      <input
                        type="number"
                        value={initialPayment}
                        onChange={(e) => setInitialPayment(e.target.value)}
                        placeholder="0"
                        className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 px-3 py-1.5 rounded-xl text-xs font-mono font-bold text-emerald-400 outline-none"
                      />
                      <span className="text-[10px] text-slate-400 block">
                        Остаток долга: <strong className="text-amber-400 font-mono">{Math.max(0, totalAmount - (Number(initialPayment) || 0)).toLocaleString('ru-RU')} {currencySymbol}</strong>
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* SUBMIT BUTTONS */}
              <div className="pt-2 flex items-center justify-end gap-3 mt-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-colors text-xs"
                >
                  Отмена
                </button>
                
                <button
                  type="submit"
                  disabled={cart.length === 0}
                  className={`px-6 py-2.5 font-bold rounded-xl transition-all shadow-lg flex items-center gap-2 text-xs ${
                    cart.length === 0 
                      ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                      : isDebtMode
                      ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-950/50'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/50'
                  }`}
                >
                  <span>
                    {isDebtMode 
                      ? `Зафиксировать продажу в долг (${cart.length} поз.)` 
                      : `Подтвердить продажу (${cart.length} поз.)`}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </div>

          </form>
        )}

      </div>
    </div>
  );
}
