import React, { useState, useMemo } from 'react';
import { 
  X, 
  Search, 
  ShoppingBag, 
  DollarSign, 
  TrendingUp, 
  Receipt, 
  Layers, 
  ArrowUpRight, 
  CheckCircle2, 
  PlusCircle, 
  Wallet,
  FileSpreadsheet,
  Coins,
  Package
} from 'lucide-react';
import { Product, ShipmentBatch } from '../types';

interface CalculatedProduct extends Product {
  itemDeliveryConverted: number;
  landedUnitCost: number;
  totalItemLandedCost: number;
  positionWholesaleRevenue: number;
  positionWholesaleProfit: number;
  positionRetailRevenue: number;
  positionRetailProfit: number;
}

interface SoldProductsModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: CalculatedProduct[];
  batchName: string;
  currencySymbol: string;
  targetCurrency: 'USD' | 'KGS';
  onTransferToDebt?: (productName: string, amount: number) => void;
  onOpenSalesAnalytics?: () => void;
}

export default function SoldProductsModal({
  isOpen,
  onClose,
  products,
  batchName,
  currencySymbol,
  targetCurrency,
  onTransferToDebt,
  onOpenSalesAnalytics
}: SoldProductsModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [profitFilter, setProfitFilter] = useState<'all' | 'high_profit' | 'retail' | 'wholesale'>('all');

  // KPI Calculations
  const stats = useMemo(() => {
    let totalCogs = 0;
    let totalRetailRevenue = 0;
    let totalRetailProfit = 0;
    let totalQuantity = 0;

    products.forEach(p => {
      totalCogs += p.totalItemLandedCost;
      totalRetailRevenue += p.positionRetailRevenue;
      totalRetailProfit += p.positionRetailProfit;
      totalQuantity += p.quantity;
    });

    const averageMargin = totalRetailRevenue > 0 
      ? Math.round((totalRetailProfit / totalRetailRevenue) * 100) 
      : 0;

    return {
      totalCogs,
      totalRetailRevenue,
      totalRetailProfit,
      totalQuantity,
      totalPositions: products.length,
      averageMargin
    };
  }, [products]);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const query = searchTerm.toLowerCase();
      const matchesSearch = p.name.toLowerCase().includes(query);
      if (!matchesSearch) return false;

      if (profitFilter === 'high_profit') {
        return p.positionRetailProfit > 0;
      }
      return true;
    });
  }, [products, searchTerm, profitFilter]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* MODAL HEADER */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <span>Список проданных и рассчитанных товаров</span>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-xs font-mono font-bold border border-blue-500/30">
                  {stats.totalPositions} поз. ({stats.totalQuantity} шт)
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">
                Партия: <strong className="text-slate-200">{batchName}</strong> • Детализация себестоимости и финансовых транзакций
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenSalesAnalytics && (
              <button
                onClick={() => {
                  onClose();
                  onOpenSalesAnalytics();
                }}
                className="px-3 py-1.5 bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow"
                title="Перейти в чеки и графики продаж"
              >
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span className="hidden sm:inline">Аналитика продаж</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-xl transition-all"
              title="Закрыть окно"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MODAL BODY (SCROLLABLE) */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* KPI CARDS SUMMARY */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            
            {/* Card 1: Total COGS */}
            <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-2xl font-mono">
              <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">
                Общая себестоимость (COGS)
              </span>
              <p className="text-base sm:text-xl font-bold text-blue-400">
                {stats.totalCogs.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} <span className="text-xs font-normal">{currencySymbol}</span>
              </p>
              <span className="text-[10px] text-slate-400 block mt-1">Закупка + доставка</span>
            </div>

            {/* Card 2: Total Revenue */}
            <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-2xl font-mono">
              <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">
                Ожидаемая Выручка
              </span>
              <p className="text-base sm:text-xl font-bold text-emerald-400">
                {stats.totalRetailRevenue.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} <span className="text-xs font-normal">{currencySymbol}</span>
              </p>
              <span className="text-[10px] text-slate-400 block mt-1">При розничной цене</span>
            </div>

            {/* Card 3: Net Profit */}
            <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-2xl font-mono">
              <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">
                Чистая Прибыль
              </span>
              <p className="text-base sm:text-xl font-bold text-purple-400">
                +{stats.totalRetailProfit.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} <span className="text-xs font-normal">{currencySymbol}</span>
              </p>
              <span className="text-[10px] text-slate-400 block mt-1">Маржа ~{stats.averageMargin}%</span>
            </div>

            {/* Card 4: Total Quantity */}
            <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-2xl font-mono">
              <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">
                Всего товаров (объем)
              </span>
              <p className="text-base sm:text-xl font-bold text-amber-400">
                {stats.totalQuantity} <span className="text-xs font-normal text-slate-400">шт</span>
              </p>
              <span className="text-[10px] text-slate-400 block mt-1">Во всех наименованиях</span>
            </div>

          </div>

          {/* SEARCH & FILTERS */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950/40 p-3 rounded-2xl border border-slate-800/80">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Поиск товара по названию..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 pl-9 pr-3 py-1.5 rounded-xl text-xs text-white placeholder-slate-500 outline-none"
              />
            </div>

            <div className="flex items-center gap-1 text-xs w-full sm:w-auto">
              <span className="text-slate-500 text-[11px] mr-1 hidden sm:inline">Фильтр:</span>
              <button
                onClick={() => setProfitFilter('all')}
                className={`px-3 py-1 rounded-xl font-medium transition-all ${
                  profitFilter === 'all' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Все позиции ({products.length})
              </button>
            </div>
          </div>

          {/* PRODUCTS LIST TABLE */}
          {filteredProducts.length === 0 ? (
            <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-8 text-center text-slate-500 text-xs">
              Товары не найдены. Попробуйте изменить запрос поиска.
            </div>
          ) : (
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl overflow-hidden shadow-inner">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 font-mono text-[10px] uppercase tracking-wider">
                    <tr>
                      <th className="p-3 pl-4">Наименование товара</th>
                      <th className="p-3 text-center">Кол-во</th>
                      <th className="p-3 font-mono">Китай (¥)</th>
                      <th className="p-3">Себестоимость 1 шт</th>
                      <th className="p-3">Итого COGS</th>
                      <th className="p-3">Продажа (1 шт)</th>
                      <th className="p-3">Прибыль позиции</th>
                      <th className="p-3 text-right pr-4">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredProducts.map((p) => {
                      return (
                        <tr key={p.id} className="hover:bg-slate-900/50 transition-colors">
                          
                          {/* Name */}
                          <td className="p-3 pl-4 font-bold text-white min-w-[200px]">
                            <div className="flex items-center gap-2">
                              {p.imageUrl ? (
                                <img
                                  src={p.imageUrl}
                                  alt={p.name}
                                  className="w-7 h-7 rounded-md object-cover border border-blue-500/40 flex-shrink-0"
                                />
                              ) : (
                                <Package className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                              )}
                              <span className="font-semibold text-xs leading-snug" title={p.name}>{p.name}</span>
                            </div>
                          </td>

                          {/* Quantity */}
                          <td className="p-3 text-center font-mono font-bold text-amber-400">
                            {p.quantity} шт
                          </td>

                          {/* CNY Price */}
                          <td className="p-3 font-mono text-slate-300">
                            ¥{p.priceCNY}
                          </td>

                          {/* Unit Landed Cost */}
                          <td className="p-3 font-mono">
                            <span className="text-blue-400 font-bold">
                              {p.landedUnitCost.toFixed(2)} {currencySymbol}
                            </span>
                            <span className="text-[10px] text-slate-500 block">
                              Дост: +{p.itemDeliveryConverted.toFixed(1)}
                            </span>
                          </td>

                          {/* Total COGS */}
                          <td className="p-3 font-mono font-bold text-white">
                            {p.totalItemLandedCost.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} {currencySymbol}
                          </td>

                          {/* Retail Selling Price */}
                          <td className="p-3 font-mono">
                            {p.retailPriceUSD > 0 ? (
                              <span className="text-emerald-400 font-bold">
                                {p.retailPriceUSD} {currencySymbol}
                              </span>
                            ) : (
                              <span className="text-slate-500 text-[10px]">Не указана</span>
                            )}
                          </td>

                          {/* Position Profit */}
                          <td className="p-3 font-mono">
                            <span className={`font-bold ${p.positionRetailProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              +{p.positionRetailProfit.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} {currencySymbol}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="p-3 text-right pr-4">
                            {onTransferToDebt && (
                              <button
                                onClick={() => {
                                  onTransferToDebt(
                                    `${p.name} (${p.quantity} шт)`, 
                                    p.positionRetailRevenue > 0 ? p.positionRetailRevenue : p.totalItemLandedCost
                                  );
                                  onClose();
                                }}
                                className="px-2.5 py-1 bg-amber-950/40 hover:bg-amber-900/70 border border-amber-800 text-amber-300 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1 ml-auto"
                                title="Продать в долг / Передать покупателю"
                              >
                                <Wallet className="w-3 h-3 text-amber-400" />
                                <span>В долг</span>
                              </button>
                            )}
                          </td>

                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 border-t border-slate-800 bg-slate-900 flex items-center justify-between text-xs">
          <span className="text-slate-400">
            💡 Нажмите <strong className="text-amber-400">"В долг"</strong> рядом с любым товаром, чтобы сразу зафиксировать его продажу в окне дебиторки!
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition-colors"
          >
            Закрыть
          </button>
        </div>

      </div>
    </div>
  );
}
