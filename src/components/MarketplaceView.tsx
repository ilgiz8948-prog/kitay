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
  DollarSign,
  Building2
} from 'lucide-react';
import { Product, ShipmentBatch, MarketplaceOrder, PushNotification, MarketplaceSettings } from '../types';
import StripeCheckoutModal from './StripeCheckoutModal';
import BuyerCabinetModal from './BuyerCabinetModal';
import { AmperbikeLogo } from './AmperbikeLogo';

interface MarketplaceViewProps {
  batches: ShipmentBatch[];
  orders: MarketplaceOrder[];
  onPlaceOrder: (newOrder: MarketplaceOrder) => void;
  onOpenSellerDashboard?: () => void;
  notifications: PushNotification[];
  onMarkNotificationRead: (id: string) => void;
  adminPasswordHash?: string;
  marketplaceSettings?: MarketplaceSettings;
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
  marketplaceSettings,
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
    const list: { product: Product; batchName: string; batchId: string; batch: ShipmentBatch }[] = [];
    batches.forEach((b) => {
      b.products.forEach((p) => {
        list.push({ product: p, batchName: b.name, batchId: b.id, batch: b });
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

  // Convert prices for display using batch exchange rates
  const getProductPrice = (product: Product, batch?: ShipmentBatch): number => {
    const usdKgsRate = batch?.currencyRateUSDtoKGS || 88.0;
    const cnyKgsRate = batch?.currencyRateCNYtoKGS || 13.2;
    const cnyUsdRate = batch?.currencyRateCNYtoUSD || 0.15;

    if (displayCurrency === 'USD') {
      if (product.retailPriceUSD && product.retailPriceUSD > 0) {
        return Math.round(product.retailPriceUSD);
      }
      return Math.round(product.priceCNY * cnyUsdRate * 1.5);
    } else {
      if (product.retailPriceUSD && product.retailPriceUSD > 0) {
        return Math.round(product.retailPriceUSD * usdKgsRate);
      }
      return Math.round(product.priceCNY * cnyKgsRate * 1.5);
    }
  };

  const cartTotalAmount = useMemo(() => {
    return cart.reduce((sum, item) => {
      const parentBatch = batches.find((b) => b.name === item.batchName);
      return sum + getProductPrice(item.product, parentBatch) * item.quantity;
    }, 0);
  }, [cart, displayCurrency, batches]);

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
      deliveryType: 'pickup_point',
      deliveryAddress: undefined,
      pickupPointName: marketplaceSettings?.pvzAddress || 'г. Бишкек, ул. Чуй 128 (ЦУМ)',
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* TOP MARKETPLACE HEADER */}
      <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-emerald-950/80 shadow-2xl shadow-emerald-950/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
          {/* Brand Logo with Amperbike */}
          <AmperbikeLogo size="md" showText={true} />

          {/* Search bar */}
          <div className="flex-1 max-w-md relative min-w-[220px]">
            <Search className="w-4 h-4 text-emerald-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск электротранспорта и товаров на складе..."
              className="w-full bg-slate-900/90 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none transition-all"
            />
          </div>

          {/* Controls: Currency, Buyer Cabinet, Cart, Admin toggle */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Currency switcher */}
            <div className="bg-slate-900 border border-slate-800 p-1 rounded-xl flex items-center">
              <button
                onClick={() => setDisplayCurrency('KGS')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  displayCurrency === 'KGS' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30' : 'text-slate-400 hover:text-white'
                }`}
              >
                сом
              </button>
              <button
                onClick={() => setDisplayCurrency('USD')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  displayCurrency === 'USD' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30' : 'text-slate-400 hover:text-white'
                }`}
              >
                $
              </button>
            </div>

            {/* Buyer Cabinet button */}
            <button
              onClick={() => setIsCabinetOpen(true)}
              className="relative bg-slate-900 border border-slate-800 hover:border-emerald-500/40 text-slate-200 text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-2 transition-all group"
            >
              <User className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline">Личный кабинет</span>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-amber-400 text-slate-950 text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-extrabold animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Shopping Cart button */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative bg-gradient-to-r from-emerald-600 via-green-600 to-lime-600 hover:from-emerald-500 hover:to-lime-500 text-slate-950 text-xs font-extrabold px-4 py-2 rounded-xl shadow-lg shadow-emerald-600/25 flex items-center gap-2 transition-all"
            >
              <ShoppingCart className="w-4 h-4 text-slate-950" />
              <span>Корзина</span>
              {cartItemsCount > 0 && (
                <span className="bg-slate-950 text-amber-400 font-black text-[11px] px-2 py-0.5 rounded-full ml-1 border border-amber-400/30">
                  {cartItemsCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* HERO BANNER FOR CLIENTS - AMPERBIKE GREEN & YELLOW LIGHTNING STYLING */}
      <section className="relative overflow-hidden bg-gradient-to-r from-emerald-950 via-slate-950 to-green-950 border-b border-emerald-900/40 py-8 px-4 sm:px-6">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-10 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div className="space-y-3 max-w-2xl text-center md:text-left">
            <div className="inline-flex items-center gap-2 bg-emerald-500/15 border border-emerald-500/30 px-3.5 py-1 rounded-full text-xs font-bold text-emerald-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> {marketplaceSettings?.storeName || 'Amperbike.kg'} — Прямые импортные поставки
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {marketplaceSettings?.heroTitle || 'Электротранспорт и качественные товары в наличии в Бишкеке'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {marketplaceSettings?.heroSubtitle || 'Официальный каталог Amperbike.kg с прямой гарантией склада. Безопасная онлайн-оплата карт Stripe, экспресс-выдача в ПВЗ по QR-коду и быстрая курьерская доставка.'}
            </p>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-1 text-xs text-slate-300">
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> Гарантия качества
              </span>
              <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
                <Truck className="w-4 h-4 text-amber-400" /> Быстрая доставка в ПВЗ
              </span>
              <span className="flex items-center gap-1.5 text-lime-400 font-semibold">
                <QrCode className="w-4 h-4 text-lime-400" /> Выдача по QR-коду
              </span>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-emerald-500/30 p-4 rounded-2xl flex items-center gap-4 shadow-2xl shadow-emerald-950/50 shrink-0">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <MapPin className="w-6 h-6" />
            </div>
            <div className="text-xs">
              <p className="text-slate-400">Пункт выдачи Amperbike (ПВЗ):</p>
              <p className="font-bold text-white text-sm">{marketplaceSettings?.pvzAddress || 'г. Бишкек, ул. Чуй 128 (ЦУМ)'}</p>
              <p className="text-emerald-400 text-[11px] font-semibold flex items-center gap-1 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                {marketplaceSettings?.pvzWorkingHours || 'Работаем ежедневно 09:00 - 21:00'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* PRODUCT GRID */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/40 rounded-3xl border border-dashed border-slate-800">
            <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-300">Товары не найдены</h3>
            <p className="text-xs text-slate-500 mt-1">Попробуйте изменить поисковый запрос.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredProducts.map(({ product, batchName, batch }) => {
              const displayPrice = getProductPrice(product, batch);
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
                        className="text-sm font-bold text-white hover:text-emerald-400 cursor-pointer transition-colors line-clamp-2"
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
                          {displayPrice.toLocaleString('ru-RU')} <span className="text-emerald-400 text-xs font-bold">{symbol}</span>
                        </p>
                      </div>

                      <button
                        onClick={() => addToCart(product, batchName)}
                        disabled={!isAvailable}
                        className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-40 text-slate-950 font-extrabold p-2.5 rounded-xl shadow-md shadow-emerald-600/30 flex items-center gap-1.5 transition-all text-xs shrink-0"
                      >
                        <ShoppingCart className="w-4 h-4 text-slate-950" />
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
        <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border-l border-slate-800 text-white w-full max-w-md h-full flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950">
              <div className="flex items-center gap-2.5">
                <ShoppingCart className="w-5 h-5 text-emerald-400" />
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
                  <ShoppingBag className="w-12 h-12 mx-auto opacity-30 text-emerald-500" />
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
                            <p className="text-xs font-bold text-emerald-400 mt-0.5">
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
                    <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Данные покупателя</h4>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">ФИО Получателя *</label>
                      <input
                        type="text"
                        value={buyerName}
                        onChange={(e) => setBuyerName(e.target.value)}
                        placeholder="Иван Иванов"
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Телефон (для SMS и Push) *</label>
                      <input
                        type="text"
                        value={buyerPhone}
                        onChange={(e) => setBuyerPhone(e.target.value)}
                        placeholder="+996 555 123456"
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    {/* Delivery mode */}
                    <div className="pt-2">
                      <label className="block text-[11px] text-slate-400 mb-1 font-semibold">Пункт выдачи заказа (ПВЗ)</label>
                      <div className="bg-slate-950 p-3.5 rounded-xl border border-emerald-500/30 space-y-1.5">
                        <div className="flex items-center gap-2 text-xs font-bold text-white">
                          <Building2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>{marketplaceSettings?.pvzAddress || 'г. Бишкек, ул. Чуй 128 (ЦУМ)'}</span>
                        </div>
                        <div className="text-[11px] text-emerald-400 flex items-center gap-1.5 pl-6">
                          <Clock className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span>{marketplaceSettings?.pvzWorkingHours || 'Работаем ежедневно 09:00 - 21:00'}</span>
                        </div>
                        {marketplaceSettings?.pvzPhone && (
                          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 pl-6">
                            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{marketplaceSettings.pvzPhone}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Payment Mode Selection */}
                    <div className="pt-2">
                      <label className="block text-[11px] text-slate-400 mb-1 font-semibold">Способ оплаты</label>
                      <div className="space-y-2">
                        <label className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-950 cursor-pointer hover:border-emerald-500/50">
                          <div className="flex items-center gap-2.5">
                            <input
                              type="radio"
                              name="payment"
                              checked={paymentMethod === 'stripe'}
                              onChange={() => setPaymentMethod('stripe')}
                              className="accent-emerald-500"
                            />
                            <div>
                              <p className="text-xs font-bold text-white flex items-center gap-1.5">
                                <CreditCard className="w-3.5 h-3.5 text-emerald-400" /> Stripe Card (Карта онлайн)
                              </p>
                              <p className="text-[10px] text-slate-400">Безопасный расчет 256-bit SSL</p>
                            </div>
                          </div>
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-semibold">
                            Мгновенно
                          </span>
                        </label>

                        <label className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-950 cursor-pointer hover:border-emerald-500/50">
                          <div className="flex items-center gap-2.5">
                            <input
                              type="radio"
                              name="payment"
                              checked={paymentMethod === 'cash_on_delivery'}
                              onChange={() => setPaymentMethod('cash_on_delivery')}
                              className="accent-emerald-500"
                            />
                            <div>
                              <p className="text-xs font-bold text-white">При получении в ПВЗ</p>
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
                  className="w-full bg-gradient-to-r from-emerald-600 via-green-600 to-lime-600 hover:from-emerald-500 hover:to-lime-500 text-slate-950 font-extrabold py-3 px-4 rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all"
                >
                  <ShieldCheck className="w-5 h-5 text-slate-950" />
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
      {viewingProduct && (() => {
        const viewingBatch = batches.find(b => b.name === viewingProduct.batchName);
        const itemPrice = getProductPrice(viewingProduct.product, viewingBatch);

        return (
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
                    <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">В наличии в Бишкеке</span>
                    <h3 className="text-lg font-bold text-white mt-1">{viewingProduct.product.name}</h3>
                    <p className="text-xs text-slate-400 mt-2">
                      Вес товара: {viewingProduct.product.weight} кг. Официальная поставка с гарантией качества Amperbike.kg.
                    </p>
                  </div>

                  <div className="space-y-2 border-t border-slate-800 pt-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Розничная цена:</span>
                      <span className="font-extrabold text-emerald-400 text-sm">
                        {itemPrice.toLocaleString()} {displayCurrency === 'KGS' ? 'сом' : '$'}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Оптовая цена (от 10 шт):</span>
                      <span className="font-bold text-amber-400">
                        {Math.round(itemPrice * 0.85).toLocaleString()} {displayCurrency === 'KGS' ? 'сом' : '$'}
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
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-extrabold py-3 rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 text-xs"
                  >
                    <ShoppingCart className="w-4 h-4 text-slate-950" />
                    <span>Добавить в корзину</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
      {/* FOOTER FOR CLIENTS */}
      <footer className="bg-slate-950 border-t border-slate-900 py-8 px-4 sm:px-6 text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left space-y-1">
            <p className="font-bold text-slate-300">© 2026 Amperbike.kg | SINO MARKETPLACE</p>
            <p className="text-[11px] text-slate-500">
              Гарантированное качество, электротранспорт, онлайн-оплата карт Stripe, выдача по QR-коду в ПВЗ.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MarketplaceView;
