import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Lock, 
  Plus, 
  Trash2, 
  Download, 
  Upload, 
  Coins, 
  Layers, 
  LogOut, 
  FileSpreadsheet, 
  Check, 
  Edit3, 
  AlertCircle, 
  Info,
  Package,
  RefreshCw,
  TrendingUp,
  Sliders,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Wallet,
  CreditCard,
  ShoppingBag,
  Camera,
  Image as ImageIcon,
  X,
  BarChart3,
  Save,
  Unlock,
  ShieldCheck
} from 'lucide-react';
import { Product, ShipmentBatch, AppSettings, DebtRecord, DebtPayment } from './types';
import { 
  db, 
  saveBatchToCloud, 
  deleteBatchFromCloud, 
  loadBatchesFromCloud, 
  saveSettingsToCloud, 
  loadSettingsFromCloud,
  saveDebtToCloud,
  deleteDebtFromCloud,
  loadDebtsFromCloud
} from './firebase';
import DebtsManager from './components/DebtsManager';
import SoldProductsModal from './components/SoldProductsModal';
import SellProductModal from './components/SellProductModal';
import AnalyticsModal from './components/AnalyticsModal';

// Helper to create a new empty batch
const createNewBatch = (name: string, index: number, settings: AppSettings): ShipmentBatch => ({
  id: `batch-${Date.now()}-${index}`,
  name: name,
  createdAt: new Date().toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }),
  currencyRateCNYtoUSD: settings.defaultCNYtoUSD || 0.15,
  currencyRateCNYtoKGS: settings.defaultCNYtoKGS || 13.2,
  currencyRateUSDtoKGS: settings.defaultUSDtoKGS || 88.0,
  targetCurrency: settings.defaultTargetCurrency || 'KGS',
  products: []
});

// Sample products for demo load
const sampleProducts: Product[] = [
  {
    id: 'prod-1',
    name: 'Товар #1 (Китай 5¥, 0.5кг)',
    priceCNY: 5,
    weight: 0.5,
    quantity: 1,
    deliveryMode: 'weight',
    deliveryValue: 0.9,
    deliveryCurrency: 'USD',
    wholesalePriceUSD: 150,
    retailPriceUSD: 220
  },
  {
    id: 'prod-2',
    name: 'Xiaomi Powerbank 20k',
    priceCNY: 85,
    weight: 0.42,
    quantity: 150,
    deliveryMode: 'flat',
    deliveryValue: 350,
    deliveryCurrency: 'KGS',
    wholesalePriceUSD: 1600,
    retailPriceUSD: 2200
  },
  {
    id: 'prod-3',
    name: 'Игровая клавиатура RGB K8',
    priceCNY: 210,
    weight: 1.1,
    quantity: 45,
    deliveryMode: 'weight',
    deliveryValue: 4.2, // $4.2 / кг
    deliveryCurrency: 'USD',
    wholesalePriceUSD: 4200,
    retailPriceUSD: 6800
  }
];

// Sample initial debts for demo
const sampleDebts: DebtRecord[] = [
  {
    id: 'debt-demo-1',
    debtorName: 'Магазин Дордой #12 (Асан)',
    phone: '+996 555 123456',
    productName: 'Xiaomi Powerbank 20k (10 шт)',
    totalAmount: 25000,
    paidAmount: 10000,
    currency: 'KGS',
    createdAt: new Date().toLocaleDateString('ru-RU'),
    dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    status: 'partial',
    notes: 'Часть уплачена при передаче товара',
    payments: [
      {
        id: 'pay-demo-1',
        amount: 10000,
        date: new Date().toLocaleDateString('ru-RU'),
        note: 'Первоначальный взнос'
      }
    ]
  },
  {
    id: 'debt-demo-2',
    debtorName: 'Алихан (Опт Бишкек)',
    phone: '+996 700 888999',
    productName: 'Игровая клавиатура RGB K8 (5 шт)',
    totalAmount: 350,
    paidAmount: 0,
    currency: 'USD',
    createdAt: new Date().toLocaleDateString('ru-RU'),
    status: 'active',
    notes: 'Расчет после реализации партии',
    payments: []
  }
];


// Helper to parse numeric inputs supporting both comma (13,2) and dot (13.2)
const parseDecimal = (val: any): number => {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const str = String(val).replace(',', '.').trim();
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
};

export default function App() {
  // --- AUTH & CONFIG STATE ---
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [authError, setAuthError] = useState<string>('');
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [isLoadingCloud, setIsLoadingCloud] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'synced' | 'error'>('synced');
  
  // App settings
  const [settings, setSettings] = useState<AppSettings>({
    passwordHash: '12345', // Default simple access password
    isAuthEnabled: true,
    defaultCNYtoUSD: 0.15,
    defaultCNYtoKGS: 13.2, // 13.2 Som per CNY
    defaultUSDtoKGS: 88.0, // 88 Som per USD
    defaultTargetCurrency: 'KGS' // Default to Soms
  });

  // Shipment Batches
  const [batches, setBatches] = useState<ShipmentBatch[]>([]);
  const [activeBatchId, setActiveBatchId] = useState<string>('');

  // Debts State
  const [debts, setDebts] = useState<DebtRecord[]>([]);

  // UI Navigation / State
  const [activeTab, setActiveTab] = useState<'calc' | 'shipments' | 'debts' | 'settings'>('calc');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [showSyncHelpModal, setShowSyncHelpModal] = useState<boolean>(false);
  const [showSoldProductsModal, setShowSoldProductsModal] = useState<boolean>(false);
  const [showSellProductModal, setShowSellProductModal] = useState<boolean>(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState<boolean>(false);
  const [previewProductPhotoUrl, setPreviewProductPhotoUrl] = useState<string | null>(null);

  // Protected Product / Actions authorization state
  const [protectedProductAction, setProtectedProductAction] = useState<{
    type: 'unlock' | 'delete' | 'clear_all' | 'delete_batch' | 'unlock_rates' | 'delete_debt' | 'restore_backup';
    product?: Product;
    batchId?: string;
    debtId?: string;
    backupData?: any;
  } | null>(null);
  const [productAuthPassword, setProductAuthPassword] = useState<string>('');
  const [productAuthError, setProductAuthError] = useState<string>('');
  const [saveToastMessage, setSaveToastMessage] = useState<string | null>(null);

  // Active debts count
  const activeDebtsCount = useMemo(() => {
    return debts.filter(d => (d.totalAmount - d.paidAmount) > 0).length;
  }, [debts]);
  
  // Editing state for names
  const [editingBatchNameId, setEditingBatchNameId] = useState<string | null>(null);
  const [batchNameInput, setBatchNameInput] = useState<string>('');

  // Password update form
  const [oldPassword, setOldPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState<string>('');
  const [passwordChangeError, setPasswordChangeError] = useState<string>('');

  // Timer ref for debouncing cloud save
  const saveTimeoutRef = useRef<{ [key: string]: NodeJS.Timeout }>({});

  // Timeout wrapper for cloud operations
  const withTimeout = <T,>(promise: Promise<T>, ms = 1200): Promise<T> => {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Cloud operation timed out after ${ms}ms`));
      }, ms);
      promise
        .then(res => {
          clearTimeout(timer);
          resolve(res);
        })
        .catch(err => {
          clearTimeout(timer);
          reject(err);
        });
    });
  };

  // LocalStorage Helper
  const saveLocal = (key: string, data: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error('LocalStorage save error:', e);
    }
  };

  const getLocal = <T,>(key: string, fallback: T): T => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : fallback;
    } catch (e) {
      return fallback;
    }
  };

  // --- INITIAL LOAD FROM LOCALSTORAGE & CLOUD BACKGROUND SYNC ---
  useEffect(() => {
    async function initApp() {
      try {
        // 1. Immediately load local settings so UI renders without delay
        const localSettings = getLocal<AppSettings>('sinocalc_settings_local', settings);
        setSettings(localSettings);

        // 2. Check session storage for existing auth
        const sessionAuth = sessionStorage.getItem('sinocalc_authenticated_pro');
        if (sessionAuth === 'true') {
          setIsAuthenticated(true);
        }

        // 3. Close full-screen loader immediately
        setIsInitializing(false);

        // 4. Try cloud settings in background with strict 1.2s timeout
        try {
          const cloudSettings = await withTimeout(loadSettingsFromCloud(), 1200);
          if (cloudSettings) {
            setSettings(cloudSettings as AppSettings);
            saveLocal('sinocalc_settings_local', cloudSettings);
          }
        } catch (e) {
          console.warn('Cloud settings load timed out or failed, using local settings:', e);
        }

        // 5. Load data if authenticated
        if (sessionAuth === 'true') {
          await loadAllData();
        }
      } catch (err) {
        console.error('Failed to initialize:', err);
        setSyncStatus('error');
        setIsInitializing(false);
      }
    }
    initApp();
  }, []);

  // Load batches and debts once authenticated
  const loadAllData = async () => {
    setIsLoadingCloud(true);
    let hasCloudError = false;

    // STEP A: Load local data instantly first
    const localBatches = getLocal<ShipmentBatch[]>('sinocalc_batches_local', []);
    if (localBatches.length > 0) {
      setBatches(localBatches);
      const savedActiveId = localStorage.getItem('sinocalc_active_id');
      const exists = localBatches.some(b => b.id === savedActiveId);
      setActiveBatchId(exists && savedActiveId ? savedActiveId : localBatches[0].id);
    } else {
      const defaultBatch = createNewBatch('Первая поставка из Китая', 1, settings);
      defaultBatch.products = [...sampleProducts];
      setBatches([defaultBatch]);
      setActiveBatchId(defaultBatch.id);
      saveLocal('sinocalc_batches_local', [defaultBatch]);
    }

    const localDebts = getLocal<DebtRecord[]>('sinocalc_debts_local', sampleDebts);
    setDebts(localDebts);

    // STEP B: Fetch from cloud with strict 1.2s timeout
    try {
      const cloudBatches = await withTimeout(loadBatchesFromCloud(), 1200);
      if (cloudBatches && cloudBatches.length > 0) {
        setBatches(cloudBatches as ShipmentBatch[]);
        saveLocal('sinocalc_batches_local', cloudBatches);
        const savedActiveId = localStorage.getItem('sinocalc_active_id');
        const exists = cloudBatches.some(b => b.id === savedActiveId);
        setActiveBatchId(exists && savedActiveId ? savedActiveId : cloudBatches[0].id);
      }
    } catch (err) {
      console.warn('Batches cloud load timed out or failed:', err);
      hasCloudError = true;
    }

    try {
      const cloudDebts = await withTimeout(loadDebtsFromCloud(), 1200);
      if (cloudDebts && cloudDebts.length > 0) {
        setDebts(cloudDebts as DebtRecord[]);
        saveLocal('sinocalc_debts_local', cloudDebts);
      }
    } catch (err) {
      console.warn('Debts cloud load timed out or failed:', err);
      hasCloudError = true;
    }

    setSyncStatus(hasCloudError ? 'error' : 'synced');
    setIsLoadingCloud(false);
  };

  const loadAllBatches = loadAllData;

  // --- DEBT HANDLERS ---
  const handleAddDebt = async (
    newDebtData: Omit<DebtRecord, 'id' | 'createdAt' | 'paidAmount' | 'status' | 'payments'>,
    initialPayment = 0
  ) => {
    const initialPaid = Math.min(newDebtData.totalAmount, initialPayment);
    let status: 'active' | 'partial' | 'paid' = 'active';
    if (initialPaid >= newDebtData.totalAmount) {
      status = 'paid';
    } else if (initialPaid > 0) {
      status = 'partial';
    }

    const payments: DebtPayment[] = initialPaid > 0 ? [{
      id: `pay-${Date.now()}`,
      amount: initialPaid,
      date: new Date().toLocaleDateString('ru-RU'),
      note: 'Первоначальный взнос'
    }] : [];

    const newDebt: DebtRecord = {
      ...newDebtData,
      id: `debt-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      createdAt: new Date().toLocaleDateString('ru-RU'),
      paidAmount: initialPaid,
      status,
      payments
    };

    const updated = [newDebt, ...debts];
    setDebts(updated);
    saveLocal('sinocalc_debts_local', updated);
    try {
      setSyncStatus('saving');
      await saveDebtToCloud(newDebt);
      setSyncStatus('synced');
    } catch (err) {
      console.error('Failed to save debt to cloud:', err);
      setSyncStatus('error');
    }
  };

  const handleUpdateDebt = async (updatedDebt: DebtRecord) => {
    const updated = debts.map(d => d.id === updatedDebt.id ? updatedDebt : d);
    setDebts(updated);
    saveLocal('sinocalc_debts_local', updated);
    try {
      setSyncStatus('saving');
      await saveDebtToCloud(updatedDebt);
      setSyncStatus('synced');
    } catch (err) {
      console.error('Failed to update debt in cloud:', err);
      setSyncStatus('error');
    }
  };

  const performDeleteDebt = async (debtId: string) => {
    const remaining = debts.filter(d => d.id !== debtId);
    setDebts(remaining);
    saveLocal('sinocalc_debts_local', remaining);
    try {
      setSyncStatus('saving');
      await deleteDebtFromCloud(debtId);
      setSyncStatus('synced');
    } catch (err) {
      console.error('Failed to delete debt from cloud:', err);
      setSyncStatus('error');
    }
  };

  const requestDeleteDebt = (debtId: string) => {
    setProtectedProductAction({ type: 'delete_debt', debtId });
    setProductAuthPassword('');
    setProductAuthError('');
  };

  const handleDeleteDebt = async (debtId: string) => {
    requestDeleteDebt(debtId);
  };

  const handleAddPayment = async (debtId: string, amount: number, note?: string) => {
    const debt = debts.find(d => d.id === debtId);
    if (!debt) return;

    const newPaidAmount = Math.min(debt.totalAmount, debt.paidAmount + amount);
    let newStatus: 'active' | 'partial' | 'paid' = 'active';
    if (newPaidAmount >= debt.totalAmount) {
      newStatus = 'paid';
    } else if (newPaidAmount > 0) {
      newStatus = 'partial';
    }

    const newPayment: DebtPayment = {
      id: `pay-${Date.now()}`,
      amount,
      date: new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' }),
      note: note || 'Погашение долга'
    };

    const updatedDebt: DebtRecord = {
      ...debt,
      paidAmount: newPaidAmount,
      status: newStatus,
      payments: [newPayment, ...(debt.payments || [])]
    };

    const updatedList = debts.map(d => d.id === debtId ? updatedDebt : d);
    setDebts(updatedList);

    try {
      setSyncStatus('saving');
      await saveDebtToCloud(updatedDebt);
      setSyncStatus('synced');
    } catch (err) {
      console.error('Failed to record debt payment:', err);
      setSyncStatus('error');
    }
  };

  const handleTransferToDebt = (productName: string, amount: number) => {
    handleAddDebt({
      debtorName: 'Покупатель',
      productName: productName,
      totalAmount: amount,
      currency: activeBatch?.targetCurrency || 'KGS',
      notes: `Перенесено из списка товаров партии: ${activeBatch?.name || 'Китай'}`
    }, 0);
    setActiveTab('debts');
  };

  const handleCompleteSale = async (saleData: {
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
    items?: Array<{
      productId: string;
      productName: string;
      quantity: number;
      priceType: 'wholesale' | 'retail';
      unitPrice: number;
      totalAmount: number;
    }>;
  }) => {
    if (saleData.deductStock && activeBatch) {
      const qtyMap = new Map<string, number>();
      if (saleData.items && saleData.items.length > 0) {
        saleData.items.forEach(item => {
          qtyMap.set(item.productId, (qtyMap.get(item.productId) || 0) + item.quantity);
        });
      } else if (saleData.productId) {
        qtyMap.set(saleData.productId, saleData.quantity);
      }

      const updatedProducts = activeBatch.products.map(p => {
        if (qtyMap.has(p.id)) {
          const deductQty = qtyMap.get(p.id)!;
          const newQty = Math.max(0, p.quantity - deductQty);
          return { ...p, quantity: newQty };
        }
        return p;
      });

      const updatedBatch = {
        ...activeBatch,
        products: updatedProducts
      };

      setBatches(prev => prev.map(b => b.id === activeBatch.id ? updatedBatch : b));
      triggerBatchCloudSave(updatedBatch);
    }

    if (saleData.isDebt && saleData.debtorName) {
      const debtProductName = saleData.items && saleData.items.length > 0
        ? saleData.items.map(i => `${i.productName} (${i.quantity} шт, ${i.priceType === 'wholesale' ? 'Опт' : 'Розница'})`).join(', ')
        : `${saleData.productName} (${saleData.quantity} шт)`;

      await handleAddDebt({
        debtorName: saleData.debtorName,
        phone: saleData.debtorPhone || '',
        debtorPhotoUrl: saleData.debtorPhotoUrl || '',
        productName: debtProductName,
        totalAmount: saleData.totalAmount,
        currency: activeBatch?.targetCurrency || 'KGS',
        notes: `Продажа из партии: ${activeBatch?.name || 'Китай'}`
      }, saleData.initialPayment || 0);
    }
  };


  // --- SAVE OPERATION DEBOUNCING ---
  // Save a batch to the cloud with debouncing to prevent excessive writes while typing
  const triggerBatchCloudSave = (updatedBatch: ShipmentBatch) => {
    setSyncStatus('saving');
    
    // Immediately update local storage cache
    setBatches(prev => {
      const updated = prev.map(b => b.id === updatedBatch.id ? updatedBatch : b);
      saveLocal('sinocalc_batches_local', updated);
      return updated;
    });

    // Clear existing timeout for this batch ID
    if (saveTimeoutRef.current[updatedBatch.id]) {
      clearTimeout(saveTimeoutRef.current[updatedBatch.id]);
    }

    // Set new timeout of 800ms
    saveTimeoutRef.current[updatedBatch.id] = setTimeout(async () => {
      try {
        await saveBatchToCloud(updatedBatch);
        setSyncStatus('synced');
      } catch (err) {
        console.error('Cloud save failed:', err);
        setSyncStatus('error');
      }
    }, 800);
  };

  // --- ACTIONS ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === settings.passwordHash) {
      setIsAuthenticated(true);
      sessionStorage.setItem('sinocalc_authenticated_pro', 'true');
      setAuthError('');
      setPasswordInput('');
      await loadAllBatches();
    } else {
      setAuthError('Неверный пароль. Пожалуйста, попробуйте еще раз.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('sinocalc_authenticated_pro');
    setBatches([]);
    setActiveBatchId('');
  };

  const handlePasswordChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (oldPassword !== settings.passwordHash) {
      setPasswordChangeError('Текущий пароль указан неверно');
      setPasswordChangeSuccess('');
      return;
    }
    if (newPassword.trim().length < 4) {
      setPasswordChangeError('Новый пароль должен содержать не менее 4 символов');
      setPasswordChangeSuccess('');
      return;
    }

    const updatedSettings = {
      ...settings,
      passwordHash: newPassword.trim()
    };

    try {
      setSyncStatus('saving');
      await saveSettingsToCloud(updatedSettings);
      setSettings(updatedSettings);
      setPasswordChangeSuccess('Пароль успешно обновлен в облаке!');
      setPasswordChangeError('');
      setOldPassword('');
      setNewPassword('');
      setSyncStatus('synced');
    } catch (err) {
      setPasswordChangeError('Ошибка при сохранении пароля в облако');
      setSyncStatus('error');
    }
  };

  // Find active batch
  const activeBatch = useMemo(() => {
    return batches.find(b => b.id === activeBatchId) || batches[0] || null;
  }, [batches, activeBatchId]);

  // Set active batch ID and save preference
  const handleSelectBatch = (id: string) => {
    setActiveBatchId(id);
    localStorage.setItem('sinocalc_active_id', id);
  };

  // Update active batch exchange rate
  const handleRateChange = (rateVal: any, rateType: 'USD' | 'KGS' | 'USD_KGS') => {
    if (!activeBatch) return;
    if (activeBatch.isRatesSaved) {
      requestUnlockRates();
      return;
    }
    const rate = parseDecimal(rateVal);
    
    let updatedBatch = { ...activeBatch };
    if (rateType === 'USD') {
      updatedBatch.currencyRateCNYtoUSD = rate;
    } else if (rateType === 'KGS') {
      updatedBatch.currencyRateCNYtoKGS = rate;
      const usdKgs = updatedBatch.currencyRateUSDtoKGS || 88.0;
      if (usdKgs > 0) {
        updatedBatch.currencyRateCNYtoUSD = Number((rate / usdKgs).toFixed(4));
      }
    } else if (rateType === 'USD_KGS') {
      updatedBatch.currencyRateUSDtoKGS = rate;
      const cnyKgs = updatedBatch.currencyRateCNYtoKGS || 13.2;
      if (rate > 0) {
        updatedBatch.currencyRateCNYtoUSD = Number((cnyKgs / rate).toFixed(4));
      }
    }

    setBatches(prev => prev.map(b => b.id === activeBatch.id ? updatedBatch : b));
    triggerBatchCloudSave(updatedBatch);
  };

  // Lock & save exchange rates for batch
  const handleSaveRates = () => {
    if (!activeBatch) return;
    const updatedBatch = {
      ...activeBatch,
      isRatesSaved: true
    };
    setBatches(prev => prev.map(b => b.id === activeBatch.id ? updatedBatch : b));
    triggerBatchCloudSave(updatedBatch);
    setSaveToastMessage('Курсы валют партии сохранены и заблокированы');
    setTimeout(() => setSaveToastMessage(null), 3000);
  };

  const handleUnlockRates = () => {
    if (!activeBatch) return;
    const updatedBatch = {
      ...activeBatch,
      isRatesSaved: false
    };
    setBatches(prev => prev.map(b => b.id === activeBatch.id ? updatedBatch : b));
    triggerBatchCloudSave(updatedBatch);
  };

  const requestUnlockRates = () => {
    if (!activeBatch) return;
    setProtectedProductAction({ type: 'unlock_rates' });
    setProductAuthPassword('');
    setProductAuthError('');
  };

  // Manual save all action for explicit "Сохранить" button
  const handleManualSaveAll = async () => {
    setSyncStatus('saving');
    try {
      saveLocal('sinocalc_batches_local', batches);
      saveLocal('sinocalc_settings_local', settings);
      saveLocal('sinocalc_debts_local', debts);

      if (activeBatch) {
        await saveBatchToCloud(activeBatch);
      }
      await saveSettingsToCloud(settings);

      setSyncStatus('synced');
      setSaveToastMessage('✓ Данные успешно сохранены локально и в облаке!');
      setTimeout(() => setSaveToastMessage(null), 3500);
    } catch (err) {
      console.error('Save error:', err);
      setSyncStatus('synced');
      setSaveToastMessage('✓ Данные сохранены в памяти браузера!');
      setTimeout(() => setSaveToastMessage(null), 3500);
    }
  };

  // Switch target currency for active batch
  const handleTargetCurrencyChange = (currency: 'USD' | 'KGS') => {
    if (!activeBatch) return;
    if (activeBatch.isRatesSaved) {
      requestUnlockRates();
      return;
    }
    
    const updatedBatch: ShipmentBatch = {
      ...activeBatch,
      targetCurrency: currency
    };

    setBatches(prev => prev.map(b => b.id === activeBatch.id ? updatedBatch : b));
    triggerBatchCloudSave(updatedBatch);
  };

  // Modify any product field (intercepts if product is locked/saved)
  const handleProductChange = (productId: string, field: keyof Product, value: any) => {
    if (!activeBatch) return;

    const targetProd = activeBatch.products.find(p => p.id === productId);
    if (targetProd?.isSaved && field !== 'isSaved') {
      requestUnlockProduct(targetProd);
      return;
    }

    let processedVal = value;
    if (['priceCNY', 'weight', 'deliveryValue', 'wholesalePriceUSD', 'retailPriceUSD'].includes(field as string)) {
      processedVal = parseDecimal(value);
    } else if (field === 'quantity') {
      processedVal = parseInt(String(value).replace(',', '.'), 10) || 1;
    }

    const updatedProducts = activeBatch.products.map(p => {
      if (p.id === productId) {
        if (field === 'deliveryMode' && value === 'weight') {
          return { ...p, deliveryMode: value, deliveryCurrency: 'USD' };
        }
        return { ...p, [field]: processedVal };
      }
      return p;
    });

    const updatedBatch = {
      ...activeBatch,
      products: updatedProducts
    };

    setBatches(prev => prev.map(b => b.id === activeBatch.id ? updatedBatch : b));
    triggerBatchCloudSave(updatedBatch);
  };

  // Upload and compress product image
  const handleProductPhotoUpload = (productId: string, file: File) => {
    if (!file || !activeBatch) return;
    const targetProd = activeBatch.products.find(p => p.id === productId);
    if (targetProd?.isSaved) {
      requestUnlockProduct(targetProd);
      return;
    }
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
        handleProductChange(productId, 'imageUrl', compressedDataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Save and lock product from editing
  const handleSaveProduct = (productId: string) => {
    if (!activeBatch) return;

    const updatedProducts = activeBatch.products.map(p => {
      if (p.id === productId) {
        return { ...p, isSaved: true };
      }
      return p;
    });

    const updatedBatch = {
      ...activeBatch,
      products: updatedProducts
    };

    setBatches(prev => prev.map(b => b.id === activeBatch.id ? updatedBatch : b));
    triggerBatchCloudSave(updatedBatch);
    setSaveToastMessage('Товар сохранен и заблокирован от изменений');
    setTimeout(() => setSaveToastMessage(null), 3000);
  };

  const handleSaveAllProducts = () => {
    if (!activeBatch || activeBatch.products.length === 0) return;

    const updatedProducts = activeBatch.products.map(p => ({ ...p, isSaved: true }));

    const updatedBatch = {
      ...activeBatch,
      products: updatedProducts
    };

    setBatches(prev => prev.map(b => b.id === activeBatch.id ? updatedBatch : b));
    triggerBatchCloudSave(updatedBatch);
    setSaveToastMessage('Все товары сохранены и заблокированы');
    setTimeout(() => setSaveToastMessage(null), 3000);
  };

  // Internal deletion functions after password check
  const performDeleteProduct = (productId: string) => {
    if (!activeBatch) return;
    const updatedProducts = activeBatch.products.filter(p => p.id !== productId);
    const updatedBatch = { ...activeBatch, products: updatedProducts };
    setBatches(prev => prev.map(b => b.id === activeBatch.id ? updatedBatch : b));
    triggerBatchCloudSave(updatedBatch);
  };

  const performClearProducts = () => {
    if (!activeBatch) return;
    const updatedBatch = { ...activeBatch, products: [] };
    setBatches(prev => prev.map(b => b.id === activeBatch.id ? updatedBatch : b));
    triggerBatchCloudSave(updatedBatch);
  };

  const performDeleteBatch = async (batchId: string) => {
    if (batches.length <= 1) {
      alert('Нельзя удалить последнюю оставшуюся партию.');
      return;
    }
    const remaining = batches.filter(b => b.id !== batchId);
    setBatches(remaining);
    saveLocal('sinocalc_batches_local', remaining);
    
    if (activeBatchId === batchId) {
      const nextId = remaining[0].id;
      setActiveBatchId(nextId);
      localStorage.setItem('sinocalc_active_id', nextId);
    }

    try {
      setSyncStatus('saving');
      await deleteBatchFromCloud(batchId);
      setSyncStatus('synced');
    } catch (err) {
      console.error('Error deleting batch from cloud:', err);
      setSyncStatus('error');
    }
  };

  // Request password for deletion / unlock actions
  const requestUnlockProduct = (p: Product) => {
    setProtectedProductAction({ type: 'unlock', product: p });
    setProductAuthPassword('');
    setProductAuthError('');
  };

  const requestDeleteProduct = (p: Product) => {
    setProtectedProductAction({ type: 'delete', product: p });
    setProductAuthPassword('');
    setProductAuthError('');
  };

  const requestClearProducts = () => {
    if (!activeBatch || activeBatch.products.length === 0) return;
    setProtectedProductAction({ type: 'clear_all' });
    setProductAuthPassword('');
    setProductAuthError('');
  };

  const requestDeleteBatch = (batchId: string) => {
    if (batches.length <= 1) {
      alert('Нельзя удалить последнюю оставшуюся партию.');
      return;
    }
    setProtectedProductAction({ type: 'delete_batch', batchId });
    setProductAuthPassword('');
    setProductAuthError('');
  };

  const requestRestoreBackup = (parsedData: any) => {
    setProtectedProductAction({ type: 'restore_backup', backupData: parsedData });
    setProductAuthPassword('');
    setProductAuthError('');
  };

  const performRestoreBackup = async (parsed: any) => {
    if (!parsed || !Array.isArray(parsed.batches)) return;
    setSyncStatus('saving');
    setBatches(parsed.batches);
    if (parsed.batches.length > 0) {
      setActiveBatchId(parsed.batches[0].id);
    }
    if (Array.isArray(parsed.debts)) {
      setDebts(parsed.debts);
      for (const d of parsed.debts) {
        await saveDebtToCloud(d);
      }
    }
    if (parsed.settings) {
      setSettings(parsed.settings);
      await saveSettingsToCloud(parsed.settings);
    }
    for (const batch of parsed.batches) {
      await saveBatchToCloud(batch);
    }
    setSyncStatus('synced');
    setSaveToastMessage('Данные успешно импортированы и сохранены в облако!');
    setTimeout(() => setSaveToastMessage(null), 3500);
  };

  const handleConfirmProductAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (productAuthPassword.trim() === settings.passwordHash) {
      if (!protectedProductAction) return;

      if (protectedProductAction.type === 'delete' && protectedProductAction.product) {
        performDeleteProduct(protectedProductAction.product.id);
        setSaveToastMessage(`Товар "${protectedProductAction.product.name}" удален`);
      } else if (protectedProductAction.type === 'unlock' && protectedProductAction.product) {
        handleUnlockProduct(protectedProductAction.product.id);
        setSaveToastMessage(`Товар "${protectedProductAction.product.name}" разблокирован`);
      } else if (protectedProductAction.type === 'clear_all') {
        performClearProducts();
        setSaveToastMessage('Все товары в партии очищены');
      } else if (protectedProductAction.type === 'delete_batch' && protectedProductAction.batchId) {
        performDeleteBatch(protectedProductAction.batchId);
        setSaveToastMessage('Партия удалена');
      } else if (protectedProductAction.type === 'delete_debt' && protectedProductAction.debtId) {
        performDeleteDebt(protectedProductAction.debtId);
        setSaveToastMessage('Запись о долге удалена');
      } else if (protectedProductAction.type === 'restore_backup' && protectedProductAction.backupData) {
        performRestoreBackup(protectedProductAction.backupData);
      } else if (protectedProductAction.type === 'unlock_rates') {
        handleUnlockRates();
        setSaveToastMessage('Курсы валют разблокированы');
      }

      setProtectedProductAction(null);
      setProductAuthPassword('');
      setProductAuthError('');
      setTimeout(() => setSaveToastMessage(null), 3000);
    } else {
      setProductAuthError('Неверный пароль. В действии отказано.');
    }
  };

  const handleUnlockProduct = (productId: string) => {
    if (!activeBatch) return;

    const updatedProducts = activeBatch.products.map(p => {
      if (p.id === productId) {
        return { ...p, isSaved: false };
      }
      return p;
    });

    const updatedBatch = {
      ...activeBatch,
      products: updatedProducts
    };

    setBatches(prev => prev.map(b => b.id === activeBatch.id ? updatedBatch : b));
    triggerBatchCloudSave(updatedBatch);
  };

  // Add new blank product
  const handleAddProduct = () => {
    if (!activeBatch) return;

    const newProduct: Product = {
      id: `prod-${Date.now()}-${activeBatch.products.length}`,
      name: `Товар #${activeBatch.products.length + 1}`,
      priceCNY: 0,
      weight: 0,
      quantity: 1,
      deliveryMode: 'flat',
      deliveryValue: 0,
      wholesalePriceUSD: 0,
      retailPriceUSD: 0,
      isSaved: false
    };

    const updatedBatch = {
      ...activeBatch,
      products: [...activeBatch.products, newProduct]
    };

    setBatches(prev => prev.map(b => b.id === activeBatch.id ? updatedBatch : b));
    triggerBatchCloudSave(updatedBatch);
  };

  // Create new shipment batch
  const handleAddBatch = async () => {
    const name = `Партия #${batches.length + 1} (${new Date().toLocaleDateString('ru-RU', { month: 'short', year: 'numeric' })})`;
    const newBatch = createNewBatch(name, batches.length + 1, settings);
    const updated = [...batches, newBatch];
    
    setBatches(updated);
    saveLocal('sinocalc_batches_local', updated);
    setActiveBatchId(newBatch.id);
    localStorage.setItem('sinocalc_active_id', newBatch.id);

    try {
      setSyncStatus('saving');
      await saveBatchToCloud(newBatch);
      setSyncStatus('synced');
      setActiveTab('calc');
    } catch (err) {
      console.error('Error adding batch to cloud:', err);
      setSyncStatus('error');
    }
  };

  // Delete batch entirely
  const handleDeleteBatch = async (batchId: string) => {
    requestDeleteBatch(batchId);
  };

  // Start editing batch name
  const startEditingBatchName = (batch: ShipmentBatch) => {
    setEditingBatchNameId(batch.id);
    setBatchNameInput(batch.name);
  };

  // Save batch name to state & cloud
  const saveBatchName = async (batchId: string) => {
    if (batchNameInput.trim()) {
      const updatedBatches = batches.map(b => {
        if (b.id === batchId) {
          const updated = { ...b, name: batchNameInput.trim() };
          // Save updated to cloud
          saveBatchToCloud(updated);
          return updated;
        }
        return b;
      });
      setBatches(updatedBatches);
    }
    setEditingBatchNameId(null);
  };

  // Load samples into active batch
  const handleLoadSamples = () => {
    if (!activeBatch) return;
    if (confirm('Добавить готовые примеры товаров из Китая в текущую партию?')) {
      const updatedProducts = [
        ...activeBatch.products,
        ...JSON.parse(JSON.stringify(sampleProducts)).map((p: any) => ({
          ...p,
          id: `prod-demo-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
        }))
      ];

      const updatedBatch = {
        ...activeBatch,
        products: updatedProducts
      };

      setBatches(prev => prev.map(b => b.id === activeBatch.id ? updatedBatch : b));
      triggerBatchCloudSave(updatedBatch);
    }
  };

  // Empty all products
  const handleClearProducts = () => {
    requestClearProducts();
  };

  // Manual trigger to pull fresh data from cloud
  const handleRefreshData = async () => {
    await loadAllBatches();
  };

  // Export entire app data as a JSON backup file
  const handleExportData = () => {
    try {
      const backupData = {
        version: '1.1',
        batches,
        debts,
        settings
      };
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `sinocalc_backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      console.error('Failed to export backup:', err);
      alert('Не удалось экспортировать резервную копию');
    }
  };

  // Import app data from a JSON backup file
  const handleImportData = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && Array.isArray(parsed.batches)) {
          requestRestoreBackup(parsed);
        } else {
          alert('Неверный формат файла резервной копии.');
        }
      } catch (err) {
        console.error('Failed to import backup:', err);
        alert('Ошибка при чтении файла резервной копии');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };


  // --- CORE CALCULATIONS ENGINE ---
  const calculations = useMemo(() => {
    if (!activeBatch) return {
      productsCalculated: [],
      totalPurchaseCNY: 0,
      totalPurchaseConverted: 0,
      totalDeliveryUSD: 0,
      totalDeliveryConverted: 0,
      totalInvestedConverted: 0,
      totalWeight: 0,
      totalQuantity: 0,
      wholesaleTotalRevenue: 0,
      wholesaleProfit: 0,
      wholesaleROI: 0,
      retailTotalRevenue: 0,
      retailProfit: 0,
      retailROI: 0,
      currencySymbol: 'сом'
    };

    const rateCNYtoUSD = activeBatch.currencyRateCNYtoUSD || 0.15;
    const rateCNYtoKGS = activeBatch.currencyRateCNYtoKGS || 13.2;
    const rateUSDtoKGS = activeBatch.currencyRateUSDtoKGS || 88.0;

    const rate = activeBatch.targetCurrency === 'USD' 
      ? rateCNYtoUSD 
      : rateCNYtoKGS;
    
    const currencySymbol = activeBatch.targetCurrency === 'USD' ? '$' : 'сом';

    let totalPurchaseCNY = 0;
    let totalDeliveryConverted = 0;
    let totalWeight = 0;
    let totalQuantity = 0;

    let wholesaleTotalRevenue = 0;
    let retailTotalRevenue = 0;

    const productsCalculated = activeBatch.products.map(p => {
      const priceCNY = Number(p.priceCNY) || 0;
      const weight = Number(p.weight) || 0;
      const quantity = Number(p.quantity) || 1;
      const deliveryValue = Number(p.deliveryValue) || 0;
      const delCurrency = p.deliveryCurrency || (p.deliveryMode === 'weight' ? 'USD' : activeBatch.targetCurrency);

      // Base production cost in Target Currency (USD or KGS)
      const itemPriceConverted = priceCNY * rate;
      
      // Calculate delivery value converted to target currency
      let deliveryValueInTargetCurrency = deliveryValue;
      if (activeBatch.targetCurrency === 'KGS') {
        if (delCurrency === 'USD') {
          deliveryValueInTargetCurrency = deliveryValue * rateUSDtoKGS;
        }
      } else if (activeBatch.targetCurrency === 'USD') {
        if (delCurrency === 'KGS') {
          deliveryValueInTargetCurrency = rateUSDtoKGS > 0 ? deliveryValue / rateUSDtoKGS : deliveryValue;
        }
      }

      // Delivery calculation in Target Currency
      let itemDeliveryConverted = 0;
      if (p.deliveryMode === 'flat') {
        itemDeliveryConverted = deliveryValueInTargetCurrency; // delivery per unit
      } else if (p.deliveryMode === 'total') {
        itemDeliveryConverted = quantity > 0 ? (deliveryValueInTargetCurrency / quantity) : 0; // split total among quantity
      } else if (p.deliveryMode === 'weight') {
        itemDeliveryConverted = weight * deliveryValueInTargetCurrency; // rate per kg
      }

      // Landed unit cost (Landed Cost = Item price in target currency + allocated delivery cost)
      const landedUnitCost = itemPriceConverted + itemDeliveryConverted;

      // Position totals
      const totalItemPurchaseConverted = itemPriceConverted * quantity;
      const totalItemDeliveryConverted = itemDeliveryConverted * quantity;
      const totalItemLandedCost = landedUnitCost * quantity;

      // Revenue and margin
      const wholesalePrice = Number(p.wholesalePriceUSD) || 0;
      const retailPrice = Number(p.retailPriceUSD) || 0;

      const positionWholesaleRevenue = wholesalePrice * quantity;
      const positionRetailRevenue = retailPrice * quantity;

      const positionWholesaleProfit = positionWholesaleRevenue - totalItemLandedCost;
      const positionRetailProfit = positionRetailRevenue - totalItemLandedCost;

      // Accumulators
      totalPurchaseCNY += priceCNY * quantity;
      totalDeliveryConverted += totalItemDeliveryConverted;
      totalWeight += weight * quantity;
      totalQuantity += quantity;
      wholesaleTotalRevenue += positionWholesaleRevenue;
      retailTotalRevenue += positionRetailRevenue;

      return {
        ...p,
        priceCNY,
        weight,
        quantity,
        deliveryValue,
        itemPriceConverted,
        itemDeliveryConverted,
        landedUnitCost,
        totalItemLandedCost,
        wholesalePrice,
        retailPrice,
        positionWholesaleRevenue,
        positionRetailRevenue,
        positionWholesaleProfit,
        positionRetailProfit
      };
    });

    const totalPurchaseConverted = totalPurchaseCNY * rate;
    const totalInvestedConverted = totalPurchaseConverted + totalDeliveryConverted;

    const wholesaleProfit = wholesaleTotalRevenue - totalInvestedConverted;
    const retailProfit = retailTotalRevenue - totalInvestedConverted;

    const wholesaleROI = totalInvestedConverted > 0 ? (wholesaleProfit / totalInvestedConverted) * 100 : 0;
    const retailROI = totalInvestedConverted > 0 ? (retailProfit / totalInvestedConverted) * 100 : 0;

    return {
      productsCalculated,
      totalPurchaseCNY,
      totalPurchaseConverted,
      totalDeliveryUSD: totalDeliveryConverted, // Delivery is direct in target currency
      totalDeliveryConverted,
      totalInvestedConverted,
      totalWeight,
      totalQuantity,
      wholesaleTotalRevenue,
      wholesaleProfit,
      wholesaleROI,
      retailTotalRevenue,
      retailProfit,
      retailROI,
      currencySymbol
    };
  }, [activeBatch]);

  // --- INITIALIZING LOADER ---
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-slate-200 font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center font-bold text-white text-xl shadow-lg shadow-blue-500/20 animate-pulse">
            S
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
            <span>Подключение к облаку SinoCalc...</span>
          </div>
        </div>
      </div>
    );
  }

  // --- PASSWORD LOCK SCREEN ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans text-slate-200">
        <div className="absolute top-4 right-4 flex items-center gap-2 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800 text-xs text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Облачная База: Активна</span>
        </div>

        <div className="w-full max-w-md bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl shadow-blue-900/15 transition-all">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center font-bold text-white text-2xl shadow-lg shadow-blue-500/25 mb-4">
              S
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-white mb-1">
              SinoCalc <span className="text-blue-500 font-normal">Cloud</span>
            </h1>
            <p className="text-slate-400 text-xs text-center px-4 leading-relaxed mt-1">
              Учет и калькуляция товаров из Китая. Данные синхронизированы для ноутбука и телефона.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Введите пароль для авторизации
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  id="pwd-input"
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="•••••"
                  className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-900 rounded-xl outline-none text-white font-mono text-center tracking-widest placeholder:tracking-normal text-sm transition-all"
                  autoFocus
                />
              </div>
              {authError && (
                <p className="text-red-400 text-xs mt-2.5 flex items-center gap-1.5 justify-center">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  {authError}
                </p>
              )}
            </div>

            <button
              id="submit-auth"
              type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 active:translate-y-[1px] text-white font-bold rounded-xl shadow-lg shadow-blue-600/15 transition-all text-xs tracking-wider uppercase"
            >
              Войти на склад
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-800/80 text-center">
            <div className="inline-block px-4 py-2.5 bg-slate-950/40 rounded-xl border border-slate-800/50 text-xs text-slate-400 leading-relaxed">
              💡 Пароль по умолчанию: <span className="font-mono text-blue-400 font-bold">12345</span>
              <p className="text-[9px] text-slate-500 mt-0.5">Данные сохраняются в облаке и будут доступны везде!</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 font-sans text-slate-200 antialiased">
      
      {/* 1. HEADER */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/75 backdrop-blur-md flex items-center justify-between px-4 sm:px-8 flex-shrink-0 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white shadow-md shadow-blue-500/15">S</div>
          <div>
            <h1 className="text-base sm:text-lg font-semibold tracking-tight text-white flex items-center gap-1.5">
              SinoCalc <span className="text-blue-500 font-normal">Pro</span>
            </h1>
            <p className="text-[9px] text-slate-500 tracking-wider uppercase font-bold -mt-0.5 hidden sm:block">
              Учет поставок из Китая • сом & $
            </p>
          </div>
        </div>

        {/* Sync Indicator */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-slate-950 rounded-xl border border-slate-800/80">
            {syncStatus === 'saving' && (
              <>
                <RefreshCw className="w-3 h-3 text-amber-400 animate-spin" />
                <span className="text-[10px] text-amber-400 font-mono">Сохранение...</span>
              </>
            )}
            {syncStatus === 'synced' && (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[10px] text-emerald-400 font-mono">Синхронизировано</span>
              </>
            )}
            {syncStatus === 'error' && (
              <button
                onClick={() => setShowSyncHelpModal(true)}
                className="flex items-center gap-1.5 hover:bg-slate-900 px-1 py-0.5 rounded transition-colors text-amber-400"
                title="Нажмите для подробностей о сохранении"
              >
                <AlertCircle className="w-3 h-3 text-amber-400" />
                <span className="text-[10px] font-mono underline decoration-dashed">Локально (Ошибка сети)</span>
              </button>
            )}
            <button 
              onClick={handleRefreshData}
              title="Принудительно обновить из облака"
              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded ml-1 transition-colors"
            >
              <RefreshCw className="w-2.5 h-2.5" />
            </button>
          </div>

          {/* Desktop Nav tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={handleManualSaveAll}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs uppercase tracking-wide flex items-center gap-1.5 shadow-md shadow-emerald-950/40 transition-all active:scale-95 mr-1"
              title="Сохранить все данные в памяти браузера и в облаке"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Сохранить</span>
            </button>
            <button
              onClick={() => setShowSellProductModal(true)}
              className="px-3.5 py-1.5 bg-emerald-700/80 hover:bg-emerald-600 text-white font-bold rounded-lg text-xs uppercase tracking-wide flex items-center gap-1.5 shadow-md shadow-emerald-950/40 transition-all mr-1"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Продажа</span>
            </button>
            <button
              onClick={() => setActiveTab('calc')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold tracking-wide uppercase transition-all ${
                activeTab === 'calc' 
                  ? 'bg-blue-600 text-white shadow' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              Склад
            </button>
            <button
              onClick={() => setActiveTab('shipments')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold tracking-wide uppercase transition-all ${
                activeTab === 'shipments' 
                  ? 'bg-blue-600 text-white shadow' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              Партии ({batches.length})
            </button>
            <button
              onClick={() => setActiveTab('debts')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold tracking-wide uppercase transition-all flex items-center gap-1.5 ${
                activeTab === 'debts' 
                  ? 'bg-amber-600 text-white shadow' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <span>Долги</span>
              {activeDebtsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-red-500 text-white text-[10px] font-bold font-mono">
                  {activeDebtsCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setShowAnalyticsModal(true)}
              className="px-3.5 py-1.5 bg-blue-950/60 hover:bg-blue-900/80 text-blue-300 font-bold rounded-lg text-xs uppercase tracking-wide flex items-center gap-1.5 transition-all border border-blue-800/80 shadow"
            >
              <BarChart3 className="w-3.5 h-3.5 text-blue-400" />
              <span>Аналитика</span>
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold tracking-wide uppercase transition-all ${
                activeTab === 'settings' 
                  ? 'bg-blue-600 text-white shadow' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              Настройки
            </button>
          </nav>

          <div className="h-8 w-[1px] bg-slate-800 hidden md:block"></div>

          {/* Log out */}
          <button 
            onClick={handleLogout}
            title="Выйти из аккаунта"
            className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800/60 rounded-xl border border-slate-800 transition-all active:scale-95"
          >
            <LogOut className="w-4 h-4" />
          </button>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl border border-slate-800"
          >
            <Layers className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Mobile menu dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-slate-900 border-b border-slate-800 p-4 space-y-2 flex flex-col z-30">
          <div className="flex items-center justify-between px-2 pb-2 border-b border-slate-800 text-xs">
            <span className="text-slate-400">Статус сети:</span>
            {syncStatus === 'saving' && <span className="text-amber-400">● Сохранение...</span>}
            {syncStatus === 'synced' && <span className="text-emerald-400">● Синхронизировано</span>}
            {syncStatus === 'error' && <span className="text-red-400">● Ошибка подключения</span>}
          </div>
          <button
            onClick={() => { handleManualSaveAll(); setIsMobileMenuOpen(false); }}
            className="w-full py-3 px-4 rounded-xl text-left text-sm font-bold flex items-center justify-between bg-emerald-600 text-white shadow-lg shadow-emerald-950/50"
          >
            <span className="flex items-center gap-2">
              <Save className="w-4 h-4" />
              <span>💾 Сохранить все изменения</span>
            </span>
          </button>
          <button
            onClick={() => { setShowSellProductModal(true); setIsMobileMenuOpen(false); }}
            className="w-full py-3 px-4 rounded-xl text-left text-sm font-bold flex items-center justify-between bg-emerald-700/80 text-white shadow-lg"
          >
            <span className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" />
              <span>🛒 Окно Продажи (Опт / Розница)</span>
            </span>
          </button>
          <button
            onClick={() => { setActiveTab('calc'); setIsMobileMenuOpen(false); }}
            className={`w-full py-3 px-4 rounded-xl text-left text-sm font-semibold flex items-center justify-between ${
              activeTab === 'calc' ? 'bg-blue-600 text-white' : 'text-slate-300 bg-slate-950/40'
            }`}
          >
            <span>📦 Склад и Таблица</span>
            {activeTab === 'calc' && <Check className="w-4 h-4" />}
          </button>
          <button
            onClick={() => { setActiveTab('shipments'); setIsMobileMenuOpen(false); }}
            className={`w-full py-3 px-4 rounded-xl text-left text-sm font-semibold flex items-center justify-between ${
              activeTab === 'shipments' ? 'bg-blue-600 text-white' : 'text-slate-300 bg-slate-950/40'
            }`}
          >
            <span>🚢 Все Партии ({batches.length})</span>
            {activeTab === 'shipments' && <Check className="w-4 h-4" />}
          </button>
          <button
            onClick={() => { setActiveTab('debts'); setIsMobileMenuOpen(false); }}
            className={`w-full py-3 px-4 rounded-xl text-left text-sm font-semibold flex items-center justify-between ${
              activeTab === 'debts' ? 'bg-amber-600 text-white' : 'text-slate-300 bg-slate-950/40'
            }`}
          >
            <span className="flex items-center gap-2">
              <span>💳 Окно Долгов и Дебиторки</span>
              {activeDebtsCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-xs font-bold font-mono">
                  {activeDebtsCount}
                </span>
              )}
            </span>
            {activeTab === 'debts' && <Check className="w-4 h-4" />}
          </button>
          <button
            onClick={() => { setShowAnalyticsModal(true); setIsMobileMenuOpen(false); }}
            className="w-full py-3 px-4 rounded-xl text-left text-sm font-semibold flex items-center justify-between text-blue-300 bg-blue-950/40 border border-blue-900/40"
          >
            <span>📊 Окно отчёта Аналитика</span>
            <BarChart3 className="w-4 h-4 text-blue-400" />
          </button>
          <button
            onClick={() => { setActiveTab('settings'); setIsMobileMenuOpen(false); }}
            className={`w-full py-3 px-4 rounded-xl text-left text-sm font-semibold flex items-center justify-between ${
              activeTab === 'settings' ? 'bg-blue-600 text-white' : 'text-slate-300 bg-slate-950/40'
            }`}
          >
            <span>⚙️ Настройки и Пароль</span>
            {activeTab === 'settings' && <Check className="w-4 h-4" />}
          </button>
        </div>
      )}


      {/* 2. MAIN WORKSPACE */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* SIDEBAR */}
        <aside className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-slate-800 p-5 flex flex-col gap-5 flex-shrink-0 bg-slate-900/10 lg:overflow-y-auto">
          
          {/* Section: Exchange Rates */}
          <section className="bg-slate-900/40 p-4 rounded-2xl border border-slate-800/80">
            <h3 className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-3 font-bold flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span>Курсы Валют ($ / ¥ / сом)</span>
                {activeBatch?.isRatesSaved && (
                  <span className="text-[9px] font-semibold text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                    Защищено
                  </span>
                )}
              </span>
              <Coins className="w-3.5 h-3.5 text-amber-400" />
            </h3>
            
            <div className="space-y-3.5">
              {/* USD to KGS input (Доллар на Сом) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="sidebar-rate-usd-kgs" className="block text-[10px] text-slate-400 font-mono">1 USD ($) в сом (KGS)</label>
                  <span className="text-[9px] font-mono text-amber-400 font-bold bg-amber-500/10 px-1 rounded border border-amber-500/20">$ → сом</span>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 text-xs font-mono">с.</span>
                  <input
                    id="sidebar-rate-usd-kgs"
                    type="text"
                    inputMode="decimal"
                    readOnly={activeBatch?.isRatesSaved}
                    onClick={activeBatch?.isRatesSaved ? requestUnlockRates : undefined}
                    value={activeBatch?.currencyRateUSDtoKGS ?? 88.0}
                    onChange={(e) => handleRateChange(e.target.value, 'USD_KGS')}
                    className={`w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-lg py-1.5 pl-7 pr-3 text-sm font-mono text-amber-400 font-bold outline-none ${
                      activeBatch?.isRatesSaved ? 'cursor-pointer opacity-90 hover:bg-slate-900/60' : ''
                    }`}
                  />
                </div>
              </div>

              {/* CNY to KGS input (Юань на Сом) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="sidebar-rate-kgs" className="block text-[10px] text-slate-400 font-mono">1 CNY (¥) в сом (KGS)</label>
                  <span className="text-[9px] font-mono text-purple-400 font-bold bg-purple-500/10 px-1 rounded border border-purple-500/20">¥ → сом</span>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 text-xs font-mono">с.</span>
                  <input
                    id="sidebar-rate-kgs"
                    type="text"
                    inputMode="decimal"
                    readOnly={activeBatch?.isRatesSaved}
                    onClick={activeBatch?.isRatesSaved ? requestUnlockRates : undefined}
                    value={activeBatch?.currencyRateCNYtoKGS ?? 13.2}
                    onChange={(e) => handleRateChange(e.target.value, 'KGS')}
                    className={`w-full bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-lg py-1.5 pl-7 pr-3 text-sm font-mono text-purple-400 font-bold outline-none ${
                      activeBatch?.isRatesSaved ? 'cursor-pointer opacity-90 hover:bg-slate-900/60' : ''
                    }`}
                  />
                </div>
              </div>

              {/* CNY to USD input (Юань на Доллар) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="sidebar-rate-usd" className="block text-[10px] text-slate-400 font-mono">1 CNY (¥) в USD ($)</label>
                  <span className="text-[9px] font-mono text-blue-400 font-bold bg-blue-500/10 px-1 rounded border border-blue-500/20">¥ → $</span>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 text-xs font-mono">$</span>
                  <input
                    id="sidebar-rate-usd"
                    type="text"
                    inputMode="decimal"
                    readOnly={activeBatch?.isRatesSaved}
                    onClick={activeBatch?.isRatesSaved ? requestUnlockRates : undefined}
                    value={activeBatch?.currencyRateCNYtoUSD ?? 0.15}
                    onChange={(e) => handleRateChange(e.target.value, 'USD')}
                    className={`w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg py-1.5 pl-7 pr-3 text-sm font-mono text-blue-400 outline-none ${
                      activeBatch?.isRatesSaved ? 'cursor-pointer opacity-90 hover:bg-slate-900/60' : ''
                    }`}
                  />
                </div>
              </div>

              {/* Target currency switcher */}
              <div>
                <label className="block text-[10px] text-slate-400 mb-1.5 font-mono uppercase">Расчетная валюта</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    disabled={activeBatch?.isRatesSaved}
                    onClick={() => handleTargetCurrencyChange('USD')}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                      activeBatch?.targetCurrency === 'USD'
                        ? 'bg-blue-600/95 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    } ${activeBatch?.isRatesSaved ? 'opacity-80 cursor-not-allowed' : ''}`}
                  >
                    USD ($)
                  </button>
                  <button
                    disabled={activeBatch?.isRatesSaved}
                    onClick={() => handleTargetCurrencyChange('KGS')}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                      activeBatch?.targetCurrency === 'KGS'
                        ? 'bg-purple-600/95 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    } ${activeBatch?.isRatesSaved ? 'opacity-80 cursor-not-allowed' : ''}`}
                  >
                    KGS (сом)
                  </button>
                </div>
              </div>

              {/* Save / Lock Rates Button */}
              {activeBatch && (
                <div>
                  {!activeBatch.isRatesSaved ? (
                    <button
                      type="button"
                      onClick={handleSaveRates}
                      className="w-full mt-1.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95 border border-emerald-500/40"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Сохранить курсы партии</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={requestUnlockRates}
                      className="w-full mt-1.5 py-2 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-800/60 text-amber-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95"
                    >
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Курсы заблокированы (Разблокировать)</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* Section: Shipment Selection */}
          <section className="bg-slate-900/40 p-4 rounded-2xl border border-slate-800/80">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                <span>Все партии товаров</span>
              </h3>
              <button
                onClick={handleAddBatch}
                title="Добавить новую партию"
                className="p-1 hover:bg-slate-800 text-blue-400 hover:text-blue-300 rounded-lg transition-colors border border-slate-800/50"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {batches.map(b => (
                <div 
                  key={b.id} 
                  className={`group flex items-center justify-between p-2 rounded-xl border transition-all ${
                    b.id === activeBatch?.id 
                      ? 'bg-blue-950/20 border-blue-800/80 text-white font-medium' 
                      : 'bg-slate-950/20 border-slate-800/60 text-slate-400 hover:bg-slate-900/40 hover:text-slate-200'
                  }`}
                >
                  {editingBatchNameId === b.id ? (
                    <input
                      type="text"
                      value={batchNameInput}
                      onChange={(e) => setBatchNameInput(e.target.value)}
                      onBlur={() => saveBatchName(b.id)}
                      onKeyDown={(e) => e.key === 'Enter' && saveBatchName(b.id)}
                      className="flex-1 bg-slate-950 border border-blue-500 text-xs rounded px-1.5 py-0.5 text-white font-medium focus:outline-none"
                      autoFocus
                    />
                  ) : (
                    <button
                      onClick={() => handleSelectBatch(b.id)}
                      className="flex-1 text-left text-xs truncate pr-2"
                    >
                      {b.name}
                    </button>
                  )}

                  <div className="flex items-center gap-1 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => startEditingBatchName(b)}
                      title="Переименовать партию"
                      className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                    {batches.length > 1 && (
                      <button
                        onClick={() => requestDeleteBatch(b.id)}
                        title="Удалить партию"
                        className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-red-400"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Backup & useful tips section */}
          <section className="mt-auto space-y-3 pt-4 border-t border-slate-800/80 hidden lg:block">
            <button
              onClick={handleExportData}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold rounded-xl border border-slate-800 flex items-center justify-center gap-2 transition-all"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              <span>Скачать резервную копию</span>
            </button>
            
            <label className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold rounded-xl border border-slate-800 flex items-center justify-center gap-2 transition-all cursor-pointer text-center">
              <Upload className="w-3.5 h-3.5 text-purple-400" />
              <span>Восстановить из файла</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportData}
                className="hidden"
              />
            </label>

            <button
              onClick={() => setShowHelpModal(true)}
              className="w-full py-2 text-slate-500 hover:text-slate-300 text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <Info className="w-3.5 h-3.5 animate-bounce" />
              <span>Инструкция по расчетам</span>
            </button>
          </section>
        </aside>

        {/* WORKSPACE AREA */}
        <section className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto flex flex-col gap-6">
          
          {/* --- TAB 1: CALCULATOR & SPECS --- */}
          {activeTab === 'calc' && (
            <>
              {/* Batch Heading details */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900/20 p-4 rounded-2xl border border-slate-800/60">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow shadow-blue-500"></span>
                    <h2 className="text-xl sm:text-2xl font-light text-white tracking-tight">
                      {activeBatch?.name || 'Партия не выбрана'}
                    </h2>
                  </div>
                  <p className="text-slate-500 text-xs mt-1 font-mono">
                    Создана: {activeBatch?.createdAt} • Расчетная валюта:{' '}
                    <span className="text-white font-bold">{activeBatch?.targetCurrency}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleLoadSamples}
                    className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5"
                  >
                    <span>Загрузить демо</span>
                  </button>

                  {activeBatch?.products?.length > 0 && (
                    <button
                      onClick={requestClearProducts}
                      className="px-3.5 py-1.5 bg-red-950/20 hover:bg-red-950/40 border border-red-900/30 text-red-400 hover:text-red-300 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Очистить всё</span>
                    </button>
                  )}
                </div>
              </div>

              {/* KPI STAT CARDS */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                
                {/* Card 1: Total invested (COGS) */}
                <div 
                  onClick={() => setShowSoldProductsModal(true)}
                  className="p-4 bg-slate-900/40 hover:bg-slate-900/90 border border-slate-800/80 hover:border-blue-500/60 rounded-2xl flex flex-col justify-between shadow-sm relative overflow-hidden group cursor-pointer transition-all"
                  title="Нажмите, чтобы открыть детализацию себестоимости и список товаров"
                >
                  <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 w-16 h-16 bg-blue-600/10 rounded-full blur-xl group-hover:bg-blue-600/20 transition-all"></div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] uppercase tracking-[0.15em] text-slate-400 font-bold">Себестоимость / Закупка</span>
                      <span className="text-[9px] font-bold text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">Список →</span>
                    </div>
                    <p className="text-lg sm:text-2xl font-mono text-white font-bold leading-none">
                      {calculations.totalInvestedConverted.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs">{calculations.currencySymbol}</span>
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400">
                    <span className="font-mono">Товар: {calculations.totalPurchaseConverted.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {calculations.currencySymbol}</span>
                    <span className="font-mono text-blue-400">Доставка: {calculations.totalDeliveryConverted.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {calculations.currencySymbol}</span>
                  </div>
                </div>

                {/* Card 2: Wholesale Profit & ROI */}
                <div 
                  onClick={() => setShowSoldProductsModal(true)}
                  className="p-4 bg-slate-900/40 hover:bg-slate-900/90 border border-slate-800/80 hover:border-purple-500/60 rounded-2xl flex flex-col justify-between shadow-sm relative overflow-hidden group cursor-pointer transition-all"
                  title="Нажмите, чтобы посмотреть детализацию продаж"
                >
                  <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 w-16 h-16 bg-purple-600/10 rounded-full blur-xl group-hover:bg-purple-600/20 transition-all"></div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] uppercase tracking-[0.15em] text-slate-400 font-bold">Оптовая прибыль</span>
                      <span className="text-[9px] font-bold text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">Список →</span>
                    </div>
                    <p className="text-lg sm:text-2xl font-mono text-purple-400 font-bold leading-none">
                      {calculations.wholesaleProfit.toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} <span className="text-xs">{calculations.currencySymbol}</span>
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px]">
                    <span className="text-slate-400">Опт. ROI:</span>
                    <span className={`font-bold font-mono ${calculations.wholesaleROI >= 0 ? 'text-purple-400' : 'text-red-400'}`}>
                      {calculations.wholesaleROI.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Card 3: Retail Profit & ROI */}
                <div 
                  onClick={() => setShowSoldProductsModal(true)}
                  className="p-4 bg-slate-900/40 hover:bg-slate-900/90 border border-slate-800/80 hover:border-emerald-500/60 rounded-2xl flex flex-col justify-between shadow-sm relative overflow-hidden group cursor-pointer transition-all"
                  title="Нажмите, чтобы посмотреть детализацию розницы и чистой прибыли"
                >
                  <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 w-16 h-16 bg-emerald-600/10 rounded-full blur-xl group-hover:bg-emerald-600/20 transition-all"></div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] uppercase tracking-[0.15em] text-slate-400 font-bold">Розничная прибыль</span>
                      <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">Список →</span>
                    </div>
                    <p className="text-lg sm:text-2xl font-mono text-emerald-400 font-bold leading-none">
                      {calculations.retailProfit.toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} <span className="text-xs">{calculations.currencySymbol}</span>
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px]">
                    <span className="text-slate-400">Рознич. ROI:</span>
                    <span className={`font-bold font-mono ${calculations.retailROI >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {calculations.retailROI.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Card 4: Logistics */}
                <div 
                  onClick={() => setShowSoldProductsModal(true)}
                  className="p-4 bg-slate-900/40 hover:bg-slate-900/90 border border-slate-800/80 hover:border-amber-500/60 rounded-2xl flex flex-col justify-between shadow-sm relative overflow-hidden group cursor-pointer transition-all"
                  title="Нажмите, чтобы посмотреть список наименований"
                >
                  <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 w-16 h-16 bg-amber-600/10 rounded-full blur-xl group-hover:bg-amber-600/20 transition-all"></div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] uppercase tracking-[0.15em] text-slate-400 font-bold">Общий Вес товаров</span>
                      <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">Список →</span>
                    </div>
                    <p className="text-lg sm:text-2xl font-mono text-amber-400 font-bold leading-none">
                      {calculations.totalWeight.toFixed(2)} <span className="text-xs font-normal text-slate-500">кг</span>
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400">
                    <span>Количество: <span className="font-mono text-white font-bold">{calculations.totalQuantity} шт</span></span>
                    <span>Видов: <span className="font-mono text-white font-bold">{calculations.productsCalculated.length}</span></span>
                  </div>
                </div>

              </div>

              {/* MAIN DATA TABLE OR RESPONSIVE CARDS */}
              <div className="bg-slate-900/20 border border-slate-800/80 rounded-2xl shadow-xl overflow-hidden flex flex-col">
                
                {/* Table Header Action Bar */}
                <div className="p-4 border-b border-slate-800/80 bg-slate-900/40 flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-blue-500" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">Склад</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {calculations.productsCalculated.some(p => !p.isSaved) && (
                      <button
                        onClick={handleSaveAllProducts}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/20"
                        title="Сохранить и заблокировать все позиции"
                      >
                        <Save className="w-4 h-4" />
                        <span>СОХРАНИТЬ ВСЕ</span>
                      </button>
                    )}
                    <button
                      onClick={handleAddProduct}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md shadow-blue-500/10"
                    >
                      <Plus className="w-4 h-4" />
                      <span>ДОБАВИТЬ ТОВАР</span>
                    </button>
                  </div>
                </div>


                {/* If list is empty */}
                {calculations.productsCalculated.length === 0 ? (
                  <div className="p-12 text-center flex flex-col items-center justify-center gap-4 bg-slate-950/20">
                    <div className="w-12 h-12 rounded-full bg-slate-800/60 flex items-center justify-center border border-slate-700/50">
                      <Package className="w-6 h-6 text-slate-500" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white">Список товаров пуст</h4>
                      <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                        Нажмите кнопку выше, чтобы добавить товар, или загрузите демонстрационные данные из Китая.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <button 
                        onClick={handleAddProduct}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs rounded-lg border border-slate-700/80 font-medium transition-colors"
                      >
                        Добавить позицию
                      </button>
                      <button 
                        onClick={handleLoadSamples}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-lg font-medium transition-colors"
                      >
                        Пример товаров
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-800/30 text-slate-400 font-semibold border-b border-slate-800">
                            <th className="p-3 pl-4 min-w-[200px] w-64">Название товара</th>
                            <th className="p-3 min-w-[120px] w-32 text-center">Защита</th>
                            <th className="p-3 min-w-[90px] w-28">Китай (¥)</th>
                            <th className="p-3 min-w-[120px] w-32">Вес (кг)</th>
                            <th className="p-3 min-w-[80px] w-20">Кол-во</th>
                            <th className="p-3 min-w-[180px] w-52">Тариф доставки</th>
                            <th className="p-3 min-w-[130px] w-32 text-blue-400">Себестоимость (шт)</th>
                            <th className="p-3 min-w-[100px] w-28">Опт ($ / сом)</th>
                            <th className="p-3 min-w-[100px] w-28 text-emerald-400">Розница ($ / сом)</th>
                            <th className="p-3 min-w-[140px] text-right pr-4">Итого по позиции</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/40">
                          {calculations.productsCalculated.map((p, index) => {
                            const isOdd = index % 2 === 1;
                            return (
                              <tr 
                                key={p.id} 
                                className={`hover:bg-slate-800/30 transition-colors group ${
                                  isOdd ? 'bg-slate-900/10' : 'bg-transparent'
                                }`}
                              >
                                {/* Name */}
                                <td className="p-3 pl-4 min-w-[220px]">
                                  <div className="flex items-center gap-2">
                                    <button 
                                      onClick={() => requestDeleteProduct(p)}
                                      title={p.isSaved ? "Товар заблокирован (требуется пароль для удаления)" : "Удалить позицию"}
                                      className={`p-1 rounded transition-colors mr-0.5 flex-shrink-0 ${p.isSaved ? 'hover:bg-amber-950/60 text-amber-500/70 hover:text-amber-400' : 'hover:bg-red-950 text-slate-500 hover:text-red-400'}`}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>

                                    {/* Product Photo Thumbnail / Upload */}
                                    <div className="relative group/photo flex-shrink-0">
                                      {p.imageUrl ? (
                                        <img
                                          src={p.imageUrl}
                                          alt={p.name}
                                          onClick={() => setPreviewProductPhotoUrl(p.imageUrl!)}
                                          className="w-8 h-8 rounded-lg object-cover border border-blue-500/40 cursor-pointer hover:scale-105 transition-all shadow-sm"
                                          title="Нажмите, чтобы увеличить фото товара"
                                        />
                                      ) : (
                                        <label 
                                          onClick={p.isSaved ? (e) => { e.preventDefault(); requestUnlockProduct(p); } : undefined}
                                          className="w-8 h-8 rounded-lg bg-slate-950 border border-dashed border-slate-700 flex items-center justify-center text-slate-500 hover:border-blue-500 hover:text-blue-400 cursor-pointer transition-colors"
                                          title={p.isSaved ? "Товар заблокирован. Нажмите для разблокировки" : "Добавить фото товара"}
                                        >
                                          <Camera className="w-3.5 h-3.5" />
                                          {!p.isSaved && (
                                            <input
                                              type="file"
                                              accept="image/*"
                                              onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) handleProductPhotoUpload(p.id, file);
                                              }}
                                              className="hidden"
                                            />
                                          )}
                                        </label>
                                      )}

                                      {p.imageUrl && !p.isSaved && (
                                        <label 
                                          className="absolute -top-1 -right-1 p-0.5 bg-slate-900 text-slate-300 hover:text-white rounded-full border border-slate-700 cursor-pointer opacity-0 group-hover/photo:opacity-100 transition-opacity shadow"
                                          title="Изменить фото"
                                        >
                                          <Camera className="w-2.5 h-2.5" />
                                          <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => {
                                              const file = e.target.files?.[0];
                                              if (file) handleProductPhotoUpload(p.id, file);
                                            }}
                                            className="hidden"
                                          />
                                        </label>
                                      )}
                                    </div>

                                    <input
                                      type="text"
                                      value={p.name}
                                      readOnly={p.isSaved}
                                      onClick={p.isSaved ? () => requestUnlockProduct(p) : undefined}
                                      onChange={(e) => handleProductChange(p.id, 'name', e.target.value)}
                                      className={`w-full min-w-[140px] bg-transparent border-b border-transparent text-xs font-medium focus:outline-none px-1 py-0.5 rounded transition-colors ${
                                        p.isSaved 
                                          ? 'text-slate-200 cursor-pointer hover:bg-slate-800/60' 
                                          : 'hover:border-slate-700 focus:border-blue-500 text-white focus:bg-slate-950'
                                      }`}
                                      placeholder="Название товара"
                                      title={p.name || (p.isSaved ? "Товар заблокирован. Нажмите для разблокировки паролем" : undefined)}
                                    />
                                  </div>
                                </td>

                                {/* Save / Protection Status Column */}
                                <td className="p-3 text-center">
                                  {p.isSaved ? (
                                    <button
                                      onClick={() => requestUnlockProduct(p)}
                                      className="w-full px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold rounded-lg text-[11px] flex items-center justify-center gap-1 transition-all"
                                      title="Товар сохранен и заблокирован от изменений. Нажмите для разблокировки паролем"
                                    >
                                      <Lock className="w-3 h-3 text-amber-400" />
                                      <span>Заблокирован</span>
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleSaveProduct(p.id)}
                                      className="w-full px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-[11px] flex items-center justify-center gap-1 shadow-sm transition-all"
                                      title="Нажмите, чтобы сохранить товар и заблокировать от случайных изменений"
                                    >
                                      <Save className="w-3 h-3" />
                                      <span>Сохранить</span>
                                    </button>
                                  )}
                                </td>

                                {/* CNY price */}
                                <td className="p-3 min-w-[90px]">
                                  <div 
                                    onClick={p.isSaved ? () => requestUnlockProduct(p) : undefined}
                                    className={`flex items-center gap-1 font-mono ${p.isSaved ? 'cursor-pointer opacity-90' : ''}`}
                                  >
                                    <span className="text-slate-500 flex-shrink-0">¥</span>
                                    <input
                                      type="number"
                                      step="any"
                                      min="0"
                                      readOnly={p.isSaved}
                                      value={p.priceCNY === 0 ? '' : p.priceCNY}
                                      onChange={(e) => handleProductChange(p.id, 'priceCNY', parseFloat(e.target.value) || 0)}
                                      className="w-full min-w-[50px] bg-transparent border-b border-transparent hover:border-slate-700 focus:border-blue-500 text-white font-medium focus:outline-none focus:bg-slate-950 px-1 py-0.5 rounded transition-colors text-xs font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                      placeholder="0"
                                    />
                                  </div>
                                </td>

                                {/* Weight */}
                                <td className="p-3 min-w-[120px]">
                                  <div 
                                    onClick={p.isSaved ? () => requestUnlockProduct(p) : undefined}
                                    className={`flex items-center gap-1 font-mono ${p.isSaved ? 'cursor-pointer opacity-90' : ''}`}
                                  >
                                    <input
                                      type="number"
                                      step="any"
                                      min="0"
                                      readOnly={p.isSaved}
                                      value={p.weight === 0 ? '' : p.weight}
                                      onChange={(e) => handleProductChange(p.id, 'weight', parseFloat(e.target.value) || 0)}
                                      className="w-full min-w-[60px] bg-transparent border-b border-transparent hover:border-slate-700 focus:border-blue-500 text-white font-medium focus:outline-none focus:bg-slate-950 px-1 py-0.5 rounded transition-colors text-xs font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                      placeholder="0"
                                    />
                                    <span className="text-slate-500 font-medium flex-shrink-0">кг</span>
                                  </div>
                                </td>

                                {/* Quantity */}
                                <td className="p-3 min-w-[80px]">
                                  <input
                                    type="number"
                                    min="1"
                                    readOnly={p.isSaved}
                                    onClick={p.isSaved ? () => requestUnlockProduct(p) : undefined}
                                    value={p.quantity}
                                    onChange={(e) => handleProductChange(p.id, 'quantity', parseInt(e.target.value) || 1)}
                                    className="w-full min-w-[40px] bg-transparent border-b border-transparent hover:border-slate-700 focus:border-blue-500 text-white font-medium focus:outline-none focus:bg-slate-950 px-1 py-0.5 rounded transition-colors text-xs font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    placeholder="1"
                                  />
                                </td>

                                {/* Editable Delivery */}
                                <td className="p-3 min-w-[180px]">
                                  <div className="flex items-center gap-1">
                                    {/* Mode selector */}
                                    <select
                                      value={p.deliveryMode}
                                      disabled={p.isSaved}
                                      onClick={p.isSaved ? () => requestUnlockProduct(p) : undefined}
                                      onChange={(e) => handleProductChange(p.id, 'deliveryMode', e.target.value)}
                                      className="bg-slate-950 text-slate-300 border border-slate-800 text-[10px] rounded px-1 py-0.5 focus:outline-none focus:border-blue-500 disabled:opacity-80 disabled:cursor-pointer flex-shrink-0"
                                    >
                                      <option value="flat">За шт</option>
                                      <option value="total">Всего</option>
                                      <option value="weight">За кг</option>
                                    </select>

                                    {/* Value input */}
                                    <input
                                      type="number"
                                      step="any"
                                      min="0"
                                      readOnly={p.isSaved}
                                      onClick={p.isSaved ? () => requestUnlockProduct(p) : undefined}
                                      value={p.deliveryValue === 0 ? '' : p.deliveryValue}
                                      onChange={(e) => handleProductChange(p.id, 'deliveryValue', parseFloat(e.target.value) || 0)}
                                      className="w-16 min-w-[50px] bg-transparent border-b border-transparent hover:border-slate-700 focus:border-blue-500 text-white font-medium focus:outline-none focus:bg-slate-950 px-1 py-0.5 rounded transition-colors text-xs font-mono text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                      placeholder="0"
                                    />

                                    {/* Currency selector ($ / сом) */}
                                    <select
                                      value={p.deliveryCurrency || (p.deliveryMode === 'weight' ? 'USD' : activeBatch?.targetCurrency || 'KGS')}
                                      disabled={p.isSaved}
                                      onClick={p.isSaved ? () => requestUnlockProduct(p) : undefined}
                                      onChange={(e) => handleProductChange(p.id, 'deliveryCurrency', e.target.value)}
                                      className="bg-slate-950 text-amber-400 border border-slate-800 text-[10px] font-bold rounded px-1 py-0.5 focus:outline-none focus:border-amber-500 disabled:opacity-80 disabled:cursor-pointer flex-shrink-0"
                                      title="Валюта тарифного показателя доставки ($ или сом)"
                                    >
                                      <option value="USD">$</option>
                                      <option value="KGS">сом</option>
                                    </select>
                                  </div>
                                </td>

                                {/* Unit landed cost */}
                                <td className="p-3 min-w-[130px] font-mono">
                                  <div className="text-blue-400 font-bold">
                                    {p.landedUnitCost.toFixed(2)} {calculations.currencySymbol}
                                  </div>
                                  <div className="text-[10px] text-slate-500">
                                    Китай: {(p.priceCNY * (activeBatch?.targetCurrency === 'USD' ? activeBatch.currencyRateCNYtoUSD : activeBatch.currencyRateCNYtoKGS)).toFixed(2)} + Дост: {p.itemDeliveryConverted.toFixed(2)}
                                  </div>
                                </td>

                                {/* Wholesale selling price */}
                                <td className="p-3 min-w-[100px]">
                                  <div className="flex items-center gap-0.5 font-mono">
                                    <input
                                      type="number"
                                      step="any"
                                      min="0"
                                      readOnly={p.isSaved}
                                      onClick={p.isSaved ? () => requestUnlockProduct(p) : undefined}
                                      value={p.wholesalePriceUSD === 0 ? '' : p.wholesalePriceUSD}
                                      onChange={(e) => handleProductChange(p.id, 'wholesalePriceUSD', parseFloat(e.target.value) || 0)}
                                      className="w-full min-w-[50px] bg-transparent border-b border-transparent hover:border-slate-700 focus:border-blue-500 text-purple-400 font-bold focus:outline-none focus:bg-slate-950 px-1 py-0.5 rounded transition-colors text-xs font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                      placeholder="0"
                                    />
                                  </div>
                                </td>

                                {/* Retail selling price */}
                                <td className="p-3 min-w-[100px]">
                                  <div className="flex items-center gap-0.5 font-mono">
                                    <input
                                      type="number"
                                      step="any"
                                      min="0"
                                      readOnly={p.isSaved}
                                      onClick={p.isSaved ? () => requestUnlockProduct(p) : undefined}
                                      value={p.retailPriceUSD === 0 ? '' : p.retailPriceUSD}
                                      onChange={(e) => handleProductChange(p.id, 'retailPriceUSD', parseFloat(e.target.value) || 0)}
                                      className="w-full min-w-[50px] bg-transparent border-b border-transparent hover:border-slate-700 focus:border-blue-500 text-emerald-400 font-bold focus:outline-none focus:bg-slate-950 px-1 py-0.5 rounded transition-colors text-xs font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                      placeholder="0"
                                    />
                                  </div>
                                </td>

                                {/* Pos total summary */}
                                <td className="p-3 text-right pr-4 font-mono">
                                  <div className="text-white font-semibold">
                                    {p.totalItemLandedCost.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {calculations.currencySymbol}
                                  </div>
                                  <div className="text-[10px] text-slate-500">
                                    Опт: {p.positionWholesaleRevenue.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / Розн: {p.positionRetailRevenue.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Responsive Mobile Layout: Card Lists */}
                    <div className="md:hidden flex flex-col divide-y divide-slate-800">
                      {calculations.productsCalculated.map((p, index) => (
                        <div key={p.id} className="p-4 space-y-3 bg-slate-900/10">
                          {/* Card Header */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              {/* Photo thumbnail */}
                              <div className="relative flex-shrink-0">
                                {p.imageUrl ? (
                                  <img
                                    src={p.imageUrl}
                                    alt={p.name}
                                    onClick={() => p.isSaved ? requestUnlockProduct(p) : setPreviewProductPhotoUrl(p.imageUrl!)}
                                    className="w-10 h-10 rounded-lg object-cover border border-blue-500/40 cursor-pointer"
                                  />
                                ) : (
                                  <label 
                                    onClick={p.isSaved ? (e) => { e.preventDefault(); requestUnlockProduct(p); } : undefined}
                                    className="w-10 h-10 rounded-lg bg-slate-950 border border-dashed border-slate-700 flex flex-col items-center justify-center text-slate-500 cursor-pointer hover:border-blue-500 hover:text-blue-400"
                                  >
                                    <Camera className="w-4 h-4" />
                                    {!p.isSaved && (
                                      <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) handleProductPhotoUpload(p.id, file);
                                        }}
                                        className="hidden"
                                      />
                                    )}
                                  </label>
                                )}
                              </div>
                              <input
                                type="text"
                                value={p.name}
                                readOnly={p.isSaved}
                                onClick={p.isSaved ? () => requestUnlockProduct(p) : undefined}
                                onChange={(e) => handleProductChange(p.id, 'name', e.target.value)}
                                className={`bg-transparent border-b border-transparent font-bold text-sm flex-1 min-w-0 focus:outline-none ${
                                  p.isSaved ? 'text-slate-200 cursor-pointer' : 'focus:border-blue-500 text-white'
                                }`}
                              />
                            </div>

                            <div className="flex items-center gap-1.5">
                              {p.isSaved ? (
                                <button
                                  onClick={() => requestUnlockProduct(p)}
                                  className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold rounded-lg text-xs flex items-center gap-1 transition-all flex-shrink-0"
                                  title="Нажмите для разблокировки товара паролем"
                                >
                                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                                  <span>Заблокирован</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleSaveProduct(p.id)}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs flex items-center gap-1 shadow transition-all flex-shrink-0"
                                  title="Сохранить и заблокировать товар"
                                >
                                  <Save className="w-3.5 h-3.5" />
                                  <span>Сохранить</span>
                                </button>
                              )}

                              <button
                                onClick={() => requestDeleteProduct(p)}
                                className={`p-1.5 rounded border flex-shrink-0 transition-colors ${
                                  p.isSaved 
                                    ? 'bg-amber-950/20 text-amber-400 border-amber-900/30 hover:bg-amber-900/30' 
                                    : 'bg-red-950/20 text-red-400 border-red-900/30 hover:bg-red-900/30'
                                }`}
                                title={p.isSaved ? "Заблокирован (требуется пароль)" : "Удалить"}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Grid Inputs */}
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div onClick={p.isSaved ? () => requestUnlockProduct(p) : undefined}>
                              <label className="block text-[10px] text-slate-500 font-mono mb-1">Китай (¥)</label>
                              <input
                                type="number"
                                readOnly={p.isSaved}
                                value={p.priceCNY === 0 ? '' : p.priceCNY}
                                onChange={(e) => handleProductChange(p.id, 'priceCNY', parseFloat(e.target.value) || 0)}
                                className={`w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white font-mono ${p.isSaved ? 'cursor-pointer' : ''}`}
                              />
                            </div>
                            <div onClick={p.isSaved ? () => requestUnlockProduct(p) : undefined}>
                              <label className="block text-[10px] text-slate-500 font-mono mb-1">Вес (кг)</label>
                              <input
                                type="number"
                                step="any"
                                readOnly={p.isSaved}
                                value={p.weight === 0 ? '' : p.weight}
                                onChange={(e) => handleProductChange(p.id, 'weight', parseFloat(e.target.value) || 0)}
                                className={`w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white font-mono ${p.isSaved ? 'cursor-pointer' : ''}`}
                              />
                            </div>
                            <div onClick={p.isSaved ? () => requestUnlockProduct(p) : undefined}>
                              <label className="block text-[10px] text-slate-500 font-mono mb-1">Кол-во (шт)</label>
                              <input
                                type="number"
                                readOnly={p.isSaved}
                                value={p.quantity}
                                onChange={(e) => handleProductChange(p.id, 'quantity', parseInt(e.target.value) || 1)}
                                className={`w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white font-mono ${p.isSaved ? 'cursor-pointer' : ''}`}
                              />
                            </div>
                          </div>

                          {/* Delivery allocation input */}
                          <div className="p-2.5 bg-slate-950/40 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs">
                            <div className="flex flex-col gap-1">
                              <span className="text-[9px] uppercase text-slate-500 font-bold font-mono">Доставка</span>
                              <select
                                value={p.deliveryMode}
                                disabled={p.isSaved}
                                onClick={p.isSaved ? () => requestUnlockProduct(p) : undefined}
                                onChange={(e) => handleProductChange(p.id, 'deliveryMode', e.target.value)}
                                className="bg-slate-950 text-slate-300 border border-slate-800 text-[10px] rounded px-1 py-0.5 focus:outline-none focus:border-blue-500 disabled:cursor-pointer"
                              >
                                <option value="flat">За шт</option>
                                <option value="total">Всего</option>
                                <option value="weight">За кг</option>
                              </select>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                step="any"
                                min="0"
                                readOnly={p.isSaved}
                                onClick={p.isSaved ? () => requestUnlockProduct(p) : undefined}
                                value={p.deliveryValue === 0 ? '' : p.deliveryValue}
                                onChange={(e) => handleProductChange(p.id, 'deliveryValue', parseFloat(e.target.value) || 0)}
                                className={`w-20 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white font-mono text-right ${p.isSaved ? 'cursor-pointer' : ''}`}
                                placeholder="0"
                              />
                              <select
                                value={p.deliveryCurrency || (p.deliveryMode === 'weight' ? 'USD' : activeBatch?.targetCurrency || 'KGS')}
                                disabled={p.isSaved}
                                onClick={p.isSaved ? () => requestUnlockProduct(p) : undefined}
                                onChange={(e) => handleProductChange(p.id, 'deliveryCurrency', e.target.value)}
                                className="bg-slate-950 text-amber-400 border border-slate-800 text-[10px] font-bold rounded px-1 py-1 focus:outline-none focus:border-amber-500 disabled:cursor-pointer"
                              >
                                <option value="USD">$</option>
                                <option value="KGS">сом</option>
                              </select>
                            </div>
                          </div>

                          {/* Selling Prices */}
                          <div className="grid grid-cols-2 gap-3 pt-1">
                            <div onClick={p.isSaved ? () => requestUnlockProduct(p) : undefined}>
                              <label className="block text-[9px] uppercase tracking-wider text-purple-400 font-bold mb-1">Опт цена (шт)</label>
                              <input
                                type="number"
                                readOnly={p.isSaved}
                                value={p.wholesalePriceUSD === 0 ? '' : p.wholesalePriceUSD}
                                onChange={(e) => handleProductChange(p.id, 'wholesalePriceUSD', parseFloat(e.target.value) || 0)}
                                className={`w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-purple-400 font-bold font-mono text-xs ${p.isSaved ? 'cursor-pointer' : ''}`}
                                placeholder={`сом / $`}
                              />
                            </div>
                            <div onClick={p.isSaved ? () => requestUnlockProduct(p) : undefined}>
                              <label className="block text-[9px] uppercase tracking-wider text-emerald-400 font-bold mb-1">Розница цена (шт)</label>
                              <input
                                type="number"
                                readOnly={p.isSaved}
                                value={p.retailPriceUSD === 0 ? '' : p.retailPriceUSD}
                                onChange={(e) => handleProductChange(p.id, 'retailPriceUSD', parseFloat(e.target.value) || 0)}
                                className={`w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-emerald-400 font-bold font-mono text-xs ${p.isSaved ? 'cursor-pointer' : ''}`}
                                placeholder={`сом / $`}
                              />
                            </div>
                          </div>

                          {/* Card Footer Summary & Prices */}
                          <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs font-mono">
                            <div>
                              <span className="text-[10px] text-slate-500 block">Себестоимость</span>
                              <span className="text-blue-400 font-bold">{p.landedUnitCost.toFixed(2)} {calculations.currencySymbol}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] text-slate-500 block">Итого позиция</span>
                              <span className="text-white font-bold">{p.totalItemLandedCost.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {calculations.currencySymbol}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          {/* --- TAB 2: SHIPMENT LISTING --- */}
          {activeTab === 'shipments' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white">Все партии товаров из Китая</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Данные хранятся в облаке и доступны на всех ваших устройствах одновременно.
                  </p>
                </div>
                <button
                  onClick={handleAddBatch}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>ДОБАВИТЬ ПАРТИЮ</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {batches.map(batch => {
                  const isCurrent = batch.id === activeBatchId;
                  const prodCount = batch.products.length;
                  const totalItems = batch.products.reduce((sum, p) => sum + (p.quantity || 0), 0);
                  const totalKg = batch.products.reduce((sum, p) => sum + ((p.weight || 0) * (p.quantity || 0)), 0);

                  return (
                    <div 
                      key={batch.id} 
                      className={`p-6 rounded-2xl border transition-all flex flex-col justify-between ${
                        isCurrent 
                          ? 'bg-blue-950/15 border-blue-800 shadow-lg shadow-blue-900/5' 
                          : 'bg-slate-900/30 border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-[10px] text-slate-500 uppercase font-mono font-bold block mb-1">
                              Создана: {batch.createdAt}
                            </span>
                            {editingBatchNameId === batch.id ? (
                              <input
                                type="text"
                                value={batchNameInput}
                                onChange={(e) => setBatchNameInput(e.target.value)}
                                onBlur={() => saveBatchName(batch.id)}
                                onKeyDown={(e) => e.key === 'Enter' && saveBatchName(batch.id)}
                                className="bg-slate-950 border border-blue-500 text-sm rounded px-2 py-1 text-white font-bold focus:outline-none"
                                autoFocus
                              />
                            ) : (
                              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                {batch.name}
                                <button 
                                  onClick={() => startEditingBatchName(batch)} 
                                  className="text-slate-500 hover:text-white"
                                  title="Изменить название"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                              </h3>
                            )}
                          </div>
                          {isCurrent && (
                            <span className="px-2.5 py-0.5 bg-blue-600/20 text-blue-400 text-[10px] font-bold rounded-full border border-blue-800/50 uppercase tracking-wider">
                              Активна
                            </span>
                          )}
                        </div>

                        {/* Stats Summary */}
                        <div className="grid grid-cols-3 gap-2 pt-2 text-xs border-t border-slate-800/60 font-mono">
                          <div>
                            <span className="text-slate-500 block text-[9px] uppercase">Товаров</span>
                            <span className="text-white font-semibold text-sm">{prodCount} поз.</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[9px] uppercase">Общее кол-во</span>
                            <span className="text-white font-semibold text-sm">{totalItems} шт</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[9px] uppercase">Всего вес</span>
                            <span className="text-amber-400 font-semibold text-sm">{totalKg.toFixed(1)} кг</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/40">
                          <div>
                            <span className="text-slate-500 block text-[9px]">Курс USD:</span>
                            <span className="text-blue-400">¥1 = ${batch.currencyRateCNYtoUSD}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[9px]">Курс сом:</span>
                            <span className="text-purple-400">¥1 = {batch.currencyRateCNYtoKGS} сом</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-6">
                        {!isCurrent && (
                          <button
                            onClick={() => handleSelectBatch(batch.id)}
                            className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-all"
                          >
                            Выбрать партию
                          </button>
                        )}
                        <button
                          onClick={() => {
                            handleSelectBatch(batch.id);
                            setActiveTab('calc');
                          }}
                          className={`py-2 px-4 rounded-xl text-xs font-bold transition-all ${
                            isCurrent ? 'bg-blue-600 hover:bg-blue-500 text-white flex-1' : 'bg-slate-900 text-slate-300 hover:text-white'
                          }`}
                        >
                          Открыть в таблице
                        </button>
                        {batches.length > 1 && (
                          <button
                            onClick={() => handleDeleteBatch(batch.id)}
                            className="p-2 bg-red-950/20 text-red-400 hover:bg-red-900/30 rounded-xl border border-red-900/30 transition-colors"
                            title="Удалить партию"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* --- TAB: DEBTS MANAGER --- */}
          {activeTab === 'debts' && (
            <DebtsManager
              debts={debts}
              onAddDebt={handleAddDebt}
              onUpdateDebt={handleUpdateDebt}
              onDeleteDebt={handleDeleteDebt}
              onAddPayment={handleAddPayment}
              defaultCurrency={settings.defaultTargetCurrency}
            />
          )}

          {/* --- TAB 3: SETTINGS --- */}

          {activeTab === 'settings' && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-white">Настройки приложения и синхронизации</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Настройте защиту паролем и параметры обмена валют по умолчанию для новых партий.
                </p>
              </div>

              {/* Password change form */}
              <div className="p-6 bg-slate-900/40 border border-slate-800/80 rounded-2xl space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                  <Lock className="w-4 h-4 text-blue-500" />
                  <h3 className="text-sm font-semibold text-white">Безопасность и пароль доступа</h3>
                </div>

                <form onSubmit={handlePasswordChangeSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Старый пароль</label>
                      <input
                        type="password"
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        placeholder="•••••"
                        className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg py-2 px-3 text-xs font-mono outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Новый пароль</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Минимум 4 символа"
                        className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg py-2 px-3 text-xs font-mono outline-none"
                        required
                      />
                    </div>
                  </div>

                  {passwordChangeSuccess && (
                    <div className="p-3 bg-emerald-950/20 border border-emerald-900/30 text-emerald-400 text-xs rounded-xl flex items-center gap-2">
                      <Check className="w-4 h-4" />
                      <span>{passwordChangeSuccess}</span>
                    </div>
                  )}

                  {passwordChangeError && (
                    <div className="p-3 bg-red-950/20 border border-red-900/30 text-red-400 text-xs rounded-xl flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      <span>{passwordChangeError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-all"
                  >
                    Обновить пароль в облаке
                  </button>
                </form>
              </div>

              {/* Default preferences */}
              <div className="p-6 bg-slate-900/40 border border-slate-800/80 rounded-2xl space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                  <Sliders className="w-4 h-4 text-purple-500" />
                  <h3 className="text-sm font-semibold text-white">Параметры новых партий</h3>
                </div>

                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-400 mb-1">Курс CNY к USD по умолчанию</label>
                      <input
                        type="number"
                        step="0.0001"
                        value={settings.defaultCNYtoUSD}
                        onChange={(e) => setSettings(prev => ({ ...prev, defaultCNYtoUSD: parseFloat(e.target.value) || 0 }))}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-lg py-2 px-3 text-white font-mono outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Курс CNY к KGS (сом) по умолчанию</label>
                      <input
                        type="number"
                        step="0.01"
                        value={settings.defaultCNYtoKGS}
                        onChange={(e) => setSettings(prev => ({ ...prev, defaultCNYtoKGS: parseFloat(e.target.value) || 0 }))}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-lg py-2 px-3 text-white font-mono outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1.5">Расчетная валюта по умолчанию</label>
                    <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800 max-w-xs">
                      <button
                        onClick={() => setSettings(prev => ({ ...prev, defaultTargetCurrency: 'USD' }))}
                        className={`py-1.5 rounded-lg font-bold transition-all ${
                          settings.defaultTargetCurrency === 'USD'
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-400'
                        }`}
                      >
                        USD ($)
                      </button>
                      <button
                        onClick={() => setSettings(prev => ({ ...prev, defaultTargetCurrency: 'KGS' }))}
                        className={`py-1.5 rounded-lg font-bold transition-all ${
                          settings.defaultTargetCurrency === 'KGS'
                            ? 'bg-purple-600 text-white'
                            : 'text-slate-400'
                        }`}
                      >
                        KGS (сом)
                      </button>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={async () => {
                        try {
                          setSyncStatus('saving');
                          await saveSettingsToCloud(settings);
                          setSyncStatus('synced');
                          alert('Настройки по умолчанию сохранены в облако!');
                        } catch (err) {
                          alert('Не удалось сохранить настройки');
                          setSyncStatus('error');
                        }
                      }}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs transition-all"
                    >
                      Сохранить дефолты в облако
                    </button>
                  </div>
                </div>
              </div>

              {/* Data recovery card */}
              <div className="p-6 bg-red-950/10 border border-red-900/30 rounded-2xl space-y-3">
                <h3 className="text-sm font-semibold text-red-400">Экстренное удаление и бэкап</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Вы можете скачать полную копию всей базы данных, чтобы сохранить её на диск компьютера или переслать в мессенджере. 
                  Для восстановления просто выберите сохраненный файл.
                </p>
                <div className="flex items-center gap-3 pt-1">
                  <button
                    onClick={handleExportData}
                    className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs rounded-lg border border-slate-800 flex items-center gap-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-400" />
                    <span>Скачать JSON</span>
                  </button>
                  <label className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs rounded-lg border border-slate-800 flex items-center gap-1.5 transition-colors cursor-pointer">
                    <Upload className="w-3.5 h-3.5 text-purple-400" />
                    <span>Импорт JSON</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportData}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

        </section>
      </main>

      {/* 3. BOTTOM SUMMARY BAR (Only visible on main calc page) */}
      {activeTab === 'calc' && (
        <footer className="bg-slate-900 border-t border-slate-800 py-4 px-4 sm:px-8 flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0">
          <div className="flex flex-wrap items-center gap-6 sm:gap-12">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Всего закупка + доставка</span>
              <span className="text-xl sm:text-2xl font-mono text-white font-bold">
                {calculations.totalInvestedConverted.toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} <span className="text-sm">{calculations.currencySymbol}</span>
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Ожидаемая Розничная Выручка</span>
              <span className="text-xl sm:text-2xl font-mono text-emerald-400 font-bold">
                {(calculations.retailTotalRevenue).toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} <span className="text-sm">{calculations.currencySymbol}</span>
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Ожидаемая Розничная Прибыль</span>
              <span className="text-xl sm:text-2xl font-mono text-blue-400 font-bold">
                {calculations.retailProfit.toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} <span className="text-sm">{calculations.currencySymbol}</span>
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="bg-slate-950 px-4 py-2.5 rounded-xl border border-slate-800/80 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${syncStatus === 'synced' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`}></span>
              <span className="text-xs text-slate-400 font-medium">
                {syncStatus === 'synced' ? 'Авто-сохранение в облако (Firestore)' : 'Авто-сохранение локально (LocalStorage)'}
              </span>
            </div>
          </div>
        </footer>
      )}

      {/* SYNC HELP MODAL */}
      {showSyncHelpModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative">
            <button 
              onClick={() => setShowSyncHelpModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-2 rounded-full hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 flex-shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Статус сети и сохранение</h3>
                <p className="text-xs text-slate-400">Справка по локальному режиму и облаку</p>
              </div>
            </div>

            <div className="space-y-3.5 text-xs text-slate-300 leading-relaxed">
              <div className="p-3.5 bg-slate-950/70 rounded-2xl border border-slate-800">
                <div className="font-bold text-emerald-400 mb-1 flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-400" /> Все данные надежно сохранены!
                </div>
                <p className="text-slate-400">
                  Любые изменения (партии, товары, продажи и долги) <strong>мгновенно записываются в память вашего браузера (LocalStorage)</strong>. Данные не потеряются при обновлении или перезагрузке страницы.
                </p>
              </div>

              <div className="p-3.5 bg-slate-950/70 rounded-2xl border border-slate-800">
                <div className="font-bold text-amber-400 mb-1">
                  Почему выводится «Ошибка сети»?
                </div>
                <p className="text-slate-400">
                  На Vercel или в автономном режиме приложение не может соединиться с сервером Google Firestore (используются демонстрационные ключи в конфигурации).
                </p>
              </div>

              <div className="p-3.5 bg-slate-950/70 rounded-2xl border border-slate-800">
                <div className="font-bold text-blue-400 mb-1">
                  Как настроить единое облако для всех устройств?
                </div>
                <p className="text-slate-400">
                  Для работы между несколькими телефонами и компьютерами внесите ваши настоящие ключи Firebase в файл <code>firebase-applet-config.json</code> на GitHub / Vercel.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowSyncHelpModal(false)}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all"
              >
                Понятно
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. HELP INSTRUCTIONS MODAL */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-xl w-full max-h-[85vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Info className="w-5 h-5 text-blue-500" />
                <span>Формулы расчетов landed cost</span>
              </h3>
              <button 
                onClick={() => setShowHelpModal(false)}
                className="text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-slate-300 space-y-3.5 leading-relaxed">
              <p>
                <strong>SinoCalc Pro</strong> использует формулу <span className="text-blue-400">Landed Cost</span> (конечная цена товара на складе) для выявления чистой прибыли.
              </p>
              
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/60 font-mono space-y-2 text-[11px]">
                <p><strong>1. Перевод стоимости:</strong></p>
                <p className="text-slate-400">Цена в валюте = Цена в CNY × Курс обмена</p>
                
                <p className="pt-2"><strong>2. Методы распределения доставки:</strong></p>
                <p className="text-slate-400">• <span className="text-white">За шт (flat):</span> Добавит фиксированную сумму доставки к каждому товару.</p>
                <p className="text-slate-400">• <span className="text-white">Всего (total):</span> Разделит общую сумму доставки позиции на количество штук.</p>
                <p className="text-slate-400">• <span className="text-white">За кг (weight):</span> Рассчитает доставку как (Вес единицы в кг) × (Цена доставки за 1 кг).</p>
              </div>

              <p>
                <strong>Что вы видите в итоговой колонке?</strong>
              </p>
              <ul className="list-disc list-inside space-y-1.5 pl-2 text-slate-400">
                <li><span className="text-white">Себестоимость:</span> Реальная цена 1 шт с учетом закупки в CNY и доставленной доли.</li>
                <li><span className="text-white">Опт / Розница продажа:</span> Задайте ваши цены продаж.</li>
                <li><span className="text-white">Прибыль и ROI:</span> Процент прибыли от заложенных денег.</li>
              </ul>

              <div className="bg-blue-950/20 p-3 rounded-xl border border-blue-900/30 text-blue-400 text-[11px]">
                💡 <strong>Работа со смартфона и ноутбука:</strong> Любое изменение, внесенное вами на телефоне или компьютере, сохраняется в реальном времени в облачную базу данных Google Cloud Firestore. Просто откройте сайт на другом девайсе и авторизуйтесь по паролю!
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowHelpModal(false)}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs"
              >
                Понятно
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. SOLD & CALCULATED PRODUCTS DETAILS MODAL */}
      <SoldProductsModal
        isOpen={showSoldProductsModal}
        onClose={() => setShowSoldProductsModal(false)}
        products={calculations.productsCalculated}
        batchName={activeBatch?.name || 'Текущая партия'}
        currencySymbol={calculations.currencySymbol}
        targetCurrency={activeBatch?.targetCurrency || 'KGS'}
        onTransferToDebt={handleTransferToDebt}
      />

      {/* 6. SELL PRODUCT MODAL */}
      <SellProductModal
        isOpen={showSellProductModal}
        onClose={() => setShowSellProductModal(false)}
        products={calculations.productsCalculated}
        batchName={activeBatch?.name || 'Текущая партия'}
        currencySymbol={calculations.currencySymbol}
        targetCurrency={activeBatch?.targetCurrency || 'KGS'}
        onCompleteSale={handleCompleteSale}
      />

      {/* 7. ANALYTICS & FINANCIAL REPORT MODAL */}
      <AnalyticsModal
        isOpen={showAnalyticsModal}
        onClose={() => setShowAnalyticsModal(false)}
        batches={batches}
        debts={debts}
        activeBatchId={activeBatchId}
      />

      {/* 7. PRODUCT PHOTO PREVIEW LIGHTBOX MODAL */}
      {previewProductPhotoUrl && (
        <div 
          className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setPreviewProductPhotoUrl(null)}
        >
          <div className="relative max-w-2xl max-h-[90vh] bg-slate-900 rounded-3xl border border-slate-800 p-2 overflow-hidden shadow-2xl flex flex-col items-center">
            <button
              onClick={() => setPreviewProductPhotoUrl(null)}
              className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-slate-950/80 text-white flex items-center justify-center hover:bg-red-600 transition-colors border border-slate-700"
            >
              ✕
            </button>
            <img
              src={previewProductPhotoUrl}
              alt="Просмотр фото товара"
              className="max-h-[82vh] w-auto max-w-full rounded-2xl object-contain"
            />
          </div>
        </div>
      )}

      {/* 8. PASSWORD AUTHORIZATION MODAL FOR PROTECTED PRODUCTS */}
      {protectedProductAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 relative overflow-hidden">
            <button
              onClick={() => {
                setProtectedProductAction(null);
                setProductAuthPassword('');
                setProductAuthError('');
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {protectedProductAction.type === 'delete'
                    ? 'Удаление товара'
                    : protectedProductAction.type === 'unlock'
                    ? 'Разблокировка товара'
                    : protectedProductAction.type === 'clear_all'
                    ? 'Очистка всех товаров'
                    : protectedProductAction.type === 'unlock_rates'
                    ? 'Разблокировка курсов валют'
                    : protectedProductAction.type === 'delete_debt'
                    ? 'Удаление записи о долге'
                    : protectedProductAction.type === 'restore_backup'
                    ? 'Восстановление базы данных'
                    : 'Удаление партии'}
                </h3>
                {protectedProductAction.product?.name ? (
                  <p className="text-xs text-slate-400 truncate max-w-[240px]">
                    Товар: <span className="text-amber-300 font-semibold">{protectedProductAction.product.name}</span>
                  </p>
                ) : protectedProductAction.type === 'delete_debt' ? (
                  <p className="text-xs text-slate-400 truncate max-w-[240px]">
                    Должник: <span className="text-amber-300 font-semibold">
                      {debts.find(d => d.id === protectedProductAction.debtId)?.debtorName || 'Выбранная запись'}
                    </span>
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 truncate max-w-[240px]">
                    Партия: <span className="text-amber-300 font-semibold">{
                      protectedProductAction.batchId 
                        ? (batches.find(b => b.id === protectedProductAction.batchId)?.name || 'Текущая')
                        : (activeBatch?.name || 'Текущая')
                    }</span>
                  </p>
                )}
              </div>
            </div>

            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              {protectedProductAction.type === 'delete'
                ? 'Для удаления данного товара введите пароль приложения.'
                : protectedProductAction.type === 'unlock'
                ? 'Этот товар сохранен и заблокирован от изменений. Пожалуйста, введите пароль приложения для разблокировки.'
                : protectedProductAction.type === 'clear_all'
                ? 'Вы собираетесь удалить все товары из этой партии. Введите пароль приложения для подтверждения.'
                : protectedProductAction.type === 'unlock_rates'
                ? 'Курсы валют в этой партии заблокированы от изменений. Введите пароль приложения для их разблокировки.'
                : protectedProductAction.type === 'delete_debt'
                ? 'Вы собираетесь удалить запись о долге. Введите пароль приложения для подтверждения.'
                : protectedProductAction.type === 'restore_backup'
                ? 'Восстановление резервной копии заменит текущие данные. Введите пароль приложения для подтверждения.'
                : 'Вы собираетесь удалить эту партию со всеми её товарами. Введите пароль приложения для подтверждения.'}
            </p>

            <form onSubmit={handleConfirmProductAuth} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Пароль приложения
                </label>
                <input
                  type="password"
                  autoFocus
                  value={productAuthPassword}
                  onChange={(e) => setProductAuthPassword(e.target.value)}
                  placeholder="Введите пароль..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none transition-colors"
                />
              </div>

              {productAuthError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2 text-xs text-red-400">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{productAuthError}</span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setProtectedProductAction(null);
                    setProductAuthPassword('');
                    setProductAuthError('');
                  }}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs rounded-xl transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl transition-colors shadow-lg shadow-amber-600/20 flex items-center justify-center gap-1.5"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Подтвердить</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 9. SAVE TOAST NOTIFICATION */}
      {saveToastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-semibold animate-in slide-in-from-bottom-5 duration-200">
          <ShieldCheck className="w-4 h-4 text-emerald-100" />
          <span>{saveToastMessage}</span>
        </div>
      )}

    </div>
  );
}
