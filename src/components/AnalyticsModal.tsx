import React, { useState, useMemo } from 'react';
import { 
  X, 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Package, 
  Scale, 
  Wallet, 
  PieChart, 
  Award, 
  FileText, 
  Printer, 
  Layers, 
  ShoppingBag, 
  Coins,
  ArrowUpRight,
  ShieldAlert,
  Calendar,
  CheckCircle2,
  Filter,
  Search,
  ChevronRight,
  Info,
  ListFilter
} from 'lucide-react';
import { ShipmentBatch, DebtRecord, Product } from '../types';

interface AnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  batches: ShipmentBatch[];
  debts: DebtRecord[];
  activeBatchId: string;
  onOpenSalesAnalytics?: () => void;
}

type DetailType = 'cogs' | 'retail' | 'wholesale' | 'debts' | 'inventory' | 'expenses' | 'top' | null;

export default function AnalyticsModal({
  isOpen,
  onClose,
  batches = [],
  debts = [],
  activeBatchId,
  onOpenSalesAnalytics
}: AnalyticsModalProps) {
  const [selectedBatchFilter, setSelectedBatchFilter] = useState<string>('all');
  const [showPrintReport, setShowPrintReport] = useState<boolean>(false);
  const [activeDetail, setActiveDetail] = useState<DetailType>(null);
  const [detailSearchQuery, setDetailSearchQuery] = useState<string>('');

  // Selected batches list based on filter
  const filteredBatches = useMemo(() => {
    const list = batches || [];
    if (selectedBatchFilter === 'all') return list;
    return list.filter(b => b.id === selectedBatchFilter);
  }, [batches, selectedBatchFilter]);

  // Comprehensive analytics calculation across filtered batches
  const analytics = useMemo(() => {
    let totalProductsCount = 0;
    let totalStockUnits = 0;
    let totalWeightKg = 0;

    let totalPurchaseCostUSD = 0;
    let totalPurchaseCostKGS = 0;

    let totalDeliveryCostUSD = 0;
    let totalDeliveryCostKGS = 0;

    let totalLandedCostUSD = 0;
    let totalLandedCostKGS = 0;

    let totalWholesaleRevenueUSD = 0;
    let totalWholesaleRevenueKGS = 0;

    let totalRetailRevenueUSD = 0;
    let totalRetailRevenueKGS = 0;

    const allCalculatedProducts: Array<Product & {
      batchName: string;
      landedUnitCostUSD: number;
      landedUnitCostKGS: number;
      totalWholesaleProfitUSD: number;
      totalRetailProfitUSD: number;
      totalWholesaleProfitKGS: number;
      totalRetailProfitKGS: number;
      profitMarginPercent: number;
    }> = [];

    (filteredBatches || []).forEach(batch => {
      const cnyToUSD = batch.currencyRateCNYtoUSD || 0.14;
      const cnyToKGS = batch.currencyRateCNYtoKGS || 12.2;
      const usdToKGS = batch.currencyRateUSDtoKGS || 87.0;

      (batch.products || []).forEach(p => {
        const qty = p.quantity || 0;
        const wt = p.weight || 0;
        const totalPosWeight = qty * wt;

        totalProductsCount += 1;
        totalStockUnits += qty;
        totalWeightKg += totalPosWeight;

        // Purchase cost in CNY
        const posCNY = qty * (p.priceCNY || 0);
        const posPurchaseUSD = posCNY * cnyToUSD;
        const posPurchaseKGS = posCNY * cnyToKGS;

        // Delivery cost
        let posDeliveryKGS = 0;
        let posDeliveryUSD = 0;

        const delCurrency = p.deliveryCurrency || (p.deliveryMode === 'weight' ? 'USD' : batch.targetCurrency);
        let valInKGS = 0;
        let valInUSD = 0;

        if (delCurrency === 'USD') {
          valInUSD = p.deliveryValue || 0;
          valInKGS = valInUSD * usdToKGS;
        } else {
          valInKGS = p.deliveryValue || 0;
          valInUSD = usdToKGS > 0 ? valInKGS / usdToKGS : 0;
        }

        if (p.deliveryMode === 'flat') {
          posDeliveryKGS = qty * valInKGS;
          posDeliveryUSD = qty * valInUSD;
        } else if (p.deliveryMode === 'total') {
          posDeliveryKGS = valInKGS;
          posDeliveryUSD = valInUSD;
        } else if (p.deliveryMode === 'weight') {
          posDeliveryKGS = totalPosWeight * valInKGS;
          posDeliveryUSD = totalPosWeight * valInUSD;
        }

        const posLandedCostUSD = posPurchaseUSD + posDeliveryUSD;
        const posLandedCostKGS = posPurchaseKGS + posDeliveryKGS;

        const landedUnitCostUSD = qty > 0 ? posLandedCostUSD / qty : 0;
        const landedUnitCostKGS = qty > 0 ? posLandedCostKGS / qty : 0;

        // Selling prices
        let posWholesaleRevUSD = 0;
        let posWholesaleRevKGS = 0;
        let posRetailRevUSD = 0;
        let posRetailRevKGS = 0;

        if (batch.targetCurrency === 'KGS') {
          posWholesaleRevKGS = qty * (p.wholesalePriceUSD || 0);
          posRetailRevKGS = qty * (p.retailPriceUSD || 0);
          posWholesaleRevUSD = cnyToKGS > 0 ? (posWholesaleRevKGS / cnyToKGS) * cnyToUSD : 0;
          posRetailRevUSD = cnyToKGS > 0 ? (posRetailRevKGS / cnyToKGS) * cnyToUSD : 0;
        } else {
          posWholesaleRevUSD = qty * (p.wholesalePriceUSD || 0);
          posRetailRevUSD = qty * (p.retailPriceUSD || 0);
          posWholesaleRevKGS = cnyToUSD > 0 ? (posWholesaleRevUSD / cnyToUSD) * cnyToKGS : 0;
          posRetailRevKGS = cnyToUSD > 0 ? (posRetailRevUSD / cnyToUSD) * cnyToKGS : 0;
        }

        totalPurchaseCostUSD += posPurchaseUSD;
        totalPurchaseCostKGS += posPurchaseKGS;

        totalDeliveryCostUSD += posDeliveryUSD;
        totalDeliveryCostKGS += posDeliveryKGS;

        totalLandedCostUSD += posLandedCostUSD;
        totalLandedCostKGS += posLandedCostKGS;

        totalWholesaleRevenueUSD += posWholesaleRevUSD;
        totalWholesaleRevenueKGS += posWholesaleRevKGS;

        totalRetailRevenueUSD += posRetailRevUSD;
        totalRetailRevenueKGS += posRetailRevKGS;

        const totalWholesaleProfitUSD = posWholesaleRevUSD - posLandedCostUSD;
        const totalRetailProfitUSD = posRetailRevUSD - posLandedCostUSD;
        const totalWholesaleProfitKGS = posWholesaleRevKGS - posLandedCostKGS;
        const totalRetailProfitKGS = posRetailRevKGS - posLandedCostKGS;

        const profitMarginPercent = posRetailRevKGS > 0 
          ? Math.round((totalRetailProfitKGS / posRetailRevKGS) * 100) 
          : 0;

        allCalculatedProducts.push({
          ...p,
          batchName: batch.name,
          landedUnitCostUSD,
          landedUnitCostKGS,
          totalWholesaleProfitUSD,
          totalRetailProfitUSD,
          totalWholesaleProfitKGS,
          totalRetailProfitKGS,
          profitMarginPercent
        });
      });
    });

    const totalWholesaleProfitUSD = totalWholesaleRevenueUSD - totalLandedCostUSD;
    const totalWholesaleProfitKGS = totalWholesaleRevenueKGS - totalLandedCostKGS;

    const totalRetailProfitUSD = totalRetailRevenueUSD - totalLandedCostUSD;
    const totalRetailProfitKGS = totalRetailRevenueKGS - totalLandedCostKGS;

    const wholesaleROI = totalLandedCostKGS > 0 ? (totalWholesaleProfitKGS / totalLandedCostKGS) * 100 : 0;
    const retailROI = totalLandedCostKGS > 0 ? (totalRetailProfitKGS / totalLandedCostKGS) * 100 : 0;

    // Debt Analytics
    const defaultUsdRate = (filteredBatches && filteredBatches[0]?.currencyRateUSDtoKGS) || 87.0;
    let totalDebtKGS = 0;
    let paidDebtKGS = 0;
    (debts || []).forEach(d => {
      const remaining = (d.totalAmount || 0) - (d.paidAmount || 0);
      if (d.currency === 'KGS') {
        totalDebtKGS += remaining;
        paidDebtKGS += (d.paidAmount || 0);
      } else {
        totalDebtKGS += remaining * defaultUsdRate;
        paidDebtKGS += (d.paidAmount || 0) * defaultUsdRate;
      }
    });

    // Top profitable products
    const sortedByProfit = [...allCalculatedProducts].sort(
      (a, b) => b.totalRetailProfitKGS - a.totalRetailProfitKGS
    );

    return {
      totalProductsCount,
      totalStockUnits,
      totalWeightKg,
      totalPurchaseCostUSD,
      totalPurchaseCostKGS,
      totalDeliveryCostUSD,
      totalDeliveryCostKGS,
      totalLandedCostUSD,
      totalLandedCostKGS,
      totalWholesaleRevenueUSD,
      totalWholesaleRevenueKGS,
      totalRetailRevenueUSD,
      totalRetailRevenueKGS,
      totalWholesaleProfitUSD,
      totalWholesaleProfitKGS,
      totalRetailProfitUSD,
      totalRetailProfitKGS,
      wholesaleROI,
      retailROI,
      totalDebtKGS,
      paidDebtKGS,
      allCalculatedProducts,
      sortedByProfit
    };
  }, [filteredBatches, debts]);

  // Search filtered products for detail views
  const filteredProductsList = useMemo(() => {
    const q = detailSearchQuery.trim().toLowerCase();
    if (!q) return analytics.allCalculatedProducts;
    return analytics.allCalculatedProducts.filter(p => 
      p.name.toLowerCase().includes(q) || 
      (p.batchName && p.batchName.toLowerCase().includes(q))
    );
  }, [analytics.allCalculatedProducts, detailSearchQuery]);

  const filteredDebtsList = useMemo(() => {
    const q = detailSearchQuery.trim().toLowerCase();
    if (!q) return debts;
    return debts.filter(d => 
      (d.debtorName && d.debtorName.toLowerCase().includes(q)) || 
      (d.productName && d.productName.toLowerCase().includes(q)) ||
      (d.notes && d.notes.toLowerCase().includes(q))
    );
  }, [debts, detailSearchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-5xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden my-auto">
        
        {/* MODAL HEADER */}
        <div className="p-5 sm:p-6 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-blue-500/10 border border-blue-500/30 rounded-2xl flex items-center justify-center text-blue-400 shadow-md">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <span>Финансовый Отчёт и Аналитика</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-mono border border-blue-500/30">
                  PRO
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Сводная бизнес-аналитика закупок, маржинальности, прибыли и склада
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Batch Filter Selector */}
            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedBatchFilter}
                onChange={(e) => setSelectedBatchFilter(e.target.value)}
                className="bg-transparent text-xs font-semibold text-white outline-none cursor-pointer"
              >
                <option value="all" className="bg-slate-900 text-white">Все партии ({batches.length})</option>
                {batches.map(b => (
                  <option key={b.id} value={b.id} className="bg-slate-900 text-white">
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {onOpenSalesAnalytics && (
              <button
                onClick={() => {
                  onClose();
                  onOpenSalesAnalytics();
                }}
                className="px-3 py-1.5 bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow"
                title="Открыть детализированный отчет по фактически проданным чекам"
              >
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span className="hidden sm:inline">Аналитика Продаж</span>
              </button>
            )}

            <button
              onClick={() => setShowPrintReport(!showPrintReport)}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all"
            >
              <Printer className="w-4 h-4 text-purple-400" />
              <span className="hidden sm:inline">{showPrintReport ? 'Дашборд' : 'Форма отчёта'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-xl transition-all"
              title="Закрыть"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MODAL BODY */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          
          {showPrintReport ? (
            /* PRINTABLE / DETAILED REPORT TABLE FORM */
            <div className="space-y-6 bg-slate-950 p-6 rounded-2xl border border-slate-800">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-white uppercase tracking-wider">Сводный Аналитический Отчёт</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Сгенерировано: {new Date().toLocaleDateString('ru-RU')} • Партии: {selectedBatchFilter === 'all' ? 'Все' : batches.find(b => b.id === selectedBatchFilter)?.name}
                  </p>
                </div>
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow"
                >
                  <Printer className="w-4 h-4" />
                  <span>Печать отчета</span>
                </button>
              </div>

              {/* Summary table */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800/80 font-mono">
                <div>
                  <span className="text-[10px] text-slate-500 block">ОБЩАЯ ЗАКУПКА</span>
                  <span className="text-sm font-bold text-white">{analytics.totalLandedCostKGS.toLocaleString('ru-RU')} сом</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">ОЖИДАЕМАЯ ВЫРУЧКА (РОЗН)</span>
                  <span className="text-sm font-bold text-purple-400">{analytics.totalRetailRevenueKGS.toLocaleString('ru-RU')} сом</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">ЧИСТАЯ ПРИБЫЛЬ (РОЗН)</span>
                  <span className="text-sm font-bold text-emerald-400">{analytics.totalRetailProfitKGS.toLocaleString('ru-RU')} сом</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">ОСТАТОК ТОВАРОВ</span>
                  <span className="text-sm font-bold text-amber-400">{analytics.totalStockUnits} шт</span>
                </div>
              </div>

              {/* Product Breakdown Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] text-slate-400 font-mono uppercase bg-slate-900/40">
                      <th className="py-2.5 px-3">Товар</th>
                      <th className="py-2.5 px-3">Партия</th>
                      <th className="py-2.5 px-3">Кол-во</th>
                      <th className="py-2.5 px-3">Себестоимость</th>
                      <th className="py-2.5 px-3">Розница цена</th>
                      <th className="py-2.5 px-3">Ожид. Прибыль</th>
                      <th className="py-2.5 px-3">Маржа</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-xs text-slate-300">
                    {analytics.allCalculatedProducts.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-900/50 transition-colors">
                        <td className="py-3 px-3 font-bold text-white flex items-center gap-2">
                          {p.imageUrl ? (
                            <img src={p.imageUrl} alt="" className="w-8 h-8 rounded-lg object-cover border border-slate-700" />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500 text-[10px]">
                              Н/Д
                            </div>
                          )}
                          <span>{p.name}</span>
                        </td>
                        <td className="py-3 px-3 text-slate-400">{p.batchName}</td>
                        <td className="py-3 px-3 text-amber-400 font-bold">{p.quantity} шт</td>
                        <td className="py-3 px-3 text-blue-400">{p.landedUnitCostKGS.toFixed(1)} сом</td>
                        <td className="py-3 px-3 text-purple-400">{p.retailPriceUSD} сом</td>
                        <td className="py-3 px-3 text-emerald-400 font-bold">
                          +{p.totalRetailProfitKGS.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} сом
                        </td>
                        <td className="py-3 px-3 text-emerald-300 font-bold">
                          {p.profitMarginPercent}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* DASHBOARD VIEW */
            <>
              {/* TOP 4 MAIN KPI CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* KPI 1: Invested Capital */}
                <div 
                  onClick={() => { setActiveDetail('cogs'); setDetailSearchQuery(''); }}
                  className="p-4 bg-slate-950/80 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-900/90 rounded-2xl relative overflow-hidden group cursor-pointer transition-all shadow-md"
                >
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider group-hover:text-blue-400 transition-colors">Инвестиции (COGS)</span>
                    <DollarSign className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
                  </div>
                  <p className="text-xl font-bold font-mono text-white">
                    {analytics.totalLandedCostKGS.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} <span className="text-xs text-slate-400">сом</span>
                  </p>
                  <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between font-mono">
                    <span>Китай: {analytics.totalPurchaseCostKGS.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} с</span>
                    <span>Доставка: {analytics.totalDeliveryCostKGS.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} с</span>
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-blue-400 font-bold">
                    <span>Список товаров ({analytics.allCalculatedProducts.length})</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                {/* KPI 2: Expected Retail Profit */}
                <div 
                  onClick={() => { setActiveDetail('retail'); setDetailSearchQuery(''); }}
                  className="p-4 bg-slate-950/80 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900/90 rounded-2xl relative overflow-hidden group cursor-pointer transition-all shadow-md"
                >
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider group-hover:text-emerald-400 transition-colors">Розничная прибыль</span>
                    <TrendingUp className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                  </div>
                  <p className="text-xl font-bold font-mono text-emerald-400">
                    +{analytics.totalRetailProfitKGS.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} <span className="text-xs text-emerald-500">сом</span>
                  </p>
                  <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between font-mono">
                    <span>Выручка: {analytics.totalRetailRevenueKGS.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} с</span>
                    <span className="text-emerald-400 font-bold">ROI: {analytics.retailROI.toFixed(1)}%</span>
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-emerald-400 font-bold">
                    <span>Список по рознице</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                {/* KPI 3: Wholesale Profit */}
                <div 
                  onClick={() => { setActiveDetail('wholesale'); setDetailSearchQuery(''); }}
                  className="p-4 bg-slate-950/80 border border-slate-800 hover:border-purple-500/50 hover:bg-slate-900/90 rounded-2xl relative overflow-hidden group cursor-pointer transition-all shadow-md"
                >
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider group-hover:text-purple-400 transition-colors">Оптовая прибыль</span>
                    <Coins className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
                  </div>
                  <p className="text-xl font-bold font-mono text-purple-400">
                    +{analytics.totalWholesaleProfitKGS.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} <span className="text-xs text-purple-500">сом</span>
                  </p>
                  <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between font-mono">
                    <span>Выручка: {analytics.totalWholesaleRevenueKGS.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} с</span>
                    <span className="text-purple-400 font-bold">ROI: {analytics.wholesaleROI.toFixed(1)}%</span>
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-purple-400 font-bold">
                    <span>Список по опту</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                {/* KPI 4: Active Debts Receivable */}
                <div 
                  onClick={() => { setActiveDetail('debts'); setDetailSearchQuery(''); }}
                  className="p-4 bg-slate-950/80 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-900/90 rounded-2xl relative overflow-hidden group cursor-pointer transition-all shadow-md"
                >
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider group-hover:text-amber-400 transition-colors">Дебиторка (Долги)</span>
                    <Wallet className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                  </div>
                  <p className="text-xl font-bold font-mono text-amber-400">
                    {analytics.totalDebtKGS.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} <span className="text-xs text-amber-500">сом</span>
                  </p>
                  <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between font-mono">
                    <span>Выплачено: {analytics.paidDebtKGS.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} с</span>
                    <span className="text-slate-300">Записей: {debts.length}</span>
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-amber-400 font-bold">
                    <span>Список должников ({debts.length})</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

              </div>

              {/* SECTION: EXPENSE STRUCTURE BAR & INVENTORY METRICS */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Cost Distribution Breakdown */}
                <div 
                  onClick={() => { setActiveDetail('expenses'); setDetailSearchQuery(''); }}
                  className="p-5 bg-slate-950/60 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-900/90 rounded-2xl space-y-4 cursor-pointer transition-all group shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2 group-hover:text-blue-400 transition-colors">
                      <PieChart className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
                      <span>Структура себестоимости (Китай vs Доставка)</span>
                    </h3>
                    <span className="text-[10px] text-blue-400 font-bold flex items-center gap-1">
                      <span>Список</span>
                      <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </div>

                  {analytics.totalLandedCostKGS > 0 ? (
                    <div className="space-y-3">
                      {/* Visual Bar */}
                      <div className="w-full h-4 bg-slate-800 rounded-full overflow-hidden flex">
                        <div 
                          style={{ 
                            width: `${Math.round((analytics.totalPurchaseCostKGS / analytics.totalLandedCostKGS) * 100)}%` 
                          }} 
                          className="bg-blue-500 h-full transition-all"
                          title="Закупка в Китае"
                        />
                        <div 
                          style={{ 
                            width: `${Math.round((analytics.totalDeliveryCostKGS / analytics.totalLandedCostKGS) * 100)}%` 
                          }} 
                          className="bg-purple-500 h-full transition-all"
                          title="Доставка и логистика"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                        <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center gap-3">
                          <span className="w-3 h-3 rounded-full bg-blue-500 flex-shrink-0"></span>
                          <div>
                            <span className="text-[10px] text-slate-400 block font-sans">Закупка товара</span>
                            <span className="font-bold text-white">
                              {analytics.totalPurchaseCostKGS.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} сом
                            </span>
                            <span className="text-[10px] text-blue-400 block">
                              ({Math.round((analytics.totalPurchaseCostKGS / analytics.totalLandedCostKGS) * 100)}%)
                            </span>
                          </div>
                        </div>

                        <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center gap-3">
                          <span className="w-3 h-3 rounded-full bg-purple-500 flex-shrink-0"></span>
                          <div>
                            <span className="text-[10px] text-slate-400 block font-sans">Доставка / Логистика</span>
                            <span className="font-bold text-white">
                              {analytics.totalDeliveryCostKGS.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} сом
                            </span>
                            <span className="text-[10px] text-purple-400 block">
                              ({Math.round((analytics.totalDeliveryCostKGS / analytics.totalLandedCostKGS) * 100)}%)
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-500 italic">Нет данных для расчета расходов</p>
                  )}
                </div>

                {/* Warehouse Inventory Stock Summary */}
                <div 
                  onClick={() => { setActiveDetail('inventory'); setDetailSearchQuery(''); }}
                  className="p-5 bg-slate-950/60 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900/90 rounded-2xl space-y-4 cursor-pointer transition-all group shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2 group-hover:text-emerald-400 transition-colors">
                      <Package className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                      <span>Складские показатели и Объём</span>
                    </h3>
                    <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                      <span>Список</span>
                      <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-center font-mono">
                    <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase block font-sans">Всего видов</span>
                      <span className="text-lg font-bold text-white">{analytics.totalProductsCount}</span>
                    </div>
                    <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase block font-sans">Общий остаток</span>
                      <span className="text-lg font-bold text-amber-400">{analytics.totalStockUnits} шт</span>
                    </div>
                    <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase block font-sans">Общий вес</span>
                      <span className="text-lg font-bold text-blue-400">{analytics.totalWeightKg.toFixed(1)} кг</span>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                    <span>Средняя себестоимость единицы:</span>
                    <strong className="text-white font-mono">
                      {analytics.totalStockUnits > 0 
                        ? (analytics.totalLandedCostKGS / analytics.totalStockUnits).toFixed(1)
                        : 0} сом / шт
                    </strong>
                  </div>
                </div>

              </div>

              {/* TOP MOST PROFITABLE PRODUCTS */}
              <div 
                onClick={() => { setActiveDetail('top'); setDetailSearchQuery(''); }}
                className="p-5 bg-slate-950/60 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-900/90 rounded-2xl space-y-4 cursor-pointer transition-all group shadow-md"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2 group-hover:text-amber-400 transition-colors">
                    <Award className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                    <span>Топ-5 самых прибыльных товаров (По рознице)</span>
                  </h3>
                  <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1">
                    <span>Полный рейтинг →</span>
                  </span>
                </div>

                <div className="space-y-2">
                  {analytics.sortedByProfit.length > 0 ? (
                    analytics.sortedByProfit.slice(0, 5).map((prod, index) => (
                      <div 
                        key={prod.id} 
                        className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl flex items-center justify-between gap-3 font-mono hover:border-slate-700 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                            index === 0 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                            index === 1 ? 'bg-slate-300/20 text-slate-200 border border-slate-400/40' :
                            index === 2 ? 'bg-amber-700/20 text-amber-500 border border-amber-700/40' :
                            'bg-slate-800 text-slate-400'
                          }`}>
                            {index + 1}
                          </span>

                          {prod.imageUrl ? (
                            <img src={prod.imageUrl} alt={prod.name} className="w-10 h-10 rounded-lg object-cover border border-slate-700 flex-shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500 flex-shrink-0">
                              <Package className="w-5 h-5" />
                            </div>
                          )}

                          <div>
                            <span className="font-sans font-bold text-white block text-xs">{prod.name}</span>
                            <span className="text-[10px] text-slate-400 font-sans">
                              {prod.batchName} • Остаток: {prod.quantity} шт
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-emerald-400 font-bold block text-sm">
                            +{prod.totalRetailProfitKGS.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} сом
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Маржа: <strong className="text-emerald-300">{prod.profitMarginPercent}%</strong>
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-500 italic p-3">Товаров не найдено</p>
                  )}
                </div>
              </div>

            </>
          )}

        </div>

      </div>

      {/* ITEMIZED DETAIL OVERLAY MODAL */}
      {activeDetail && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden my-auto">
            
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/30 rounded-xl flex items-center justify-center text-blue-400">
                  {activeDetail === 'cogs' && <DollarSign className="w-5 h-5 text-blue-400" />}
                  {activeDetail === 'retail' && <TrendingUp className="w-5 h-5 text-emerald-400" />}
                  {activeDetail === 'wholesale' && <Coins className="w-5 h-5 text-purple-400" />}
                  {activeDetail === 'debts' && <Wallet className="w-5 h-5 text-amber-400" />}
                  {activeDetail === 'expenses' && <PieChart className="w-5 h-5 text-blue-400" />}
                  {activeDetail === 'inventory' && <Package className="w-5 h-5 text-emerald-400" />}
                  {activeDetail === 'top' && <Award className="w-5 h-5 text-amber-400" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {activeDetail === 'cogs' && 'Детализация Инвестиций (Закупка + Доставка)'}
                    {activeDetail === 'retail' && 'Детализация Розничной Прибыли'}
                    {activeDetail === 'wholesale' && 'Детализация Оптовой Прибыли'}
                    {activeDetail === 'debts' && 'Детализация Дебиторской Задолженности (Долги)'}
                    {activeDetail === 'expenses' && 'Структура Расходов (Китай vs Доставка)'}
                    {activeDetail === 'inventory' && 'Складские Остатки и Оценка Товарного Запасa'}
                    {activeDetail === 'top' && 'Полный Рейтинг Прибыльности Товаров'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Поэлементный список и расчеты по выбранному разделу
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveDetail(null)}
                className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search filter bar */}
            <div className="p-3 bg-slate-950/40 border-b border-slate-800/80 px-5">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Поиск по названию или партии..."
                  value={detailSearchQuery}
                  onChange={(e) => setDetailSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            {/* List Body */}
            <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-2">
              {/* COGS DETAIL */}
              {activeDetail === 'cogs' && (
                filteredProductsList.map((p) => (
                  <div key={p.id} className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover border border-slate-700" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500">
                          <Package className="w-5 h-5" />
                        </div>
                      )}
                      <div>
                        <span className="font-bold text-white block text-xs">{p.name}</span>
                        <span className="text-[10px] text-slate-400">Партия: {p.batchName} • В наличии: <strong className="text-amber-400">{p.quantity} шт</strong></span>
                      </div>
                    </div>
                    <div className="text-right font-mono text-xs space-y-0.5">
                      <div className="text-white font-bold">Себестоимость unit: {p.landedUnitCostKGS.toFixed(1)} сом</div>
                      <div className="text-[10px] text-slate-400">Закупка: {(p.priceCNY || 0) * (p.quantity || 0)} ¥ | Доставка: {(p.landedUnitCostKGS - ((p.priceCNY || 0) * 12.2)).toFixed(0)} с/шт</div>
                      <div className="text-blue-400 text-[11px] font-bold">Итого инвест: {(p.landedUnitCostKGS * p.quantity).toLocaleString('ru-RU', { maximumFractionDigits: 0 })} сом</div>
                    </div>
                  </div>
                ))
              )}

              {/* RETAIL DETAIL */}
              {activeDetail === 'retail' && (
                filteredProductsList.map((p) => (
                  <div key={p.id} className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover border border-slate-700" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500">
                          <Package className="w-5 h-5" />
                        </div>
                      )}
                      <div>
                        <span className="font-bold text-white block text-xs">{p.name}</span>
                        <span className="text-[10px] text-slate-400">Партия: {p.batchName} • Остаток: {p.quantity} шт</span>
                      </div>
                    </div>
                    <div className="text-right font-mono text-xs">
                      <div className="text-purple-400 font-bold">Розн. цена: {p.retailPriceUSD} сом</div>
                      <div className="text-emerald-400 font-bold">Прибыль: +{p.totalRetailProfitKGS.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} сом</div>
                      <div className="text-[10px] text-emerald-300 font-bold">Маржа: {p.profitMarginPercent}%</div>
                    </div>
                  </div>
                ))
              )}

              {/* WHOLESALE DETAIL */}
              {activeDetail === 'wholesale' && (
                filteredProductsList.map((p) => (
                  <div key={p.id} className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover border border-slate-700" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500">
                          <Package className="w-5 h-5" />
                        </div>
                      )}
                      <div>
                        <span className="font-bold text-white block text-xs">{p.name}</span>
                        <span className="text-[10px] text-slate-400">Партия: {p.batchName} • Остаток: {p.quantity} шт</span>
                      </div>
                    </div>
                    <div className="text-right font-mono text-xs">
                      <div className="text-blue-400 font-bold">Опт. цена: {p.wholesalePriceUSD} сом</div>
                      <div className="text-purple-400 font-bold">Прибыль: +{p.totalWholesaleProfitKGS.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} сом</div>
                    </div>
                  </div>
                ))
              )}

              {/* DEBTS DETAIL */}
              {activeDetail === 'debts' && (
                filteredDebtsList.length > 0 ? (
                  filteredDebtsList.map((d) => {
                    const remaining = d.totalAmount - d.paidAmount;
                    const isPaid = remaining <= 0;
                    return (
                      <div key={d.id} className="p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-xl flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-3">
                          {d.debtorPhotoUrl ? (
                            <img src={d.debtorPhotoUrl} alt="" className="w-9 h-9 rounded-full object-cover border border-slate-700" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 font-bold text-xs">
                              {d.debtorName ? d.debtorName.substring(0, 2).toUpperCase() : '??'}
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white text-xs">{d.debtorName}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isPaid ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              }`}>
                                {isPaid ? 'Погашен' : 'Активен'}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {d.productName ? `Товар: ${d.productName}` : 'Без товара'} {d.phone ? `• Тел: ${d.phone}` : ''}
                            </p>
                          </div>
                        </div>
                        <div className="text-right font-mono text-xs">
                          <div className="text-amber-400 font-bold">Остаток долга: {remaining.toLocaleString('ru-RU')} {d.currency}</div>
                          <div className="text-[10px] text-slate-400">Всего: {d.totalAmount} {d.currency} | Выплачено: {d.paidAmount} {d.currency}</div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-slate-500 italic p-4 text-center">Записи задолженностей не найдены</p>
                )
              )}

              {/* EXPENSES DETAIL */}
              {activeDetail === 'expenses' && (
                filteredProductsList.map((p) => {
                  const cnyTotal = (p.priceCNY || 0) * (p.quantity || 0) * 12.2;
                  const totalLanded = p.landedUnitCostKGS * (p.quantity || 0);
                  const deliveryTotal = totalLanded - cnyTotal;
                  return (
                    <div key={p.id} className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-3">
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover border border-slate-700" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500">
                            <Package className="w-5 h-5" />
                          </div>
                        )}
                        <div>
                          <span className="font-bold text-white block text-xs">{p.name}</span>
                          <span className="text-[10px] text-slate-400">Партия: {p.batchName} • Кол-во: {p.quantity} шт • Вес: {p.weight} кг/шт</span>
                        </div>
                      </div>
                      <div className="text-right font-mono text-xs">
                        <div className="text-blue-400">Закупка Китай: {cnyTotal.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} сом</div>
                        <div className="text-purple-400">Доставка: {deliveryTotal.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} сом</div>
                        <div className="text-white font-bold">Итого затрат: {totalLanded.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} сом</div>
                      </div>
                    </div>
                  );
                })
              )}

              {/* INVENTORY DETAIL */}
              {activeDetail === 'inventory' && (
                filteredProductsList.map((p) => {
                  const totalVal = p.landedUnitCostKGS * (p.quantity || 0);
                  const totalW = (p.weight || 0) * (p.quantity || 0);
                  return (
                    <div key={p.id} className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-3">
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover border border-slate-700" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500">
                            <Package className="w-5 h-5" />
                          </div>
                        )}
                        <div>
                          <span className="font-bold text-white block text-xs">{p.name}</span>
                          <span className="text-[10px] text-slate-400">Партия: {p.batchName}</span>
                        </div>
                      </div>
                      <div className="text-right font-mono text-xs">
                        <div className="text-amber-400 font-bold">Остаток: {p.quantity} шт</div>
                        <div className="text-blue-400">Общий вес: {totalW.toFixed(1)} кг ({p.weight} кг/шт)</div>
                        <div className="text-emerald-400 font-bold">Стоимость на складе: {totalVal.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} сом</div>
                      </div>
                    </div>
                  );
                })
              )}

              {/* TOP PROFIT DETAIL */}
              {activeDetail === 'top' && (
                analytics.sortedByProfit.map((p, idx) => (
                  <div key={p.id} className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold text-xs flex items-center justify-center border border-amber-500/30">
                        #{idx + 1}
                      </span>
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover border border-slate-700" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500">
                          <Package className="w-5 h-5" />
                        </div>
                      )}
                      <div>
                        <span className="font-bold text-white block text-xs">{p.name}</span>
                        <span className="text-[10px] text-slate-400">Партия: {p.batchName} • Остаток: {p.quantity} шт</span>
                      </div>
                    </div>
                    <div className="text-right font-mono text-xs">
                      <div className="text-emerald-400 font-bold text-sm">Прибыль: +{p.totalRetailProfitKGS.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} сом</div>
                      <div className="text-[10px] text-emerald-300">Маржа: {p.profitMarginPercent}%</div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
              <span>Записей в списке: {activeDetail === 'debts' ? filteredDebtsList.length : filteredProductsList.length}</span>
              <button
                onClick={() => setActiveDetail(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition-all"
              >
                Закрыть список
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
