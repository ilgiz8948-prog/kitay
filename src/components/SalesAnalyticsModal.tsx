import React, { useState, useMemo } from 'react';
import { 
  X, 
  TrendingUp, 
  DollarSign, 
  ShoppingBag, 
  Calendar, 
  ArrowUpRight, 
  Receipt, 
  Search, 
  FileSpreadsheet, 
  Printer, 
  Filter, 
  Wallet, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  BarChart2, 
  ChevronRight, 
  Tag, 
  Coins,
  Clock,
  User,
  Package,
  History,
  PieChart,
  ArrowDownRight
} from 'lucide-react';
import { SaleRecord, DebtRecord, ShipmentBatch } from '../types';

interface SalesAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sales: SaleRecord[];
  debts?: DebtRecord[];
  currencySymbol: string;
  targetCurrency: 'USD' | 'KGS';
  onDeleteSale?: (saleId: string) => void;
  onOpenReceipt?: (sale: SaleRecord) => void;
}

type PeriodFilter = 'today' | 'yesterday' | '7days' | '30days' | 'all' | 'custom';
type AnalyticsTab = 'sales' | 'debts';

// Safe date helpers to prevent RangeError / invalid date crashes
const safeGetDateStr = (dateVal: any): string => {
  if (!dateVal) return new Date().toISOString().split('T')[0];
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return new Date().toISOString().split('T')[0];
    return d.toISOString().split('T')[0];
  } catch {
    return new Date().toISOString().split('T')[0];
  }
};

const safeFormatLabel = (dateStr: string): string => {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
      }
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    }
    return dateStr;
  } catch {
    return dateStr;
  }
};

const safeFormatTime = (timestampVal: any): string => {
  if (!timestampVal) return '';
  try {
    const d = new Date(timestampVal);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};

export default function SalesAnalyticsModal({
  isOpen,
  onClose,
  sales = [],
  debts = [],
  currencySymbol = 'сом',
  targetCurrency = 'KGS',
  onDeleteSale,
  onOpenReceipt
}: SalesAnalyticsModalProps) {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('sales');
  const [period, setPeriod] = useState<PeriodFilter>('7days');
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    try {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      return d.toISOString().split('T')[0];
    } catch {
      return '';
    }
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    try {
      return new Date().toISOString().split('T')[0];
    } catch {
      return '';
    }
  });

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'cash' | 'debt'>('all');
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);

  const debtsList = useMemo(() => Array.isArray(debts) ? debts : [], [debts]);

  // Dynamic helper to resolve live debt status of a sale against debts array
  const getSaleDebtInfo = (sale: SaleRecord) => {
    if (!sale) return { isActiveDebt: false, isPaidOff: false, debtorName: undefined };

    // Try finding matching debt record
    const matchingDebt = debtsList.find(d => 
      (sale.debtId && d.id === sale.debtId) ||
      (d.saleId && d.saleId === sale.id) ||
      (d.debtorName && sale.debtorName && d.debtorName.trim().toLowerCase() === sale.debtorName.trim().toLowerCase() && Math.abs(d.totalAmount - sale.totalRevenue) < 1)
    );

    if (matchingDebt) {
      const isPaidOff = matchingDebt.status === 'paid' || matchingDebt.paidAmount >= matchingDebt.totalAmount;
      return {
        isActiveDebt: !isPaidOff,
        isPaidOff,
        debtorName: matchingDebt.debtorName || sale.debtorName,
        paidAmount: matchingDebt.paidAmount,
        totalAmount: matchingDebt.totalAmount
      };
    }

    if (sale.debtStatus === 'paid' || (!sale.isDebt && sale.debtorName)) {
      return {
        isActiveDebt: false,
        isPaidOff: true,
        debtorName: sale.debtorName
      };
    }

    return {
      isActiveDebt: Boolean(sale.isDebt),
      isPaidOff: !sale.isDebt,
      debtorName: sale.debtorName
    };
  };

  // Extract all individual debt repayment events across all debts
  const allDebtRepayments = useMemo(() => {
    const list: Array<{
      id: string;
      debtId: string;
      debtorName: string;
      amount: number;
      date: string;
      dateStr: string;
      note?: string;
      currency: string;
      productName?: string;
      debtStatus: 'active' | 'partial' | 'paid';
      totalAmount: number;
      paidAmount: number;
    }> = [];

    debtsList.forEach(debt => {
      if (!debt || !debt.payments) return;
      debt.payments.forEach(p => {
        const pDateStr = safeGetDateStr(p.date);
        list.push({
          id: p.id || `${debt.id}_${p.date}`,
          debtId: debt.id,
          debtorName: debt.debtorName || 'Покупатель',
          amount: p.amount || 0,
          date: p.date,
          dateStr: pDateStr,
          note: p.note,
          currency: debt.currency || 'KGS',
          productName: debt.productName,
          debtStatus: debt.status,
          totalAmount: debt.totalAmount,
          paidAmount: debt.paidAmount
        });
      });
    });

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [debtsList]);

  // Helper date utility strings
  const getTodayStr = () => safeGetDateStr(new Date());
  const getYesterdayStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return safeGetDateStr(d);
  };

  // Filter debt repayments by period and search term
  const filteredRepaymentsByPeriod = useMemo(() => {
    const todayStr = getTodayStr();
    const yesterdayStr = getYesterdayStr();
    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 29);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    return allDebtRepayments.filter(r => {
      const pDateStr = r.dateStr;
      let pDateObj: Date;
      try {
        pDateObj = new Date(r.date);
        if (isNaN(pDateObj.getTime())) pDateObj = new Date(pDateStr);
      } catch {
        pDateObj = new Date();
      }

      if (period === 'today') {
        if (pDateStr !== todayStr) return false;
      } else if (period === 'yesterday') {
        if (pDateStr !== yesterdayStr) return false;
      } else if (period === '7days') {
        if (pDateObj < sevenDaysAgo) return false;
      } else if (period === '30days') {
        if (pDateObj < thirtyDaysAgo) return false;
      } else if (period === 'custom') {
        if (customStartDate && pDateStr < customStartDate) return false;
        if (customEndDate && pDateStr > customEndDate) return false;
      }

      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesDebtor = r.debtorName?.toLowerCase().includes(query);
        const matchesNote = r.note?.toLowerCase().includes(query);
        const matchesProduct = r.productName?.toLowerCase().includes(query);
        if (!matchesDebtor && !matchesNote && !matchesProduct) return false;
      }

      return true;
    });
  }, [allDebtRepayments, period, customStartDate, customEndDate, searchTerm]);

  // Aggregated Debt Metrics
  const debtStats = useMemo(() => {
    let totalCollectedInPeriod = 0;
    filteredRepaymentsByPeriod.forEach(r => {
      totalCollectedInPeriod += r.amount || 0;
    });

    let totalActiveDebtBalance = 0;
    let totalDebtsCount = debtsList.length;
    let activeDebtsCount = 0;
    let paidDebtsCount = 0;
    let overallDebtIssued = 0;
    let overallDebtPaid = 0;

    debtsList.forEach(d => {
      overallDebtIssued += d.totalAmount || 0;
      overallDebtPaid += d.paidAmount || 0;
      const remaining = Math.max(0, (d.totalAmount || 0) - (d.paidAmount || 0));
      if (d.status === 'paid' || remaining <= 0) {
        paidDebtsCount++;
      } else {
        activeDebtsCount++;
        totalActiveDebtBalance += remaining;
      }
    });

    const repaymentPercentage = overallDebtIssued > 0 
      ? Math.round((overallDebtPaid / overallDebtIssued) * 100) 
      : 0;

    return {
      totalCollectedInPeriod,
      totalActiveDebtBalance,
      totalDebtsCount,
      activeDebtsCount,
      paidDebtsCount,
      overallDebtIssued,
      overallDebtPaid,
      repaymentPercentage
    };
  }, [filteredRepaymentsByPeriod, debtsList]);

  // Filter sales based on period and search/payment criteria
  const filteredSalesByPeriod = useMemo(() => {
    const todayStr = getTodayStr();
    const yesterdayStr = getYesterdayStr();

    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 29);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const salesList = Array.isArray(sales) ? sales : [];

    return salesList.filter(s => {
      if (!s) return false;
      // Date filter
      const saleDateStr = s.dateStr || (s.timestamp ? safeGetDateStr(s.timestamp) : '');
      let saleDateObj: Date;
      try {
        saleDateObj = s.timestamp ? new Date(s.timestamp) : new Date(saleDateStr);
        if (isNaN(saleDateObj.getTime())) saleDateObj = new Date();
      } catch {
        saleDateObj = new Date();
      }

      if (period === 'today') {
        if (saleDateStr !== todayStr) return false;
      } else if (period === 'yesterday') {
        if (saleDateStr !== yesterdayStr) return false;
      } else if (period === '7days') {
        if (saleDateObj < sevenDaysAgo) return false;
      } else if (period === '30days') {
        if (saleDateObj < thirtyDaysAgo) return false;
      } else if (period === 'custom') {
        if (customStartDate && saleDateStr < customStartDate) return false;
        if (customEndDate && saleDateStr > customEndDate) return false;
      }

      // Payment filter using dynamic debt status
      const debtInfo = getSaleDebtInfo(s);
      if (paymentFilter === 'cash' && debtInfo.isActiveDebt) return false;
      if (paymentFilter === 'debt' && !debtInfo.isActiveDebt) return false;

      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesBatch = s.batchName?.toLowerCase().includes(query);
        const matchesDebtor = s.debtorName?.toLowerCase().includes(query);
        const matchesItems = s.items?.some(i => i.productName.toLowerCase().includes(query));
        if (!matchesBatch && !matchesDebtor && !matchesItems) return false;
      }

      return true;
    });
  }, [sales, debtsList, period, customStartDate, customEndDate, paymentFilter, searchTerm]);

  // Aggregate stats calculation
  const stats = useMemo(() => {
    let totalRevenue = 0;
    let totalCogs = 0;
    let netProfit = 0;
    let totalItemsCount = 0;
    let cashRevenue = 0;
    let debtRevenue = 0;

    filteredSalesByPeriod.forEach(s => {
      const debtInfo = getSaleDebtInfo(s);
      totalRevenue += s.totalRevenue || 0;
      totalCogs += s.totalCogs || 0;
      netProfit += s.netProfit || 0;

      if (debtInfo.isActiveDebt) {
        debtRevenue += s.totalRevenue || 0;
      } else {
        cashRevenue += s.totalRevenue || 0;
      }

      s.items?.forEach(i => {
        totalItemsCount += i.quantity || 0;
      });
    });

    const profitMarginPercent = totalRevenue > 0 
      ? Math.round((netProfit / totalRevenue) * 100) 
      : 0;

    return {
      totalRevenue,
      totalCogs,
      netProfit,
      totalItemsCount,
      totalTransactions: filteredSalesByPeriod.length,
      cashRevenue,
      debtRevenue,
      profitMarginPercent
    };
  }, [filteredSalesByPeriod, debtsList]);

  // Generate Daily Chart Data according to selected period
  const dailyChartData = useMemo(() => {
    const daysMap: Record<string, { dateStr: string; label: string; revenue: number; cogs: number; profit: number; count: number }> = {};
    const datesSet = new Set<string>();

    const endDate = new Date();
    let startDate = new Date();

    if (period === 'today') {
      startDate = new Date();
    } else if (period === 'yesterday') {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 1);
    } else if (period === '7days') {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 6);
    } else if (period === '30days') {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 29);
    } else if (period === 'custom') {
      startDate = customStartDate ? new Date(customStartDate) : new Date();
      if (isNaN(startDate.getTime())) startDate = new Date();
    } else {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 14);
    }

    const curr = new Date(startDate);
    const end = period === 'yesterday' ? new Date(startDate) : endDate;
    
    let count = 0;
    while (curr <= end && count < 60) {
      const dStr = safeGetDateStr(curr);
      const label = safeFormatLabel(dStr);
      daysMap[dStr] = { dateStr: dStr, label, revenue: 0, cogs: 0, profit: 0, count: 0 };
      datesSet.add(dStr);
      curr.setDate(curr.getDate() + 1);
      count++;
    }

    filteredSalesByPeriod.forEach(s => {
      const dStr = s.dateStr || safeGetDateStr(s.timestamp);
      if (!dStr) return;
      if (daysMap[dStr]) {
        daysMap[dStr].revenue += s.totalRevenue || 0;
        daysMap[dStr].cogs += s.totalCogs || 0;
        daysMap[dStr].profit += s.netProfit || 0;
        daysMap[dStr].count += 1;
      } else {
        const label = safeFormatLabel(dStr);
        daysMap[dStr] = {
          dateStr: dStr,
          label,
          revenue: s.totalRevenue || 0,
          cogs: s.totalCogs || 0,
          profit: s.netProfit || 0,
          count: 1
        };
        datesSet.add(dStr);
      }
    });

    const sortedDates = Array.from(datesSet).sort();
    const result = sortedDates.map(dStr => daysMap[dStr]).filter(Boolean);

    let maxVal = 0;
    result.forEach(d => {
      if (d.revenue > maxVal) maxVal = d.revenue;
      if (d.cogs > maxVal) maxVal = d.cogs;
    });

    return {
      items: result,
      maxVal: maxVal > 0 ? maxVal : 1000
    };
  }, [filteredSalesByPeriod, period, customStartDate]);

  // Export report to CSV
  const handleExportCSV = () => {
    if (filteredSalesByPeriod.length === 0) {
      alert('Нет данных для экспорта');
      return;
    }

    const headers = ['ID', 'Дата', 'Время', 'Партия', 'Тип оплаты', 'Покупатель', 'Позиций', 'Общая Выручка', 'Себестоимость', 'Чистая прибыль', 'Валюта'];
    const rows = filteredSalesByPeriod.map(s => [
      s.id,
      s.dateStr,
      s.timestamp ? new Date(s.timestamp).toLocaleTimeString('ru-RU') : '',
      s.batchName || '',
      s.isDebt ? 'В долг' : 'Наличные',
      s.debtorName || '-',
      s.items?.length || 1,
      s.totalRevenue,
      s.totalCogs,
      s.netProfit,
      s.currency
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' 
      + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Sales_Analytics_${period}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl w-full max-w-6xl max-h-[96vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* HEADER */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2 flex-wrap">
                <span>Аналитика продаж</span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-mono font-bold border border-emerald-500/30">
                  {stats.totalTransactions} {stats.totalTransactions === 1 ? 'продажа' : 'продаж'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold border border-blue-500/30">
                  {currencySymbol} ({targetCurrency})
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5 hidden sm:block">
                Сводный фин. отчет по выручке, себестоимости и чистой прибыли с интерактивным графиком
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-all"
              title="Экспортировать в CSV/Excel"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span className="hidden sm:inline">Экспорт CSV</span>
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

        {/* MAIN TABS: SALES VS DEBT ANALYTICS */}
        <div className="bg-slate-950 p-2.5 px-4 border-b border-slate-800 flex items-center justify-start gap-2 flex-shrink-0">
          <button
            onClick={() => setActiveTab('sales')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
              activeTab === 'sales'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/50'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Аналитика продаж</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-800/80 text-emerald-300 text-[11px] font-mono">
              {stats.totalTransactions}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('debts')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
              activeTab === 'debts'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-950/50'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Coins className="w-4 h-4 text-amber-300" />
            <span>Аналитика долгов и погашений</span>
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-mono border border-amber-500/30">
              {filteredRepaymentsByPeriod.length} платежей
            </span>
          </button>
        </div>

        {/* PERIOD SELECTOR TABS */}
        <div className="bg-slate-950/60 p-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-400 text-xs font-bold mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span>Период:</span>
            </span>

            <button
              onClick={() => setPeriod('today')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                period === 'today'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              Сегодня
            </button>

            <button
              onClick={() => setPeriod('yesterday')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                period === 'yesterday'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              Вчера
            </button>

            <button
              onClick={() => setPeriod('7days')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                period === '7days'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              7 дней
            </button>

            <button
              onClick={() => setPeriod('30days')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                period === '30days'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              30 дней
            </button>

            <button
              onClick={() => setPeriod('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                period === 'all'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              Все время
            </button>

            <button
              onClick={() => setPeriod('custom')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                period === 'custom'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-950'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              По выбору даты
            </button>
          </div>

          {/* Custom Date Pickers */}
          {period === 'custom' && (
            <div className="flex items-center gap-2 text-xs font-mono bg-slate-900 p-1.5 rounded-xl border border-slate-800">
              <span className="text-slate-400">С:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-slate-950 text-white border border-slate-800 rounded-lg px-2 py-0.5 outline-none focus:border-purple-500"
              />
              <span className="text-slate-400">По:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-slate-950 text-white border border-slate-800 rounded-lg px-2 py-0.5 outline-none focus:border-purple-500"
              />
            </div>
          )}
        </div>

        {/* MODAL BODY (SCROLLABLE) */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          
          {activeTab === 'sales' ? (
            <>
              {/* KPI STAT CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
            
            {/* Card 1: Total Revenue */}
            <div className="p-4 bg-slate-950/80 border border-emerald-500/30 rounded-2xl space-y-1 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl group-hover:bg-emerald-500/10 transition-all pointer-events-none" />
              <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
                <span>1. ОБЩАЯ ВЫРУЧКА</span>
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-xl sm:text-2xl font-black font-mono text-emerald-400">
                {(stats.totalRevenue || 0).toLocaleString('ru-RU')} <span className="text-xs font-normal text-emerald-300">{currencySymbol}</span>
              </p>
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1 border-t border-slate-800/80">
                <span>Нал: <strong className="text-white">{(stats.cashRevenue || 0).toLocaleString('ru-RU')}</strong></span>
                <span>Долг: <strong className="text-amber-400">{(stats.debtRevenue || 0).toLocaleString('ru-RU')}</strong></span>
              </div>
            </div>

            {/* Card 2: COGS / Себестоимость */}
            <div className="p-4 bg-slate-950/80 border border-blue-500/30 rounded-2xl space-y-1 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl group-hover:bg-blue-500/10 transition-all pointer-events-none" />
              <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
                <span>2. СЕБЕСТОИМОСТЬ ТОВАРА</span>
                <Package className="w-4 h-4 text-blue-400" />
              </div>
              <p className="text-xl sm:text-2xl font-black font-mono text-blue-400">
                {(stats.totalCogs || 0).toLocaleString('ru-RU')} <span className="text-xs font-normal text-blue-300">{currencySymbol}</span>
              </p>
              <div className="text-[11px] text-slate-400 font-mono pt-1 border-t border-slate-800/80">
                <span>Себестоимость проданных товаров</span>
              </div>
            </div>

            {/* Card 3: Net Profit */}
            <div className="p-4 bg-slate-950/80 border border-purple-500/30 rounded-2xl space-y-1 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-xl group-hover:bg-purple-500/10 transition-all pointer-events-none" />
              <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
                <span>3. ЧИСТАЯ ПРИБЫЛЬ</span>
                <TrendingUp className="w-4 h-4 text-purple-400" />
              </div>
              <p className={`text-xl sm:text-2xl font-black font-mono ${(stats.netProfit || 0) >= 0 ? 'text-purple-400' : 'text-red-400'}`}>
                {(stats.netProfit || 0) >= 0 ? '+' : ''}{(stats.netProfit || 0).toLocaleString('ru-RU')} <span className="text-xs font-normal text-purple-300">{currencySymbol}</span>
              </p>
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1 border-t border-slate-800/80">
                <span>Рентабельность:</span>
                <strong className="text-purple-300 font-bold">{stats.profitMarginPercent || 0}%</strong>
              </div>
            </div>

            {/* Card 4: Volume / Units */}
            <div className="p-4 bg-slate-950/80 border border-amber-500/30 rounded-2xl space-y-1 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl group-hover:bg-amber-500/10 transition-all pointer-events-none" />
              <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
                <span>4. ПРОДАНО ТОВАРОВ</span>
                <ShoppingBag className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-xl sm:text-2xl font-black font-mono text-amber-400">
                {stats.totalItemsCount || 0} <span className="text-xs font-normal text-slate-400">шт</span>
              </p>
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1 border-t border-slate-800/80">
                <span>Транзакций:</span>
                <strong className="text-white">{stats.totalTransactions || 0} чеков</strong>
              </div>
            </div>

          </div>

          {/* VISUAL CHART SECTION ("ПО ГРАФИКУ") */}
          <div className="p-4 sm:p-5 bg-slate-950/80 border border-slate-800 rounded-3xl space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-sm">
                  График динамики продаж и прибыли
                </h3>
              </div>

              {/* Chart legend */}
              <div className="flex items-center gap-4 text-xs font-bold font-mono">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-emerald-500 inline-block" />
                  <span className="text-slate-300">Выручка</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-blue-500 inline-block" />
                  <span className="text-slate-300">Себестоимость</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-purple-500 inline-block" />
                  <span className="text-slate-300">Прибыль</span>
                </div>
              </div>
            </div>

            {/* BAR CHART CANVAS */}
            {dailyChartData.items.length === 0 ? (
              <div className="p-12 text-center text-slate-500 font-medium text-xs space-y-2">
                <BarChart2 className="w-8 h-8 text-slate-700 mx-auto" />
                <p>Нет продаж за выбранный период</p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Visual Bars Container */}
                <div className="h-56 sm:h-64 flex items-end gap-2 sm:gap-3 pt-6 pb-2 px-2 overflow-x-auto">
                  {dailyChartData.items.map((day) => {
                    const revHeightPercent = Math.min(100, Math.max(6, Math.round((day.revenue / dailyChartData.maxVal) * 100)));
                    const cogsHeightPercent = Math.min(100, Math.max(4, Math.round((day.cogs / dailyChartData.maxVal) * 100)));
                    const profitHeightPercent = Math.min(100, Math.max(2, Math.round((Math.max(0, day.profit) / dailyChartData.maxVal) * 100)));

                    return (
                      <div 
                        key={day.dateStr} 
                        className="flex-1 min-w-[38px] max-w-[70px] h-full flex flex-col justify-end items-center group relative cursor-pointer"
                      >
                        {/* Hover Tooltip Card */}
                        <div className="absolute -top-24 bg-slate-900 border border-slate-700 p-2 rounded-xl text-[10px] font-mono shadow-2xl z-20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none w-36 text-center space-y-0.5">
                          <p className="font-bold text-white border-b border-slate-800 pb-1">{day.label} ({day.dateStr})</p>
                          <p className="text-emerald-400 font-bold">Выручка: {(day.revenue || 0).toLocaleString('ru-RU')} {currencySymbol}</p>
                          <p className="text-blue-400">Себест: {(day.cogs || 0).toLocaleString('ru-RU')} {currencySymbol}</p>
                          <p className="text-purple-400 font-bold">Прибыль: +{(day.profit || 0).toLocaleString('ru-RU')} {currencySymbol}</p>
                        </div>

                        {/* Tri-Bar Column Group */}
                        <div className="w-full flex items-end justify-center gap-1 h-full pt-4">
                          {/* Revenue Bar */}
                          <div 
                            style={{ height: `${revHeightPercent}%` }} 
                            className="w-1.5 sm:w-2.5 bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-md group-hover:brightness-125 transition-all"
                            title={`Выручка: ${day.revenue}`}
                          />
                          {/* COGS Bar */}
                          <div 
                            style={{ height: `${cogsHeightPercent}%` }} 
                            className="w-1.5 sm:w-2.5 bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-md group-hover:brightness-125 transition-all"
                            title={`Себестоимость: ${day.cogs}`}
                          />
                          {/* Profit Bar */}
                          <div 
                            style={{ height: `${profitHeightPercent}%` }} 
                            className="w-1.5 sm:w-2.5 bg-gradient-to-t from-purple-600 to-purple-400 rounded-t-md group-hover:brightness-125 transition-all"
                            title={`Прибыль: ${day.profit}`}
                          />
                        </div>

                        {/* Date Label Below Bar */}
                        <span className="text-[10px] font-mono text-slate-400 mt-2 truncate w-full text-center">
                          {day.label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="text-[11px] text-slate-500 font-mono text-center pt-2 border-t border-slate-900">
                  Наведите на столбец для детального просмотра сумм за день
                </div>
              </div>
            )}
          </div>

          {/* DETAILED TRANSACTIONS LIST */}
          <div className="space-y-3">
            
            {/* Filter controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Поиск по товару, покупателю, партии..."
                  className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 pl-8 pr-3 py-1.5 rounded-xl text-xs text-white outline-none"
                />
              </div>

              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setPaymentFilter('all')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${
                    paymentFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Все чеки
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentFilter('cash')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${
                    paymentFilter === 'cash' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  💵 Наличные
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentFilter('debt')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${
                    paymentFilter === 'debt' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  📝 В долг
                </button>
              </div>
            </div>

            {/* TRANSACTIONS TABLE */}
            <div className="space-y-2">
              {filteredSalesByPeriod.length === 0 ? (
                <div className="p-8 border-2 border-dashed border-slate-800 rounded-2xl text-center text-slate-500 space-y-2">
                  <Receipt className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="font-semibold text-slate-400 text-xs">Продаж за выбранный период не найдено</p>
                  <p className="text-[11px] text-slate-500">Попробуйте изменить параметры периода или сбросить фильтр поиска</p>
                </div>
              ) : (
                filteredSalesByPeriod.map((sale) => {
                  const isExpanded = expandedSaleId === sale.id;
                  const debtInfo = getSaleDebtInfo(sale);

                  return (
                    <div
                      key={sale.id}
                      className="bg-slate-950/80 border border-slate-800/90 hover:border-slate-700 rounded-2xl overflow-hidden transition-all space-y-0"
                    >
                      {/* MAIN ROW */}
                      <div 
                        onClick={() => setExpandedSaleId(isExpanded ? null : sale.id)}
                        className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-900/60"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            debtInfo.isActiveDebt 
                              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' 
                              : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          }`}>
                            <Receipt className="w-4 h-4" />
                          </div>

                          <div className="min-w-0">
                            <h4 className="font-bold text-white text-xs flex items-center gap-2 flex-wrap">
                              <span>
                                {sale.items && sale.items.length > 0 
                                  ? sale.items.map(i => `${i.productName} (${i.quantity} шт)`).join(', ')
                                  : 'Продажа товаров'}
                              </span>
                              {debtInfo.isActiveDebt ? (
                                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] rounded-full font-bold flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-amber-400" />
                                  <span>В долг: {debtInfo.debtorName || 'Покупатель'}</span>
                                </span>
                              ) : debtInfo.isPaidOff && debtInfo.debtorName ? (
                                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] rounded-full font-bold flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                  <span>Долг погашен ({debtInfo.debtorName})</span>
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] rounded-full font-bold">
                                  Наличные
                                </span>
                              )}
                            </h4>

                            <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400 font-mono flex-wrap">
                              <span>Дата: <strong className="text-slate-200">{sale.dateStr || safeGetDateStr(sale.timestamp)}</strong></span>
                              {sale.timestamp && (
                                <span>Время: <strong className="text-slate-300">{safeFormatTime(sale.timestamp)}</strong></span>
                              )}
                              {sale.batchName && (
                                <span>Партия: <strong className="text-purple-300">{sale.batchName}</strong></span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* RIGHT: NUMERIC TOTALS */}
                        <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 border-slate-900 pt-2 sm:pt-0">
                          <div className="text-left sm:text-right font-mono">
                            <span className="text-[10px] text-slate-500 block">Выручка / Себестоимость</span>
                            <span className="text-xs font-bold text-emerald-400">
                              {(sale.totalRevenue || 0).toLocaleString('ru-RU')} {currencySymbol}
                            </span>
                            <span className="text-[10px] text-blue-400 block">
                              (Себест: {(sale.totalCogs || 0).toLocaleString('ru-RU')} {currencySymbol})
                            </span>
                          </div>

                          <div className="text-right font-mono">
                            <span className="text-[10px] text-slate-500 block">Чистая прибыль</span>
                            <span className={`text-xs font-bold ${(sale.netProfit || 0) >= 0 ? 'text-purple-400' : 'text-red-400'}`}>
                              {(sale.netProfit || 0) >= 0 ? '+' : ''}{(sale.netProfit || 0).toLocaleString('ru-RU')} {currencySymbol}
                            </span>
                          </div>

                          {onOpenReceipt && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenReceipt(sale);
                              }}
                              className="px-2.5 py-1.5 bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 font-bold text-xs rounded-xl flex items-center gap-1 transition-all shadow-sm"
                              title="Открыть, распечатать или отправить товарный чек клиенту"
                            >
                              <Receipt className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Чек</span>
                            </button>
                          )}

                          {onDeleteSale && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm('Удалить эту запись о продаже из истории?')) {
                                  onDeleteSale(sale.id);
                                }
                              }}
                              className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-slate-900 rounded-lg transition-colors"
                              title="Удалить чек"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                      </div>

                      {/* EXPANDED ITEMS DETAILS */}
                      {isExpanded && sale.items && sale.items.length > 0 && (
                        <div className="p-3 bg-slate-900/90 border-t border-slate-800 space-y-2 animate-fadeIn text-xs">
                          <p className="text-slate-400 font-bold text-[11px] flex items-center gap-1">
                            <Package className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Детализация позиций в чеке ({sale.items.length} поз.):</span>
                          </p>

                          <div className="space-y-1.5">
                            {sale.items.map((item, idx) => (
                              <div key={idx} className="p-2 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between font-mono text-[11px] flex-wrap gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-500">#{idx + 1}</span>
                                  <span className="font-bold text-white">{item.productName}</span>
                                  <span className="px-1.5 py-0.2 bg-slate-800 text-amber-300 rounded font-bold">
                                    {item.quantity} шт
                                  </span>
                                  <span className="text-slate-400">
                                    ({item.priceType === 'wholesale' ? 'Опт' : 'Розница'})
                                  </span>
                                </div>

                                <div className="flex items-center gap-3">
                                  <span>Цена: <strong className="text-emerald-400">{item.unitPrice} {currencySymbol}</strong></span>
                                  <span>Себест: <strong className="text-blue-400">{item.landedUnitCost} {currencySymbol}</strong></span>
                                  <span>Сумма: <strong className="text-purple-400">{item.totalAmount} {currencySymbol}</strong></span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    </div>
                  );
                })
              )}
            </div>

          </div>
            </>
          ) : (
            <div className="space-y-6 animate-fadeIn">
              {/* DEBT ANALYTICS KPI CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                
                {/* Card 1: Collected in Selected Period */}
                <div className="p-4 bg-slate-950/80 border border-emerald-500/30 rounded-2xl space-y-1 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl group-hover:bg-emerald-500/10 transition-all pointer-events-none" />
                  <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
                    <span>1. ПОГАШЕНО ЗА ПЕРИОД</span>
                    <ArrowDownRight className="w-4 h-4 text-emerald-400" />
                  </div>
                  <p className="text-xl sm:text-2xl font-black font-mono text-emerald-400">
                    {debtStats.totalCollectedInPeriod.toLocaleString('ru-RU')} <span className="text-xs font-normal text-emerald-300">{currencySymbol}</span>
                  </p>
                  <div className="text-[11px] text-slate-400 font-mono pt-1 border-t border-slate-800/80 flex items-center justify-between">
                    <span>Платежей в отчете:</span>
                    <strong className="text-emerald-400 font-bold">{filteredRepaymentsByPeriod.length} шт.</strong>
                  </div>
                </div>

                {/* Card 2: Current Active Debt Balance */}
                <div className="p-4 bg-slate-950/80 border border-amber-500/30 rounded-2xl space-y-1 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl group-hover:bg-amber-500/10 transition-all pointer-events-none" />
                  <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
                    <span>2. ТЕКУЩИЙ ОСТАТОК ДОЛГОВ</span>
                    <AlertCircle className="w-4 h-4 text-amber-400" />
                  </div>
                  <p className="text-xl sm:text-2xl font-black font-mono text-amber-400">
                    {debtStats.totalActiveDebtBalance.toLocaleString('ru-RU')} <span className="text-xs font-normal text-amber-300">{currencySymbol}</span>
                  </p>
                  <div className="text-[11px] text-slate-400 font-mono pt-1 border-t border-slate-800/80 flex items-center justify-between">
                    <span>Активных должников:</span>
                    <strong className="text-amber-400 font-bold">{debtStats.activeDebtsCount} чел.</strong>
                  </div>
                </div>

                {/* Card 3: Overall Debt Issued */}
                <div className="p-4 bg-slate-950/80 border border-blue-500/30 rounded-2xl space-y-1 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl group-hover:bg-blue-500/10 transition-all pointer-events-none" />
                  <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
                    <span>3. ВСЕГО ВЫДАННО В ДОЛГ</span>
                    <Receipt className="w-4 h-4 text-blue-400" />
                  </div>
                  <p className="text-xl sm:text-2xl font-black font-mono text-blue-400">
                    {debtStats.overallDebtIssued.toLocaleString('ru-RU')} <span className="text-xs font-normal text-blue-300">{currencySymbol}</span>
                  </p>
                  <div className="text-[11px] text-slate-400 font-mono pt-1 border-t border-slate-800/80 flex items-center justify-between">
                    <span>Всего записей долга:</span>
                    <strong className="text-blue-300 font-bold">{debtStats.totalDebtsCount} шт.</strong>
                  </div>
                </div>

                {/* Card 4: Overall Repayment Rate */}
                <div className="p-4 bg-slate-950/80 border border-purple-500/30 rounded-2xl space-y-1 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-xl group-hover:bg-purple-500/10 transition-all pointer-events-none" />
                  <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
                    <span>4. ВОЗВРАТ ДОЛГОВ (%)</span>
                    <CheckCircle2 className="w-4 h-4 text-purple-400" />
                  </div>
                  <p className="text-xl sm:text-2xl font-black font-mono text-purple-400">
                    {debtStats.repaymentPercentage}%
                  </p>
                  <div className="text-[11px] text-slate-400 font-mono pt-1 border-t border-slate-800/80 flex items-center justify-between">
                    <span>Закрыто долгов полностью:</span>
                    <strong className="text-purple-300 font-bold">{debtStats.paidDebtsCount} шт.</strong>
                  </div>
                </div>

              </div>

              {/* REPAYMENTS HISTORY TABLE */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <History className="w-5 h-5 text-amber-400" />
                    <div>
                      <h3 className="text-sm font-bold text-white tracking-tight">
                        Детализация поступивших платежей в счет долга
                      </h3>
                      <p className="text-xs text-slate-400">
                        Список всех операций погашения за выбранный период
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative flex-1 sm:w-64">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="text"
                        placeholder="Поиск по должнику или примечанию..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-500 transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {filteredRepaymentsByPeriod.length === 0 ? (
                  <div className="p-8 text-center space-y-2 bg-slate-900/50 rounded-xl border border-slate-800/80">
                    <Coins className="w-10 h-10 text-slate-600 mx-auto" />
                    <p className="text-sm font-bold text-slate-300">Погашений долгов за указанный период не найдено</p>
                    <p className="text-xs text-slate-500">
                      Попробуйте изменить выбранный период времени или сбросить поисковый фильтр
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="hidden md:grid grid-cols-12 gap-2 px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-900/90 rounded-xl border border-slate-800">
                      <div className="col-span-3 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>Дата и Время</span>
                      </div>
                      <div className="col-span-3 flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-500" />
                        <span>Должник</span>
                      </div>
                      <div className="col-span-2 text-right">Сумма взноса</div>
                      <div className="col-span-2 text-center">Статус долга</div>
                      <div className="col-span-2">Примечание / Товар</div>
                    </div>

                    {filteredRepaymentsByPeriod.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 bg-slate-900/80 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700 rounded-xl transition-all flex flex-col md:grid md:grid-cols-12 gap-2 text-xs items-start md:items-center"
                      >
                        <div className="md:col-span-3 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
                          <span className="font-mono text-slate-300">
                            {new Date(item.date).toLocaleDateString('ru-RU', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>

                        <div className="md:col-span-3 font-bold text-white flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-amber-400" />
                          <span>{item.debtorName}</span>
                        </div>

                        <div className="md:col-span-2 font-mono font-black text-emerald-400 md:text-right text-sm">
                          +{item.amount.toLocaleString('ru-RU')} {currencySymbol}
                        </div>

                        <div className="md:col-span-2 text-center">
                          {item.debtStatus === 'paid' ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Погашен
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold inline-flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              Частичный
                            </span>
                          )}
                        </div>

                        <div className="md:col-span-2 text-slate-400 text-[11px] truncate">
                          {item.note || item.productName || 'Погашение долга'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* FOOTER */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs font-mono flex-shrink-0">
          {activeTab === 'sales' ? (
            <span className="text-slate-400">
              Итого за период: <strong className="text-emerald-400">{stats.totalRevenue.toLocaleString('ru-RU')} {currencySymbol}</strong> (Прибыль: <strong className="text-purple-400">+{stats.netProfit.toLocaleString('ru-RU')} {currencySymbol}</strong>)
            </span>
          ) : (
            <span className="text-slate-400">
              Погашено долгов за период: <strong className="text-emerald-400">{debtStats.totalCollectedInPeriod.toLocaleString('ru-RU')} {currencySymbol}</strong> (Активный остаток долгов: <strong className="text-amber-400">{debtStats.totalActiveDebtBalance.toLocaleString('ru-RU')} {currencySymbol}</strong>)
            </span>
          )}

          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-all"
          >
            Закрыть
          </button>
        </div>

      </div>
    </div>
  );
}
