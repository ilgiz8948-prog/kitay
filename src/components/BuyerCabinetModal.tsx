import React, { useState } from 'react';
import { 
  X, 
  Package, 
  Truck, 
  MapPin, 
  CheckCircle2, 
  Clock, 
  QrCode, 
  Bell, 
  User, 
  ChevronRight, 
  ShieldCheck, 
  AlertCircle,
  ExternalLink,
  ShoppingBag,
  RefreshCw,
  Copy,
  Check
} from 'lucide-react';
import { MarketplaceOrder, OrderStatus, PushNotification } from '../types';

interface BuyerCabinetModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: MarketplaceOrder[];
  notifications: PushNotification[];
  onMarkNotificationRead: (id: string) => void;
  buyerPhone: string;
  setBuyerPhone: (phone: string) => void;
  buyerName: string;
  setBuyerName: (name: string) => void;
}

export const BuyerCabinetModal: React.FC<BuyerCabinetModalProps> = ({
  isOpen,
  onClose,
  orders,
  notifications,
  onMarkNotificationRead,
  buyerPhone,
  setBuyerPhone,
  buyerName,
  setBuyerName,
}) => {
  const [activeTab, setActiveTab] = useState<'orders' | 'tracking' | 'notifications' | 'profile'>('orders');
  const [selectedOrder, setSelectedOrder] = useState<MarketplaceOrder | null>(null);
  const [copiedTrack, setCopiedTrack] = useState<string | null>(null);

  if (!isOpen) return null;

  // Filter buyer's orders by phone if specified, or show all customer orders
  const myOrders = orders.filter((o) => {
    if (!buyerPhone.trim()) return true;
    return o.buyerPhone.includes(buyerPhone.trim()) || o.buyerName.toLowerCase().includes(buyerName.toLowerCase());
  });

  const activeTrackingOrder = selectedOrder || myOrders[0] || null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTrack(text);
    setTimeout(() => setCopiedTrack(null), 2000);
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'new':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">Новый / Оплачен</span>;
      case 'assembling':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">Сборка на складе</span>;
      case 'shipped':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">В пути / Транзит</span>;
      case 'at_pickup_point':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Готов к выдаче в ПВЗ</span>;
      case 'delivered':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-gray-500/20 text-gray-300 border border-gray-500/30">Вручен покупателю</span>;
      case 'cancelled':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">Отменен</span>;
      default:
        return null;
    }
  };

  const statusPipelineSteps: { key: OrderStatus; label: string; icon: any }[] = [
    { key: 'new', label: 'Заказ создан', icon: ShoppingBag },
    { key: 'assembling', label: 'Сборка на складе', icon: Package },
    { key: 'shipped', label: 'В пути', icon: Truck },
    { key: 'at_pickup_point', label: 'В пункте выдачи', icon: MapPin },
    { key: 'delivered', label: 'Получен', icon: CheckCircle2 },
  ];

  const getStepState = (order: MarketplaceOrder, stepKey: OrderStatus) => {
    const orderIndex = statusPipelineSteps.findIndex(s => s.key === order.status);
    const stepIndex = statusPipelineSteps.findIndex(s => s.key === stepKey);
    if (order.status === 'cancelled') return 'cancelled';
    if (stepIndex < orderIndex) return 'completed';
    if (stepIndex === orderIndex) return 'current';
    return 'upcoming';
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl w-full max-w-4xl h-[90vh] max-h-[750px] flex flex-col overflow-hidden shadow-2xl">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-b border-slate-800 p-4 sm:p-5 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300 font-bold">
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">Личный кабинет покупателя</h2>
                <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-medium">
                  Wildberries Logistics Engine
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {buyerName ? `${buyerName} (${buyerPhone || 'без телефона'})` : 'Отслеживание заказов и доставка'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-slate-950/80 px-4 pt-2 border-b border-slate-800 flex gap-2 overflow-x-auto shrink-0 scrollbar-none">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'orders'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Мои заказы</span>
            <span className="bg-slate-800 text-slate-300 text-[10px] px-2 py-0.5 rounded-full">
              {myOrders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('tracking')}
            className={`px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'tracking'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Отслеживание в реальном времени</span>
          </button>

          <button
            onClick={() => setActiveTab('notifications')}
            className={`px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 transition-all relative whitespace-nowrap ${
              activeTab === 'notifications'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Push-уведомления</span>
            {unreadCount > 0 && (
              <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'profile'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Профиль & ПВЗ</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* TAB 1: MY ORDERS */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              {myOrders.length === 0 ? (
                <div className="text-center py-12 bg-slate-950/40 rounded-2xl border border-dashed border-slate-800">
                  <ShoppingBag className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <h3 className="text-base font-semibold text-slate-300">У вас пока нет оформленных заказов</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Выберите товары в витрине маркетплейса, добавьте их в корзину и оформите безопасную доставку.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {myOrders.map((order) => (
                    <div
                      key={order.id}
                      className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5 hover:border-slate-700 transition-all space-y-4"
                    >
                      <div className="flex flex-wrap justify-between items-start gap-2 border-b border-slate-800 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-base font-extrabold text-white">{order.orderNumber}</span>
                            <span className="text-xs font-mono bg-slate-800 text-indigo-300 px-2 py-0.5 rounded border border-slate-700">
                              Трек: {order.trackingNumber}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1">
                            Оформлен: {new Date(order.createdAt).toLocaleString('ru-RU')}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {getStatusBadge(order.status)}
                          <span className="text-xs text-slate-400">
                            Оплата:{' '}
                            <strong className={order.paymentStatus === 'paid' ? 'text-emerald-400' : 'text-amber-400'}>
                              {order.paymentMethod === 'stripe' ? 'Stripe (Карта)' : 'При получении'}
                            </strong>
                          </span>
                        </div>
                      </div>

                      {/* Items list */}
                      <div className="space-y-2">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
                            <div className="flex items-center gap-3">
                              {item.imageUrl ? (
                                <img src={item.imageUrl} alt={item.productName} className="w-10 h-10 object-cover rounded-lg border border-slate-700 shrink-0" />
                              ) : (
                                <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center text-slate-500 shrink-0">
                                  <Package className="w-5 h-5" />
                                </div>
                              )}
                              <div>
                                <p className="font-semibold text-slate-200">{item.productName}</p>
                                <p className="text-slate-400 text-[11px]">{item.quantity} шт. × {item.unitPrice.toLocaleString()} {order.currency === 'KGS' ? 'сом' : '$'}</p>
                              </div>
                            </div>
                            <span className="font-bold text-slate-200">{item.totalPrice.toLocaleString()} {order.currency === 'KGS' ? 'сом' : '$'}</span>
                          </div>
                        ))}
                      </div>

                      {/* Footer bar */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                        <div className="text-xs">
                          <span className="text-slate-400">Пункт назначения: </span>
                          <span className="font-medium text-slate-200">
                            {order.pickupPointName || order.deliveryAddress || 'ПВЗ Бишкек'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => {
                              setSelectedOrder(order);
                              setActiveTab('tracking');
                            }}
                            className="bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
                          >
                            <Truck className="w-3.5 h-3.5" />
                            <span>Отследить доставку</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: LIVE TRACKING PIPELINE */}
          {activeTab === 'tracking' && (
            <div className="space-y-6">
              {activeTrackingOrder ? (
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-6">
                  {/* Tracking header */}
                  <div className="flex flex-wrap justify-between items-start gap-4 border-b border-slate-800 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-extrabold text-white">{activeTrackingOrder.orderNumber}</h3>
                        {getStatusBadge(activeTrackingOrder.status)}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                        <span>Трек-номер:</span>
                        <span className="font-mono text-indigo-300 font-bold bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                          {activeTrackingOrder.trackingNumber}
                        </span>
                        <button
                          onClick={() => handleCopy(activeTrackingOrder.trackingNumber)}
                          className="text-slate-400 hover:text-white p-1 rounded"
                          title="Скопировать трек"
                        >
                          {copiedTrack === activeTrackingOrder.trackingNumber ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* QR Code & Pickup Pass Box */}
                    <div className="bg-gradient-to-br from-indigo-950 to-purple-950 border border-indigo-500/30 p-3 rounded-xl flex items-center gap-3">
                      <div className="bg-white p-1.5 rounded-lg shrink-0">
                        <QrCode className="w-12 h-12 text-slate-900" />
                      </div>
                      <div>
                        <p className="text-[10px] text-indigo-300 uppercase font-semibold">Код получения в ПВЗ</p>
                        <p className="text-xl font-extrabold font-mono text-white tracking-widest">{activeTrackingOrder.pickupCode}</p>
                        <p className="text-[10px] text-slate-400">Покажите QR в пункте выдачи</p>
                      </div>
                    </div>
                  </div>

                  {/* Wildberries-style status stepper */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-4">
                      Статус доставки в реальном времени
                    </h4>
                    <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      {statusPipelineSteps.map((stepItem, idx) => {
                        const stepState = getStepState(activeTrackingOrder, stepItem.key);
                        const StepIcon = stepItem.icon;

                        let circleStyle = 'bg-slate-800 text-slate-500 border-slate-700';
                        if (stepState === 'completed') circleStyle = 'bg-emerald-600 text-white border-emerald-400';
                        if (stepState === 'current') circleStyle = 'bg-indigo-600 text-white border-indigo-400 shadow-lg shadow-indigo-500/40 animate-pulse';

                        return (
                          <div key={stepItem.key} className="flex md:flex-col items-center gap-3 relative z-10 w-full md:w-auto">
                            <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center shrink-0 ${circleStyle}`}>
                              <StepIcon className="w-5 h-5" />
                            </div>
                            <div className="text-left md:text-center">
                              <p className={`text-xs font-bold ${stepState === 'current' ? 'text-indigo-400' : stepState === 'completed' ? 'text-emerald-300' : 'text-slate-500'}`}>
                                {stepItem.label}
                              </p>
                              <p className="text-[10px] text-slate-500">
                                {stepState === 'completed' || stepState === 'current' ? 'Подтверждено' : 'Ожидается'}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Detailed Logistics Log Timeline */}
                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-indigo-400" /> История перемещений посылки
                    </h4>
                    <div className="space-y-3 relative before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                      {activeTrackingOrder.statusHistory.map((history, hIdx) => (
                        <div key={hIdx} className="relative pl-7 text-xs">
                          <div className="absolute left-1.5 top-1 w-2.5 h-2.5 rounded-full bg-indigo-500 ring-4 ring-slate-900" />
                          <div className="flex flex-wrap justify-between items-center text-slate-400 text-[11px]">
                            <span className="font-semibold text-slate-200">{history.location}</span>
                            <span>{new Date(history.timestamp).toLocaleString('ru-RU')}</span>
                          </div>
                          <p className="text-slate-300 mt-0.5">{history.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  Нет выбранного заказа для отслеживания
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PUSH NOTIFICATIONS LOG */}
          {activeTab === 'notifications' && (
            <div className="space-y-3">
              {notifications.length === 0 ? (
                <div className="text-center py-12 text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                  <Bell className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm text-slate-400">Уведомлений пока нет</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => onMarkNotificationRead(n.id)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                      n.read
                        ? 'bg-slate-950 border-slate-850 text-slate-400'
                        : 'bg-indigo-950/40 border-indigo-500/40 text-slate-100 shadow-lg shadow-indigo-950/20'
                    }`}
                  >
                    <div className="p-2 rounded-lg bg-indigo-600/20 text-indigo-300 shrink-0 mt-0.5">
                      <Bell className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <h4 className="text-xs font-bold text-slate-200">{n.title}</h4>
                        <span className="text-[10px] text-slate-500">
                          {new Date(n.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1">{n.body}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 4: PROFILE & PICKUP POINTS */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <User className="w-4 h-4 text-indigo-400" /> Данные покупателя
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">ФИО Получателя</label>
                    <input
                      type="text"
                      value={buyerName}
                      onChange={(e) => setBuyerName(e.target.value)}
                      placeholder="Иван Иванов"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Номер телефона (SMS / WhatsApp)</label>
                    <input
                      type="text"
                      value={buyerPhone}
                      onChange={(e) => setBuyerPhone(e.target.value)}
                      placeholder="+996 555 000111"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Nearest Pickup Points (Wildberries style) */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-400" /> Выбранный пункт выдачи заказов (ПВЗ)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-indigo-950/40 border border-indigo-500/40 rounded-xl text-xs space-y-1">
                    <p className="font-bold text-indigo-200">ПВЗ Бишкек - Центр</p>
                    <p className="text-slate-300">ул. Чуй 128 (ориентир ЦУМ)</p>
                    <p className="text-slate-400 text-[11px]">Режим работы: 09:00 - 21:00 ежедневно</p>
                  </div>
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs space-y-1">
                    <p className="font-bold text-slate-200">ПВЗ Бишкек - Дордой</p>
                    <p className="text-slate-300">Рынок Дордой, проход 15, бокс 42</p>
                    <p className="text-slate-400 text-[11px]">Режим работы: 08:00 - 18:00 ежедневно</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BuyerCabinetModal;
