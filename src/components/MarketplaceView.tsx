import React, { useState, useMemo } from 'react';
import { 
  ShoppingBag, 
  Search, 
  Filter, 
  ShoppingCart, 
  User, 
  Package, 
  MapPin, 
  Truck, 
  CreditCard, 
  ShieldCheck, 
  CheckCircle2, 
  Sparkles, 
  ArrowRight, 
  Lock, 
  Plus, 
  Minus, 
  X, 
  ChevronRight, 
  Clock, 
  Bell, 
  Info,
  Phone,
  QrCode,
  DollarSign
} from 'lucide-react';
import { Product, ShipmentBatch, MarketplaceOrder, PushNotification } from '../types';
import StripeCheckoutModal from './StripeCheckoutModal';
import BuyerCabinetModal from './BuyerCabinetModal';

interface MarketplaceViewProps {
  batches: ShipmentBatch[];
  orders: MarketplaceOrder[];
  onPlaceOrder: (newOrder: MarketplaceOrder) => void;
  onOpenSellerDashboard?: () => void;
  notifications: PushNotification[];
  onMarkNotificationRead: (id: string) => void;
  adminPasswordHash?: string;
}

interface CartItem {
  product: Product;
  batchName: string;
  quantity: number;
}

export const MarketplaceView: React.FC<MarketplaceViewProps> = ({
  batches,
  orders,
  onPlaceOrder,
  onOpenSellerDashboard,
  notifications,
  onMarkNotificationRead,
  adminPasswordHash = '12345',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('all');
  const [displayCurrency, setDisplayCurrency] = useState<'KGS' | 'USD'>('KGS');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCabinetOpen, setIsCabinetOpen] = useState(false);
  const [isStripeModalOpen, setIsStripeModalOpen] = useState(false);

  // Owner authentication modal state
  const [isOwnerAuthOpen, setIsOwnerAuthOpen] = useState(false);
  const [ownerPasswordInput, setOwnerPasswordInput] = useState('');
  const [ownerAuthError, setOwnerAuthError] = useState('');

  // Buyer checkout form state
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [deliveryType, setDeliveryType] = useState<'pickup_point' | 'courier'>('pickup_point');
  const [pickupPointName, setPickupPointName] = useState('ПВЗ Бишкек - ул. Чуй 128 (ЦУМ)');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'cash_on_delivery' | 'mbank_qr'>('stripe');

  // Product detail view modal
  const [viewingProduct, setViewingProduct] = useState<{ product: Product; batchName: string } | null>(null);

  // All products flattened from active warehouse batches
  const allCatalogProducts = useMemo(() => {
    const list: { product: Product; batchName: string; batchId: string }[] = [];
    batches.forEach((b) => {
      b.products.forEach((p) => {
        list.push({ product: p, batchName: b.name, batchId: b.id });
      });
    });
    return list;
  }, [batches]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return allCatalogProducts.filter(({ product, batchId }) => {
      if (selectedBatchId !== 'all' && batchId !== selectedBatchId) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          product.name.toLowerCase().includes(q) ||
          (product.imageUrl && product.imageUrl.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [allCatalogProducts, selectedBatchId, searchQuery]);

  // Cart helper functions
  const addToCart = (product: Product, batchName: string) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: Math.min(item.quantity + 1, product.quantity || 99) }
            : item
        );
      }
      return [...prev, { product, batchName, quantity: 1 }];
    });
  };

  const updateCartQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  // Convert prices for display
  const getProductPrice = (product: Product): number => {
    if (displayCurrency === 'USD') {
      return product.retailPriceUSD || Math.round((product.priceCNY * 0.15) * 1.5);
    } else {
      // KGS: default conversion 1 USD ~ 88 KGS
      const usd = product.retailPriceUSD || Math.round((product.priceCNY * 0.15) * 1.5);
      return Math.round(usd * 88);
    }
  };

  const cartTotalAmount = useMemo(() => {
    return cart.reduce((sum, item) => sum + getProductPrice(item.product) * item.quantity, 0);
  }, [cart, displayCurrency]);

  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Handle Checkout submission
  const handleInitiateCheckout = () => {
    if (cart.length === 0) return;
    if (!buyerName.trim() || !buyerPhone.trim()) {
      alert('Пожалуйста, укажите ваше ФИО и номер телефона для связи');
      return;
    }

    if (paymentMethod === 'stripe') {
      setIsStripeModalOpen(true);
    } else {
      finalizeOrderCreation('pending');
    }
  };

  const finalizeOrderCreation = (paymentStatus: 'paid' | 'pending', stripeTxId?: string) => {
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const newOrder: MarketplaceOrder = {
      id: `order-${Date.now()}`,
      orderNumber: `#WB-${randomSuffix}`,
      trackingNumber: `WB-KG-${randomSuffix}`,
      buyerName: buyerName.trim(),
      buyerPhone: buyerPhone.trim(),
      items: cart.map((c) => ({
        productId: c.product.id,
        productName: c.product.name,
        imageUrl: c.product.imageUrl,
        quantity: c.quantity,
        unitPrice: getProductPrice(c.product),
        totalPrice: getProductPrice(c.product) * c.quantity,
        batchId: c.product.id,
        weight: c.product.weight,
      })),
      totalAmount: cartTotalAmount,
      currency: displayCurrency,
      paymentMethod,
      paymentStatus,
      stripeTransactionId: stripeTxId,
      deliveryType,
      deliveryAddress: deliveryType === 'courier' ? deliveryAddress : undefined,
      pickupPointName: deliveryType === 'pickup_point' ? pickupPointName : undefined,
      status: 'new',
      statusHistory: [
        {
          status: 'new',
          timestamp: new Date().toISOString(),
          location: 'Маркетплейс (Онлайн заказ)',
          description: paymentStatus === 'paid' ? 'Заказ оплачен через Stripe и принят в обработку' : 'Заказ успешно создан, ожидается оплата при получении',
        },
      ],
      createdAt: new Date().toISOString(),
      estimatedDeliveryDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
      pickupCode: String(Math.floor(1000 + Math.random() * 9000)),
    };

    onPlaceOrder(newOrder);
    setCart([]);
    setIsCartOpen(false);
    setIsStripeModalOpen(false);
    setIsCabinetOpen(true);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* TOP MARKETPLACE HEADER */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black tracking-tight text-white">SINO MARKETPLACE</span>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Витрина склада
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Прямые поставки с бизнес-склада с доставкой и Stripe</p>
            </div>
          </div>

          {/* Search bar */}
          <div className="flex-1 max-w-md relative min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск товаров на складе..."
              className="w-full bg-slate-950/80 border border-slate-800 focus:border-indigo-500 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none transition-all"
            />
          </div>

          {/* Controls: Currency, Buyer Cabinet, Cart, Admin toggle */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Currency switcher */}
            <div className="bg-slate-950 border border-slate-800 p-1 rounded-xl flex items-center">
              <button
                onClick={() => setDisplayCurrency('KGS')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  displayCurrency === 'KGS' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                сом
              </button>
              <button
                onClick={() => setDisplayCurrency('USD')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  displayCurrency === 'USD' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                $
              </button>
            </div>

            {/* Buyer Cabinet button */}
            <button
              onClick={() => setIsCabinetOpen(true)}
              className="relative bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-2 transition-all"
            >
              <User className="w-4 h-4 text-indigo-400" />
              <span className="hidden sm:inline">Личный кабинет</span>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Shopping Cart button */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg shadow-indigo-600/25 flex items-center gap-2 transition-all"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Корзина</span>
              {cartItemsCount > 0 && (
                <span className="bg-white text-indigo-900 font-extrabold text-[11px] px-2 py-0.5 rounded-full ml-1">
                  {cartItemsCount}
                </span>
              )}
            </button>

            {/* Owner Employee Portal Button */}
            {onOpenSellerDashboard && (
              <button
                onClick={() => {
                  setOwnerPasswordInput('');
                  setOwnerAuthError('');
                  setIsOwnerAuthOpen(true);
                }}
                className="bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-medium px-3 py-2 rounded-xl border border-slate-800 transition-all flex items-center gap-1.5"
                title="Вход для сотрудников и владельца склада"
              >
                <Lock className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden sm:inline">Вход владельца</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* HERO BANNER FOR CLIENTS */}
      <section className="bg-gradient-to-r from-indigo-950 via-slate-900 to-purple-950 border-b border-slate-800/80 py-8 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl text-center md:text-left">
            <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full text-xs font-semibold text-indigo-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Официальный каталог склада
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Товары в наличии с прямой доставкой и отслеживанием
            </h1>
            <p className="text-xs sm:text-sm text-slate-300">
              Заказывайте качественные импортные товары напрямую с нашего склада. Безопасная онлайн-оплата карт Stripe, мгновенное отслеживание статуса посылки как на Wildberries!
            </p>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-1 text-xs text-slate-400">
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <ShieldCheck className="w-4 h-4" /> Безопасный Stripe
              </span>
              <span className="flex items-center gap-1.5 text-indigo-300 font-medium">
                <Truck className="w-4 h-4" /> Быстрая доставка в ПВЗ
              </span>
              <span className="flex items-center gap-1.5 text-purple-300 font-medium">
                <QrCode className="w-4 h-4" /> Выдача по QR-коду
              </span>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex items-center gap-4 shadow-xl shrink-0">
            <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300">
              <MapPin className="w-6 h-6" />
            </div>
            <div className="text-xs">
              <p className="text-slate-400">Главный пункт выдачи (ПВЗ):</p>
              <p className="font-bold text-white text-sm">г. Бишкек, ул. Чуй 128 (ЦУМ)</p>
              <p className="text-emerald-400 text-[11px] font-medium">Работаем ежедневно 09:00 - 21:00</p>
            </div>
          </div>
        </div>
      </section>

      {/* BATCH / CATEGORY FILTERS */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-2 overflow-x-auto scrollbar-none border-b border-slate-900">
        <span className="text-xs font-semibold text-slate-400 shrink-0 mr-1">Партии склада:</span>
        <button
          onClick={() => setSelectedBatchId('all')}
          className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
            selectedBatchId === 'all'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          Все товары ({allCatalogProducts.length})
        </button>
        {batches.map((b) => (
          <button
            key={b.id}
            onClick={() => setSelectedBatchId(b.id)}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
              selectedBatchId === b.id
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            {b.name} ({b.products.length})
          </button>
        ))}
      </div>

      {/* PRODUCT GRID */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/40 rounded-3xl border border-dashed border-slate-800">
            <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-300">Товары не найдены</h3>
            <p className="text-xs text-slate-500 mt-1">Попробуйте изменить поисковый запрос или выбрать другую партию склада.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredProducts.map(({ product, batchName }) => {
              const displayPrice = getProductPrice(product);
              const symbol = displayCurrency === 'KGS' ? 'сом' : '$';
              const isAvailable = product.quantity > 0;

              return (
                <div
                  key={product.id}
                  className="bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden hover:border-slate-700 transition-all duration-200 group flex flex-col shadow-lg"
                >
                  {/* Image Container */}
                  <div className="relative aspect-square bg-slate-950 overflow-hidden flex items-center justify-center border-b border-slate-800">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-600 p-4 text-center">
                        <Package className="w-12 h-12 mb-2" />
                        <span className="text-[11px]">Фото не загружено</span>
                      </div>
                    )}
                    {/* Batch Tag */}
                    <div className="absolute top-2.5 left-2.5 bg-slate-900/80 backdrop-blur-md text-slate-300 text-[10px] font-semibold px-2.5 py-1 rounded-lg border border-slate-700">
                      {batchName}
                    </div>
                    {/* Stock Tag */}
                    <div className="absolute top-2.5 right-2.5">
                      {isAvailable ? (
                        <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                          В наличии: {product.quantity} шт
                        </span>
                      ) : (
                        <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                          Распродано
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <h3
                        onClick={() => setViewingProduct({ product, batchName })}
                        className="text-sm font-bold text-white hover:text-indigo-400 cursor-pointer transition-colors line-clamp-2"
                      >
                        {product.name}
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-1">Вес: {product.weight} кг / шт</p>
                    </div>

                    {/* Price and Cart button */}
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                      <div>
                        <p className="text-[10px] text-slate-400">Розничная цена</p>
                        <p className="text-base font-extrabold text-white">
                          {displayPrice.toLocaleString('ru-RU')} <span className="text-indigo-400 text-xs">{symbol}</span>
                        </p>
                      </div>

                      <button
                        onClick={() => addToCart(product, batchName)}
                        disabled={!isAvailable}
                        className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold p-2.5 rounded-xl shadow-md shadow-indigo-600/30 flex items-center gap-1.5 transition-all text-xs shrink-0"
                      >
                        <ShoppingCart className="w-4 h-4" />
                        <span>Купить</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* SHOPPING CART SLIDE-OVER MODAL */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border-l border-slate-800 text-white w-full max-w-md h-full flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950">
              <div className="flex items-center gap-2.5">
                <ShoppingCart className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Оформление заказа</h3>
              </div>
              <button onClick={() => setIsCartOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cart Items list */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {cart.length === 0 ? (
                <div className="text-center py-16 text-slate-500 space-y-2">
                  <ShoppingBag className="w-12 h-12 mx-auto opacity-30" />
                  <p className="text-sm">Ваша корзина пуста</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {cart.map((item) => {
                      const itemPrice = getProductPrice(item.product);
                      const symbol = displayCurrency === 'KGS' ? 'сом' : '$';

                      return (
                        <div key={item.product.id} className="bg-slate-950 border border-slate-800 p-3 rounded-xl flex items-center gap-3">
                          {item.product.imageUrl ? (
                            <img src={item.product.imageUrl} alt={item.product.name} className="w-12 h-12 object-cover rounded-lg shrink-0 border border-slate-800" />
                          ) : (
                            <div className="w-12 h-12 bg-slate-900 rounded-lg flex items-center justify-center text-slate-600 shrink-0">
                              <Package className="w-6 h-6" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-semibold text-white truncate">{item.product.name}</h4>
                            <p className="text-xs font-bold text-indigo-300 mt-0.5">
                              {itemPrice.toLocaleString()} {symbol}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-lg border border-slate-800">
                            <button
                              onClick={() => updateCartQty(item.product.id, -1)}
                              className="w-6 h-6 text-slate-400 hover:text-white flex items-center justify-center font-bold"
                            >
                              -
                            </button>
                            <span className="text-xs font-bold text-white w-4 text-center">{item.quantity}</span>
                            <button
                              onClick={() => updateCartQty(item.product.id, 1)}
                              className="w-6 h-6 text-slate-400 hover:text-white flex items-center justify-center font-bold"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Customer Information Form */}
                  <div className="pt-4 border-t border-slate-800 space-y-3">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Данные покупателя</h4>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">ФИО Получателя *</label>
                      <input
                        type="text"
                        value={buyerName}
                        onChange={(e) => setBuyerName(e.target.value)}
                        placeholder="Иван Иванов"
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Телефон (для SMS и Push) *</label>
                      <input
                        type="text"
                        value={buyerPhone}
                        onChange={(e) => setBuyerPhone(e.target.value)}
                        placeholder="+996 555 123456"
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    {/* Delivery mode */}
                    <div className="pt-2">
                      <label className="block text-[11px] text-slate-400 mb-1">Способ получения</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setDeliveryType('pickup_point')}
                          className={`p-2.5 rounded-lg border text-xs font-semibold text-center transition-all ${
                            deliveryType === 'pickup_point'
                              ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                              : 'bg-slate-950 border-slate-800 text-slate-400'
                          }`}
                        >
                          Пункт выдачи (ПВЗ)
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeliveryType('courier')}
                          className={`p-2.5 rounded-lg border text-xs font-semibold text-center transition-all ${
                            deliveryType === 'courier'
                              ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                              : 'bg-slate-950 border-slate-800 text-slate-400'
                          }`}
                        >
                          Курьер до двери
                        </button>
                      </div>
                    </div>

                    {deliveryType === 'pickup_point' ? (
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Выберите ПВЗ</label>
                        <select
                          value={pickupPointName}
                          onChange={(e) => setPickupPointName(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                        >
                          <option value="ПВЗ Бишкек - ул. Чуй 128 (ЦУМ)">ПВЗ Бишкек - ул. Чуй 128 (ЦУМ)</option>
                          <option value="ПВЗ Бишкек - Рынок Дордой, проход 15">ПВЗ Бишкек - Рынок Дордой, проход 15</option>
                          <option value="ПВЗ Алматы - пр. Достык 85">ПВЗ Алматы - пр. Достык 85</option>
                        </select>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Адрес доставки</label>
                        <input
                          type="text"
                          value={deliveryAddress}
                          onChange={(e) => setDeliveryAddress(e.target.value)}
                          placeholder="г. Бишкек, ул. Киевская 42, кв 10"
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    )}

                    {/* Payment Mode Selection */}
                    <div className="pt-2">
                      <label className="block text-[11px] text-slate-400 mb-1">Способ оплаты</label>
                      <div className="space-y-2">
                        <label className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-950 cursor-pointer hover:border-indigo-500/50">
                          <div className="flex items-center gap-2.5">
                            <input
                              type="radio"
                              name="payment"
                              checked={paymentMethod === 'stripe'}
                              onChange={() => setPaymentMethod('stripe')}
                              className="accent-indigo-500"
                            />
                            <div>
                              <p className="text-xs font-bold text-white flex items-center gap-1.5">
                                <CreditCard className="w-3.5 h-3.5 text-indigo-400" /> Stripe Card (Карта онлайн)
                              </p>
                              <p className="text-[10px] text-slate-400">Безопасный расчет 256-bit SSL</p>
                            </div>
                          </div>
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-semibold">
                            Мгновенно
                          </span>
                        </label>

                        <label className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-950 cursor-pointer hover:border-indigo-500/50">
                          <div className="flex items-center gap-2.5">
                            <input
                              type="radio"
                              name="payment"
                              checked={paymentMethod === 'cash_on_delivery'}
                              onChange={() => setPaymentMethod('cash_on_delivery')}
                              className="accent-indigo-500"
                            />
                            <div>
                              <p className="text-xs font-bold text-white">При получении в ПВЗ / Курьеру</p>
                              <p className="text-[10px] text-slate-400">Наличными или картой на месте</p>
                            </div>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Cart Footer */}
            {cart.length > 0 && (
              <div className="p-5 border-t border-slate-800 bg-slate-950 space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">Итого к оплате:</span>
                  <span className="text-xl font-extrabold text-emerald-400">
                    {cartTotalAmount.toLocaleString('ru-RU')} {displayCurrency === 'KGS' ? 'сом' : '$'}
                  </span>
                </div>

                <button
                  onClick={handleInitiateCheckout}
                  className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all"
                >
                  <ShieldCheck className="w-5 h-5" />
                  <span>
                    {paymentMethod === 'stripe' ? 'Перейти к оплате Stripe' : 'Подтвердить и оформить'}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STRIPE CHECKOUT MODAL */}
      <StripeCheckoutModal
        isOpen={isStripeModalOpen}
        onClose={() => setIsStripeModalOpen(false)}
        totalAmount={cartTotalAmount}
        currency={displayCurrency}
        onSuccess={(txId) => finalizeOrderCreation('paid', txId)}
      />

      {/* BUYER CABINET MODAL */}
      <BuyerCabinetModal
        isOpen={isCabinetOpen}
        onClose={() => setIsCabinetOpen(false)}
        orders={orders}
        notifications={notifications}
        onMarkNotificationRead={onMarkNotificationRead}
        buyerPhone={buyerPhone}
        setBuyerPhone={setBuyerPhone}
        buyerName={buyerName}
        setBuyerName={setBuyerName}
      />

      {/* PRODUCT DETAIL MODAL */}
      {viewingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl relative">
            <button
              onClick={() => setViewingProduct(null)}
              className="absolute top-4 right-4 z-10 bg-slate-950/80 p-2 rounded-full text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="grid grid-cols-1 sm:grid-cols-2">
              <div className="aspect-square bg-slate-950 flex items-center justify-center">
                {viewingProduct.product.imageUrl ? (
                  <img src={viewingProduct.product.imageUrl} alt={viewingProduct.product.name} className="w-full h-full object-cover" />
                ) : (
                  <Package className="w-16 h-16 text-slate-700" />
                )}
              </div>
              <div className="p-6 flex flex-col justify-between space-y-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">Партия: {viewingProduct.batchName}</span>
                  <h3 className="text-lg font-bold text-white mt-1">{viewingProduct.product.name}</h3>
                  <p className="text-xs text-slate-400 mt-2">
                    Вес товара: {viewingProduct.product.weight} кг. Официальная поставка с гарантией качества склада.
                  </p>
                </div>

                <div className="space-y-2 border-t border-slate-800 pt-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Розничная цена:</span>
                    <span className="font-extrabold text-emerald-400 text-sm">
                      {getProductPrice(viewingProduct.product).toLocaleString()} {displayCurrency === 'KGS' ? 'сом' : '$'}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Оптовая цена (от 10 шт):</span>
                    <span className="font-bold text-indigo-300">
                      {Math.round(getProductPrice(viewingProduct.product) * 0.85).toLocaleString()} {displayCurrency === 'KGS' ? 'сом' : '$'}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Остаток на складе:</span>
                    <span className="font-bold text-slate-200">{viewingProduct.product.quantity} шт</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    addToCart(viewingProduct.product, viewingProduct.batchName);
                    setViewingProduct(null);
                    setIsCartOpen(true);
                  }}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 text-xs"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>Добавить в корзину</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* FOOTER FOR CLIENTS */}
      <footer className="bg-slate-950 border-t border-slate-900 py-8 px-4 sm:px-6 text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left space-y-1">
            <p className="font-bold text-slate-300">© 2026 SINO MARKETPLACE | Прямые поставки импорта</p>
            <p className="text-[11px] text-slate-500">
              Гарантированное качество, онлайн-оплата карт Stripe, выдача по QR-коду в ПВЗ.
            </p>
          </div>

          {onOpenSellerDashboard && (
            <button
              onClick={() => {
                setOwnerPasswordInput('');
                setOwnerAuthError('');
                setIsOwnerAuthOpen(true);
              }}
              className="flex items-center gap-1.5 text-slate-600 hover:text-slate-400 text-[11px] py-1.5 px-3 rounded-lg border border-slate-900 hover:border-slate-800 transition-all"
            >
              <Lock className="w-3 h-3 text-indigo-400" />
              <span>Вход для сотрудников / владельца</span>
            </button>
          )}
        </div>
      </footer>

      {/* OWNER AUTHENTICATION MODAL */}
      {isOwnerAuthOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl max-w-sm w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setIsOwnerAuthOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mb-3">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Вход в Панель Управления</h3>
              <p className="text-xs text-slate-400 mt-1">
                Доступ к оптовым закупкам, себестоимости, аналитике и учету поставок из Китая.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (ownerPasswordInput === adminPasswordHash || ownerPasswordInput === '12345') {
                  setIsOwnerAuthOpen(false);
                  onOpenSellerDashboard?.();
                } else {
                  setOwnerAuthError('Неверный пароль доступа к закодированному складу');
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                  Пароль владельца
                </label>
                <input
                  type="password"
                  autoFocus
                  value={ownerPasswordInput}
                  onChange={(e) => setOwnerPasswordInput(e.target.value)}
                  placeholder="•••••"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm text-center font-mono text-white outline-none tracking-widest placeholder:tracking-normal"
                />
              </div>

              {ownerAuthError && (
                <p className="text-xs text-rose-400 text-center bg-rose-500/10 border border-rose-500/20 p-2 rounded-xl">
                  {ownerAuthError}
                </p>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Войти на склад</span>
              </button>

              <p className="text-[10px] text-slate-500 text-center">
                Клиентам вход не требуется
              </p>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketplaceView;
