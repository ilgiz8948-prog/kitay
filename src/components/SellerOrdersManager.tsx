import React, { useState } from 'react';
import { 
  Package, 
  Truck, 
  MapPin, 
  CheckCircle2, 
  Clock, 
  X, 
  Search, 
  Filter, 
  ChevronRight, 
  DollarSign, 
  User, 
  Phone, 
  RefreshCw,
  Send,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { MarketplaceOrder, OrderStatus } from '../types';

interface SellerOrdersManagerProps {
  isOpen: boolean;
  onClose: () => void;
  orders: MarketplaceOrder[];
  onUpdateOrderStatus: (
    orderId: string, 
    newStatus: OrderStatus, 
    locationName: string, 
    description: string
  ) => void;
}

export const SellerOrdersManager: React.FC<SellerOrdersManagerProps> = ({
  isOpen,
  onClose,
  orders,
  onUpdateOrderStatus,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingOrder, setEditingOrder] = useState<MarketplaceOrder | null>(null);
  const [nextStatus, setNextStatus] = useState<OrderStatus>('assembling');
  const [locationName, setLocationName] = useState('');
  const [statusDesc, setStatusDesc] = useState('');

  if (!isOpen) return null;

  const filteredOrders = orders.filter((o) => {
    if (filterStatus !== 'all' && o.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        o.orderNumber.toLowerCase().includes(q) ||
        o.trackingNumber.toLowerCase().includes(q) ||
        o.buyerName.toLowerCase().includes(q) ||
        o.buyerPhone.includes(q)
      );
    }
    return true;
  });

  const handleOpenStatusModal = (order: MarketplaceOrder) => {
    setEditingOrder(order);
    // suggest logical next status
    if (order.status === 'new') setNextStatus('assembling');
    else if (order.status === 'assembling') setNextStatus('shipped');
    else if (order.status === 'shipped') setNextStatus('at_pickup_point');
    else if (order.status === 'at_pickup_point') setNextStatus('delivered');
    else setNextStatus(order.status);

    setLocationName('Склад Бишкек / Логистический хаб');
    setStatusDesc('Статус обновлен продавцом');
  };

  const handleSaveStatusUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;
    onUpdateOrderStatus(
      editingOrder.id,
      nextStatus,
      locationName || 'Центральный склад',
      statusDesc || 'Статус обновлен'
    );
    setEditingOrder(null);
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'new':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">Новый заказ</span>;
      case 'assembling':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">Сборка на складе</span>;
      case 'shipped':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">В пути (Транзит)</span>;
      case 'at_pickup_point':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">В пункте выдачи</span>;
      case 'delivered':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-500/20 text-slate-300 border border-slate-500/30">Выдан покупателю</span>;
      case 'cancelled':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">Отменен</span>;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl w-full max-w-5xl h-[90vh] max-h-[800px] flex flex-col overflow-hidden shadow-2xl">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-b border-slate-800 p-4 sm:p-5 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300 font-bold">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Управление заказами маркетплейса</h2>
              <p className="text-xs text-slate-400">
                Всего заказов от клиентов: <strong className="text-indigo-300">{orders.length}</strong>
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

        {/* Filter Bar */}
        <div className="bg-slate-950/80 p-4 border-b border-slate-800 flex flex-wrap gap-3 items-center justify-between shrink-0">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по #заказа, трек-номеру или имени..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-xs text-white rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">Все статусы ({orders.length})</option>
              <option value="new">Новые заказы</option>
              <option value="assembling">На сборке</option>
              <option value="shipped">В пути</option>
              <option value="at_pickup_point">В пункте выдачи</option>
              <option value="delivered">Выданные</option>
            </select>
          </div>
        </div>

        {/* Orders Table / Cards */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12 text-slate-500 border border-dashed border-slate-800 rounded-2xl">
              <Package className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-semibold text-slate-400">Заказы не найдены</p>
            </div>
          ) : (
            filteredOrders.map((order) => (
              <div
                key={order.id}
                className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5 hover:border-slate-700 transition-all space-y-3"
              >
                <div className="flex flex-wrap justify-between items-start gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-extrabold text-white">{order.orderNumber}</span>
                      <span className="text-xs font-mono bg-slate-800 text-indigo-300 px-2 py-0.5 rounded border border-slate-700">
                        Трек: {order.trackingNumber}
                      </span>
                      {getStatusBadge(order.status)}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-400 mt-1">
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-indigo-400" /> {order.buyerName}
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-emerald-400" /> {order.buyerPhone}
                      </span>
                      <span>{new Date(order.createdAt).toLocaleString('ru-RU')}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenStatusModal(order)}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-2 rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 transition-all"
                    >
                      <Truck className="w-4 h-4" />
                      <span>Обновить статус доставки</span>
                    </button>
                  </div>
                </div>

                {/* Items preview */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="bg-slate-900/60 p-2 rounded-lg border border-slate-800 flex justify-between items-center">
                      <span className="font-medium text-slate-200">{item.productName} ({item.quantity} шт)</span>
                      <span className="font-bold text-indigo-300">{item.totalPrice.toLocaleString()} {order.currency === 'KGS' ? 'сом' : '$'}</span>
                    </div>
                  ))}
                </div>

                {/* Payment & Delivery details */}
                <div className="flex flex-wrap justify-between items-center text-xs text-slate-400 pt-1 border-t border-slate-800/60">
                  <div>
                    <span>Способ оплаты: </span>
                    <strong className="text-emerald-400">
                      {order.paymentMethod === 'stripe' ? 'Stripe (Безопасная карта)' : 'При получении'}
                    </strong>
                    {order.stripeTransactionId && (
                      <span className="ml-2 text-[10px] text-slate-500 font-mono">
                        ({order.stripeTransactionId})
                      </span>
                    )}
                  </div>
                  <div>
                    <span>Сумма заказа: </span>
                    <strong className="text-white text-sm font-extrabold">
                      {order.totalAmount.toLocaleString()} {order.currency === 'KGS' ? 'сом' : '$'}
                    </strong>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal to update status */}
        {editingOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white">
                  Изменение статуса логистики #{editingOrder.orderNumber}
                </h3>
                <button
                  onClick={() => setEditingOrder(null)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveStatusUpdate} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Новый этап доставки
                  </label>
                  <select
                    value={nextStatus}
                    onChange={(e) => setNextStatus(e.target.value as OrderStatus)}
                    className="w-full bg-slate-950 border border-slate-700 text-sm text-white rounded-lg p-2.5 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="new">Новый / Оплачен</option>
                    <option value="assembling">Сборка на складе</option>
                    <option value="shipped">В пути / Транзит</option>
                    <option value="at_pickup_point">Прибыл в пункт выдачи (ПВЗ)</option>
                    <option value="delivered">Вручен покупателю</option>
                    <option value="cancelled">Отменен</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Локация / Название хаба или ПВЗ
                  </label>
                  <input
                    type="text"
                    value={locationName}
                    onChange={(e) => setLocationName(e.target.value)}
                    placeholder="Склад Хоргос / ПВЗ Бишкек ул. Чуй 128"
                    className="w-full bg-slate-950 border border-slate-700 text-xs text-white rounded-lg p-2.5 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Примечание для покупателя (Push-уведомление)
                  </label>
                  <textarea
                    value={statusDesc}
                    onChange={(e) => setStatusDesc(e.target.value)}
                    placeholder="Ваш заказ успешно передан курьерской службе..."
                    rows={3}
                    className="w-full bg-slate-950 border border-slate-700 text-xs text-white rounded-lg p-2.5 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingOrder(null)}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold py-2.5 rounded-xl transition-all"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Send className="w-4 h-4" />
                    <span>Отправить уведомление</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SellerOrdersManager;
