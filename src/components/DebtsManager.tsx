import React, { useState, useMemo } from 'react';
import { 
  User, 
  Phone, 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Coins, 
  DollarSign, 
  ChevronDown, 
  ChevronUp, 
  Check, 
  Calendar, 
  X, 
  Wallet,
  ArrowUpRight,
  FileText,
  Camera,
  Image as ImageIcon,
  Upload
} from 'lucide-react';
import { DebtRecord, DebtPayment } from '../types';

interface DebtsManagerProps {
  debts: DebtRecord[];
  onAddDebt: (debt: Omit<DebtRecord, 'id' | 'createdAt' | 'paidAmount' | 'status' | 'payments'>, initialPayment?: number) => void;
  onUpdateDebt: (debt: DebtRecord) => void;
  onDeleteDebt: (debtId: string) => void;
  onAddPayment: (debtId: string, amount: number, note?: string) => void;
  defaultCurrency?: 'KGS' | 'USD';
  isModalMode?: boolean;
  onCloseModal?: () => void;
}

export default function DebtsManager({
  debts,
  onAddDebt,
  onUpdateDebt,
  onDeleteDebt,
  onAddPayment,
  defaultCurrency = 'KGS',
  isModalMode = false,
  onCloseModal
}: DebtsManagerProps) {
  // Search and Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'partial' | 'paid'>('all');
  const [currencyFilter, setCurrencyFilter] = useState<'all' | 'KGS' | 'USD'>('all');

  // Modal toggles
  const [showAddModal, setShowAddModal] = useState(false);
  const [repayingDebt, setRepayingDebt] = useState<DebtRecord | null>(null);
  const [editingDebt, setEditingDebt] = useState<DebtRecord | null>(null);
  const [expandedDebtId, setExpandedDebtId] = useState<string | null>(null);
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);

  // Form State for Add / Edit
  const [debtorName, setDebtorName] = useState('');
  const [phone, setPhone] = useState('');
  const [productName, setProductName] = useState('');
  const [totalAmount, setTotalAmount] = useState<number | ''>('');
  const [currency, setCurrency] = useState<'KGS' | 'USD'>(defaultCurrency);
  const [initialPayment, setInitialPayment] = useState<number | ''>('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [debtorPhotoUrl, setDebtorPhotoUrl] = useState<string>('');

  // Form State for Repayment
  const [repayAmount, setRepayAmount] = useState<number | ''>('');
  const [repayNote, setRepayNote] = useState('');

  // Helper: Compress and read image as Base64 data URL
  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  // Open Add Modal
  const handleOpenAddModal = () => {
    setDebtorName('');
    setPhone('');
    setProductName('');
    setTotalAmount('');
    setCurrency(defaultCurrency);
    setInitialPayment('');
    setDueDate('');
    setNotes('');
    setDebtorPhotoUrl('');
    setEditingDebt(null);
    setShowAddModal(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (debt: DebtRecord) => {
    setEditingDebt(debt);
    setDebtorName(debt.debtorName);
    setPhone(debt.phone || '');
    setProductName(debt.productName || '');
    setTotalAmount(debt.totalAmount);
    setCurrency(debt.currency);
    setInitialPayment('');
    setDueDate(debt.dueDate || '');
    setNotes(debt.notes || '');
    setDebtorPhotoUrl(debt.debtorPhotoUrl || '');
    setShowAddModal(true);
  };

  // Submit Add or Edit
  const handleSaveDebtSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!debtorName.trim() || !totalAmount || Number(totalAmount) <= 0) {
      alert('Пожалуйста, укажите имя должника и сумму долга больше нуля.');
      return;
    }

    if (editingDebt) {
      // Calculate new status based on total and paid
      const numTotal = Number(totalAmount);
      const currentPaid = editingDebt.paidAmount;
      let newStatus: 'active' | 'partial' | 'paid' = 'active';
      if (currentPaid >= numTotal) {
        newStatus = 'paid';
      } else if (currentPaid > 0) {
        newStatus = 'partial';
      }

      onUpdateDebt({
        ...editingDebt,
        debtorName: debtorName.trim(),
        phone: phone.trim(),
        productName: productName.trim(),
        totalAmount: numTotal,
        currency,
        dueDate: dueDate || undefined,
        notes: notes.trim(),
        debtorPhotoUrl: debtorPhotoUrl || undefined,
        status: newStatus
      });
    } else {
      onAddDebt(
        {
          debtorName: debtorName.trim(),
          phone: phone.trim(),
          productName: productName.trim(),
          totalAmount: Number(totalAmount),
          currency,
          dueDate: dueDate || undefined,
          notes: notes.trim(),
          debtorPhotoUrl: debtorPhotoUrl || undefined
        },
        initialPayment ? Number(initialPayment) : 0
      );
    }

    setShowAddModal(false);
  };

  // Submit Repayment
  const handleRepaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!repayingDebt || !repayAmount || Number(repayAmount) <= 0) return;

    onAddPayment(repayingDebt.id, Number(repayAmount), repayNote.trim());
    setRepayingDebt(null);
    setRepayAmount('');
    setRepayNote('');
  };

  // KPI Calculations
  const stats = useMemo(() => {
    let totalKgsDebt = 0;
    let totalUsdDebt = 0;
    let totalKgsPaid = 0;
    let totalUsdPaid = 0;
    let activeDebtorsCount = 0;

    debts.forEach(d => {
      const remaining = Math.max(0, d.totalAmount - d.paidAmount);
      if (remaining > 0) {
        activeDebtorsCount++;
        if (d.currency === 'KGS') {
          totalKgsDebt += remaining;
          totalKgsPaid += d.paidAmount;
        } else {
          totalUsdDebt += remaining;
          totalUsdPaid += d.paidAmount;
        }
      } else {
        if (d.currency === 'KGS') {
          totalKgsPaid += d.paidAmount;
        } else {
          totalUsdPaid += d.paidAmount;
        }
      }
    });

    return {
      totalKgsDebt,
      totalUsdDebt,
      totalKgsPaid,
      totalUsdPaid,
      activeDebtorsCount,
      totalDebtorsCount: debts.length
    };
  }, [debts]);

  // Filtered Debts List
  const filteredDebts = useMemo(() => {
    return debts.filter(d => {
      // Search
      const query = searchTerm.toLowerCase();
      const matchesSearch = 
        d.debtorName.toLowerCase().includes(query) ||
        (d.phone && d.phone.includes(query)) ||
        (d.productName && d.productName.toLowerCase().includes(query)) ||
        (d.notes && d.notes.toLowerCase().includes(query));

      if (!matchesSearch) return false;

      // Status Filter
      if (statusFilter === 'active' && d.status !== 'active') return false;
      if (statusFilter === 'partial' && d.status !== 'partial') return false;
      if (statusFilter === 'paid' && d.status !== 'paid') return false;

      // Currency Filter
      if (currencyFilter !== 'all' && d.currency !== currencyFilter) return false;

      return true;
    });
  }, [debts, searchTerm, statusFilter, currencyFilter]);

  return (
    <div className={`space-y-6 ${isModalMode ? 'p-2' : ''}`}>
      
      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/40 p-4 sm:p-5 rounded-2xl border border-slate-800/80">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <span>Окно учета долгов и дебиторки</span>
                {stats.activeDebtorsCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs font-mono font-bold border border-red-500/30">
                    {stats.activeDebtorsCount} активн.
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                Учет выданных товаров в долг, рассрочек, истории выплат и списков должников
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isModalMode && onCloseModal && (
            <button
              onClick={onCloseModal}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
            >
              Закрыть
            </button>
          )}
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-amber-600/15 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>ЗАПИСАТЬ НОВЫЙ ДОЛГ</span>
          </button>
        </div>
      </div>

      {/* KPI STAT CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Card 1: KGS Debts */}
        <div className="p-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl flex flex-col justify-between shadow-sm relative overflow-hidden group">
          <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 w-16 h-16 bg-red-600/5 rounded-full blur-xl group-hover:bg-red-600/10 transition-all"></div>
          <div>
            <span className="text-[9px] uppercase tracking-[0.15em] text-slate-500 font-bold block mb-1">
              Активный долг (Сом)
            </span>
            <p className="text-lg sm:text-2xl font-mono text-red-400 font-bold leading-none">
              {stats.totalKgsDebt.toLocaleString('ru-RU')} <span className="text-xs font-normal">сом</span>
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400">
            <span>Погашено:</span>
            <span className="font-mono text-emerald-400 font-semibold">
              {stats.totalKgsPaid.toLocaleString('ru-RU')} сом
            </span>
          </div>
        </div>

        {/* Card 2: USD Debts */}
        <div className="p-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl flex flex-col justify-between shadow-sm relative overflow-hidden group">
          <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 w-16 h-16 bg-blue-600/5 rounded-full blur-xl group-hover:bg-blue-600/10 transition-all"></div>
          <div>
            <span className="text-[9px] uppercase tracking-[0.15em] text-slate-500 font-bold block mb-1">
              Активный долг (USD)
            </span>
            <p className="text-lg sm:text-2xl font-mono text-blue-400 font-bold leading-none">
              ${stats.totalUsdDebt.toLocaleString('ru-RU', { minimumFractionDigits: 0 })}
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400">
            <span>Погашено:</span>
            <span className="font-mono text-emerald-400 font-semibold">
              ${stats.totalUsdPaid.toLocaleString('ru-RU', { minimumFractionDigits: 0 })}
            </span>
          </div>
        </div>

        {/* Card 3: Active Debtors Count */}
        <div className="p-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl flex flex-col justify-between shadow-sm relative overflow-hidden group">
          <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 w-16 h-16 bg-amber-600/5 rounded-full blur-xl group-hover:bg-amber-600/10 transition-all"></div>
          <div>
            <span className="text-[9px] uppercase tracking-[0.15em] text-slate-500 font-bold block mb-1">
              Активных должников
            </span>
            <p className="text-lg sm:text-2xl font-mono text-amber-400 font-bold leading-none">
              {stats.activeDebtorsCount} <span className="text-xs font-normal text-slate-500">чел</span>
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400">
            <span>Всего записей:</span>
            <span className="font-mono text-white font-semibold">{stats.totalDebtorsCount}</span>
          </div>
        </div>

        {/* Card 4: Status Indicator */}
        <div className="p-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl flex flex-col justify-between shadow-sm relative overflow-hidden group">
          <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 w-16 h-16 bg-emerald-600/5 rounded-full blur-xl group-hover:bg-emerald-600/10 transition-all"></div>
          <div>
            <span className="text-[9px] uppercase tracking-[0.15em] text-slate-500 font-bold block mb-1">
              Статус выплат
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className={`w-3 h-3 rounded-full ${stats.activeDebtorsCount === 0 ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`}></span>
              <span className="text-sm font-semibold text-white">
                {stats.activeDebtorsCount === 0 ? 'Все долги закрыты!' : 'Есть невозвраты'}
              </span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-800/60 text-[10px] text-slate-400">
            <span>Авто-сохранение в облаке</span>
          </div>
        </div>

      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="bg-slate-900/30 p-4 rounded-2xl border border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Поиск должника по имени, телефону или товару..."
            className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 pl-10 pr-4 py-2 rounded-xl text-xs text-white placeholder-slate-500 outline-none transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center gap-1 text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                statusFilter === 'all' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Все ({debts.length})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                statusFilter === 'active' ? 'bg-red-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              🔴 Активные
            </button>
            <button
              onClick={() => setStatusFilter('partial')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                statusFilter === 'partial' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              🟡 Частично
            </button>
            <button
              onClick={() => setStatusFilter('paid')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                statusFilter === 'paid' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              🟢 Погашенные
            </button>
          </div>

          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center gap-1 text-xs">
            <button
              onClick={() => setCurrencyFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                currencyFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400'
              }`}
            >
              Все валюты
            </button>
            <button
              onClick={() => setCurrencyFilter('KGS')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                currencyFilter === 'KGS' ? 'bg-purple-600 text-white' : 'text-slate-400'
              }`}
            >
              KGS (сом)
            </button>
            <button
              onClick={() => setCurrencyFilter('USD')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                currencyFilter === 'USD' ? 'bg-blue-600 text-white' : 'text-slate-400'
              }`}
            >
              USD ($)
            </button>
          </div>
        </div>
      </div>

      {/* DEBTS LIST */}
      {filteredDebts.length === 0 ? (
        <div className="bg-slate-900/20 border border-slate-800/80 rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-full bg-slate-800/80 flex items-center justify-center border border-slate-700/50">
            <Wallet className="w-6 h-6 text-slate-500" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">Список должников пуст</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {searchTerm || statusFilter !== 'all' || currencyFilter !== 'all'
                ? 'Нет записей, соответствующих выбранным фильтрам поиска.'
                : 'У вас пока нет записанных долгов. Нажмите "Записать новый долг", чтобы добавить покупку в долг.'}
            </p>
          </div>
          <button
            onClick={handleOpenAddModal}
            className="mt-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-xl transition-all"
          >
            + Записать долг
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDebts.map((debt) => {
            const remaining = Math.max(0, debt.totalAmount - debt.paidAmount);
            const percentPaid = debt.totalAmount > 0 
              ? Math.min(100, Math.round((debt.paidAmount / debt.totalAmount) * 100)) 
              : 100;
            const isExpanded = expandedDebtId === debt.id;
            const currencySymbol = debt.currency === 'USD' ? '$' : 'сом';

            return (
              <div
                key={debt.id}
                className={`bg-slate-900/30 border rounded-2xl p-4 sm:p-5 transition-all space-y-3 ${
                  debt.status === 'paid'
                    ? 'border-emerald-900/40 bg-emerald-950/10'
                    : debt.status === 'partial'
                    ? 'border-amber-800/50 bg-amber-950/10'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Main Card Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  
                  {/* Left: Debtor info */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      {debt.debtorPhotoUrl ? (
                        <img
                          src={debt.debtorPhotoUrl}
                          alt={debt.debtorName}
                          onClick={() => setPreviewPhotoUrl(debt.debtorPhotoUrl!)}
                          className="w-10 h-10 rounded-xl object-cover border border-amber-500/40 cursor-pointer hover:scale-105 transition-all shadow-sm flex-shrink-0"
                          title="Нажмите, чтобы посмотреть фото"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center text-amber-400 font-bold text-sm flex-shrink-0">
                          {debt.debtorName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                          {debt.debtorName}
                        </h3>
                      </div>

                      {/* Status badge */}
                      {debt.status === 'paid' && (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          ПОГАШЕН (100%)
                        </span>
                      )}
                      {debt.status === 'partial' && (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold border border-amber-500/30 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          ЧАСТИЧНО ({percentPaid}%)
                        </span>
                      )}
                      {debt.status === 'active' && (
                        <span className="px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-bold border border-red-500/30 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          НЕ ВЫПЛАЧЕН
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap pt-0.5">
                      {debt.phone && (
                        <a 
                          href={`tel:${debt.phone}`} 
                          className="flex items-center gap-1 text-slate-300 hover:text-amber-400 font-mono transition-colors"
                        >
                          <Phone className="w-3 h-3 text-amber-500" />
                          <span>{debt.phone}</span>
                        </a>
                      )}
                      {debt.productName && (
                        <span className="flex items-center gap-1 text-slate-300">
                          <FileText className="w-3 h-3 text-slate-500" />
                          <span>Товар: <strong className="text-white">{debt.productName}</strong></span>
                        </span>
                      )}
                      <span className="text-[11px] text-slate-500 font-mono">
                        Дата: {debt.createdAt}
                      </span>
                      {debt.dueDate && (
                        <span className="text-[11px] text-amber-400 font-mono flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Срок: {debt.dueDate}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Numbers & Repay button */}
                  <div className="flex items-center gap-4 sm:justify-end">
                    <div className="text-right font-mono">
                      <span className="text-[10px] text-slate-500 block uppercase">Остаток долга</span>
                      <p className={`text-lg sm:text-xl font-bold ${remaining === 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {remaining.toLocaleString('ru-RU')} {currencySymbol}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Из суммы: {debt.totalAmount.toLocaleString('ru-RU')} {currencySymbol}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {remaining > 0 && (
                        <button
                          onClick={() => setRepayingDebt(debt)}
                          className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1 shadow-md shadow-emerald-600/20 transition-all"
                          title="Внести оплату или гасить долг"
                        >
                          <Coins className="w-3.5 h-3.5" />
                          <span>ПОГАСИТЬ</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleOpenEditModal(debt)}
                        className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors"
                        title="Редактировать должника"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => onDeleteDebt(debt.id)}
                        className="p-2 bg-red-950/30 hover:bg-red-900/50 text-red-400 rounded-xl border border-red-900/30 transition-colors"
                        title="Удалить запись"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                </div>

                {/* Progress bar */}
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>Выплачено: <strong className="text-emerald-400">{debt.paidAmount.toLocaleString('ru-RU')} {currencySymbol}</strong></span>
                    <span>{percentPaid}% закрыто</span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800">
                    <div
                      className={`h-full transition-all duration-500 ${
                        percentPaid === 100 
                          ? 'bg-emerald-500' 
                          : percentPaid > 0 
                          ? 'bg-amber-500' 
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${percentPaid}%` }}
                    ></div>
                  </div>
                </div>

                {/* Optional Notes */}
                {debt.notes && (
                  <p className="text-xs text-slate-400 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/50 italic">
                    💡 "{debt.notes}"
                  </p>
                )}

                {/* History dropdown toggle */}
                <div className="pt-1 flex items-center justify-between text-xs border-t border-slate-800/60">
                  <button
                    onClick={() => setExpandedDebtId(isExpanded ? null : debt.id)}
                    className="text-slate-400 hover:text-white flex items-center gap-1 font-mono text-[11px]"
                  >
                    <span>История платежей ({debt.payments ? debt.payments.length : 0})</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  <span className="text-[10px] text-slate-500">
                    ID: {debt.id}
                  </span>
                </div>

                {/* Expanded Payment History list */}
                {isExpanded && (
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 space-y-2 mt-2 text-xs font-mono">
                    <h4 className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">
                      Платежи по этому долгу:
                    </h4>
                    {!debt.payments || debt.payments.length === 0 ? (
                      <p className="text-slate-500 text-[11px]">Оплат пока не поступало.</p>
                    ) : (
                      <div className="divide-y divide-slate-800">
                        {debt.payments.map((p) => (
                          <div key={p.id} className="py-2 flex items-center justify-between text-slate-300">
                            <div>
                              <span className="text-emerald-400 font-bold">+{p.amount.toLocaleString('ru-RU')} {currencySymbol}</span>
                              {p.note && <span className="text-slate-400 text-[11px] ml-2">({p.note})</span>}
                            </div>
                            <span className="text-[10px] text-slate-500">{p.date}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

      {/* --- MODAL 1: ADD / EDIT DEBT --- */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Wallet className="w-5 h-5 text-amber-500" />
                <span>{editingDebt ? 'Редактировать запись долга' : 'Записать покупку / выдать товар в долг'}</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDebtSubmit} className="space-y-4">
              
              {/* Debtor Photo Input */}
              <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800 space-y-2">
                <label className="block text-xs text-slate-300 font-bold flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-amber-400" />
                    <span>Фото должника</span>
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
                      alt="Предпросмотр" 
                      className="w-14 h-14 rounded-2xl object-cover border border-amber-500/50 shadow-md flex-shrink-0" 
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-dashed border-slate-700 flex flex-col items-center justify-center text-slate-500 flex-shrink-0">
                      <Camera className="w-5 h-5 text-slate-600" />
                      <span className="text-[9px]">Нет фото</span>
                    </div>
                  )}

                  <div className="flex-1 space-y-2">
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors">
                      <Upload className="w-3.5 h-3.5 text-amber-400" />
                      <span>{debtorPhotoUrl ? 'Заменить фото' : 'Выбрать файл'}</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handlePhotoFileChange} 
                        className="hidden" 
                      />
                    </label>

                    <input
                      type="url"
                      value={debtorPhotoUrl.startsWith('data:') ? '' : debtorPhotoUrl}
                      onChange={(e) => setDebtorPhotoUrl(e.target.value)}
                      placeholder="Или вставьте прямую ссылку на фото (URL)"
                      className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl py-1.5 px-2.5 text-[11px] text-white outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Debtor Name */}
              <div>
                <label className="block text-xs text-slate-300 font-bold mb-1">
                  ФИО должника / Покупатель <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={debtorName}
                  onChange={(e) => setDebtorName(e.target.value)}
                  placeholder="Например: Асан или Магазин Дордой #15"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl py-2.5 px-3.5 text-xs text-white outline-none"
                  required
                />
              </div>

              {/* Phone and Product */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Телефон / Контакт</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+996 555 123456"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl py-2 px-3 text-xs text-white font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Наименование товара</label>
                  <input
                    type="text"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="Например: Наушники i12 (100 шт)"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl py-2 px-3 text-xs text-white outline-none"
                  />
                </div>
              </div>

              {/* Amount and Currency */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-300 font-bold mb-1">
                    Сумма долга <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(e.target.value ? parseFloat(e.target.value) : '')}
                    placeholder="0"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl py-2.5 px-3.5 text-sm font-mono text-amber-400 font-bold outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-300 font-bold mb-1">Валюта долга</label>
                  <div className="grid grid-cols-2 gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setCurrency('KGS')}
                      className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                        currency === 'KGS' ? 'bg-purple-600 text-white shadow' : 'text-slate-400'
                      }`}
                    >
                      KGS (сом)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrency('USD')}
                      className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                        currency === 'USD' ? 'bg-blue-600 text-white shadow' : 'text-slate-400'
                      }`}
                    >
                      USD ($)
                    </button>
                  </div>
                </div>
              </div>

              {/* Initial payment (if creating new) */}
              {!editingDebt && (
                <div>
                  <label className="block text-xs text-slate-300 mb-1">
                    Первоначальный взнос / Аванс (если уплачен часть денег сразу)
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={initialPayment}
                    onChange={(e) => setInitialPayment(e.target.value ? parseFloat(e.target.value) : '')}
                    placeholder="0 (оставьте пустым если аванса не было)"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl py-2 px-3 text-xs text-emerald-400 font-mono outline-none"
                  />
                </div>
              )}

              {/* Due Date & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Обещанный срок возврата</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl py-2 px-3 text-xs text-white outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Заметки / Комментарий</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Например: под расписку или гарантию"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl py-2 px-3 text-xs text-white outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-amber-600/20"
                >
                  {editingDebt ? 'Сохранить изменения' : 'Зафиксировать долг'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: REPAYMENT FORM --- */}
      {repayingDebt && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Coins className="w-5 h-5 text-emerald-400" />
                  <span>Внесение оплаты по долгу</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Должник: <strong className="text-white">{repayingDebt.debtorName}</strong>
                </p>
              </div>
              <button
                onClick={() => setRepayingDebt(null)}
                className="p-1 text-slate-400 hover:text-white rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2 text-xs font-mono">
              <div className="flex justify-between text-slate-400">
                <span>Изначальный долг:</span>
                <span className="text-white">{repayingDebt.totalAmount.toLocaleString('ru-RU')} {repayingDebt.currency === 'USD' ? '$' : 'сом'}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Уже выплачено:</span>
                <span className="text-emerald-400 font-bold">{repayingDebt.paidAmount.toLocaleString('ru-RU')} {repayingDebt.currency === 'USD' ? '$' : 'сом'}</span>
              </div>
              <div className="flex justify-between border-t border-slate-800 pt-1.5 text-sm font-bold">
                <span className="text-slate-300">Остаток возврата:</span>
                <span className="text-red-400">{Math.max(0, repayingDebt.totalAmount - repayingDebt.paidAmount).toLocaleString('ru-RU')} {repayingDebt.currency === 'USD' ? '$' : 'сом'}</span>
              </div>
            </div>

            <form onSubmit={handleRepaymentSubmit} className="space-y-4">
              
              {/* Partial Payment Quick Chips */}
              <div>
                <label className="block text-xs text-slate-300 mb-1.5 font-bold">Быстрый выбор частичной оплаты:</label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                  {repayingDebt.currency === 'KGS' ? (
                    <>
                      {[100, 200, 500, 1000, 2000, 5000].map(val => {
                        const rem = Math.max(0, repayingDebt.totalAmount - repayingDebt.paidAmount);
                        if (val > rem && val !== 100) return null;
                        return (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setRepayAmount(Math.min(val, rem))}
                            className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-mono font-bold transition-all border border-slate-700 hover:border-amber-500/50"
                          >
                            +{val} сом
                          </button>
                        );
                      })}
                    </>
                  ) : (
                    <>
                      {[10, 20, 50, 100, 200, 500].map(val => {
                        const rem = Math.max(0, repayingDebt.totalAmount - repayingDebt.paidAmount);
                        if (val > rem && val !== 10) return null;
                        return (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setRepayAmount(Math.min(val, rem))}
                            className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-mono font-bold transition-all border border-slate-700 hover:border-amber-500/50"
                          >
                            +${val}
                          </button>
                        );
                      })}
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => setRepayAmount(Math.round(Math.max(0, repayingDebt.totalAmount - repayingDebt.paidAmount) / 2))}
                    className="py-1.5 px-2 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-800 text-amber-300 rounded-xl text-xs font-bold transition-colors"
                  >
                    50%
                  </button>
                  <button
                    type="button"
                    onClick={() => setRepayAmount(Math.max(0, repayingDebt.totalAmount - repayingDebt.paidAmount))}
                    className="py-1.5 px-2 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800 text-emerald-300 rounded-xl text-xs font-bold transition-colors"
                  >
                    100%
                  </button>
                </div>
              </div>

              {/* Amount input */}
              <div>
                <label className="block text-xs text-slate-300 font-bold mb-1 flex items-center justify-between">
                  <span>Вносимая сумма по частям ({repayingDebt.currency === 'USD' ? '$' : 'сом'}) <span className="text-red-400">*</span></span>
                  <span className="text-[10px] text-amber-400 font-normal">Любая сумма</span>
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  max={Math.max(0, repayingDebt.totalAmount - repayingDebt.paidAmount)}
                  value={repayAmount}
                  onChange={(e) => setRepayAmount(e.target.value ? parseFloat(e.target.value) : '')}
                  placeholder="Введите любую сумму частичного взноса"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl py-2.5 px-3.5 text-base font-mono text-emerald-400 font-bold outline-none"
                  required
                />
              </div>

              {/* Live Remaining Balance Calculation */}
              {repayAmount !== '' && Number(repayAmount) > 0 && (
                <div className="bg-emerald-950/20 border border-emerald-800/40 rounded-xl p-3 text-xs font-mono flex items-center justify-between text-emerald-300">
                  <span>Остаток долга после этой оплаты:</span>
                  <span className="font-bold text-sm">
                    {Math.max(0, (repayingDebt.totalAmount - repayingDebt.paidAmount) - Number(repayAmount)).toLocaleString('ru-RU')} {repayingDebt.currency === 'USD' ? '$' : 'сом'}
                  </span>
                </div>
              )}

              {/* Note */}
              <div>
                <label className="block text-xs text-slate-300 mb-1">Примечание к частичному платежу</label>
                <input
                  type="text"
                  value={repayNote}
                  onChange={(e) => setRepayNote(e.target.value)}
                  placeholder="Например: Погасил часть через Mbank / наличностью"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl py-2 px-3 text-xs text-white outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRepayingDebt(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-emerald-600/20 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Внести частичную оплату</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* --- LIGHTBOX MODAL FOR DEBTOR PHOTO --- */}
      {previewPhotoUrl && (
        <div 
          onClick={() => setPreviewPhotoUrl(null)} 
          className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-lg w-full flex flex-col items-center gap-3">
            <img 
              src={previewPhotoUrl} 
              alt="Фото должника" 
              className="max-h-[80vh] w-auto rounded-2xl object-contain border border-slate-800 shadow-2xl" 
            />
            <button
              onClick={() => setPreviewPhotoUrl(null)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl shadow"
            >
              Закрыть (Нажмите в любом месте)
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
