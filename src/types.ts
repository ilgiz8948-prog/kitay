export interface Product {
  id: string;
  name: string;
  priceCNY: number;      // Price in China (CNY)
  weight: number;        // Weight in kg
  quantity: number;      // Quantity ordered
  
  // Delivery cost configuration
  deliveryMode: 'flat' | 'total' | 'weight';
  deliveryValue: number; // editable value depending on mode:
                         // 'flat': target currency per unit
                         // 'total': target currency total for position
                         // 'weight': target currency per kg
  
  deliveryCurrency?: 'USD' | 'KGS'; // Валюта доставки ($ или сом, напр. $/кг)
  wholesalePriceUSD: number; // Wholesale selling price per unit in Target Currency
  retailPriceUSD: number;    // Retail selling price per unit in Target Currency
  imageUrl?: string;         // Фото товара (URL or base64)
  isSaved?: boolean;         // Сохранен ли товар (заблокирован ли от несанкционированных изменений/удаления)
}

export interface ShipmentBatch {
  id: string;
  name: string;
  createdAt: string;
  currencyRateCNYtoUSD: number; // ¥ to $ exchange rate
  currencyRateCNYtoKGS: number; // ¥ to сом exchange rate (KGS)
  currencyRateUSDtoKGS: number; // $ to сом exchange rate (USD to KGS)
  targetCurrency: 'USD' | 'KGS';
  products: Product[];
  isRatesSaved?: boolean; // Сохранены и заблокированы ли курсы валют партии
}

export interface AppSettings {
  passwordHash: string; // password for access
  isAuthEnabled: boolean;
  defaultCNYtoUSD: number;
  defaultCNYtoKGS: number;
  defaultUSDtoKGS: number;
  defaultTargetCurrency: 'USD' | 'KGS';
}

export interface DebtPayment {
  id: string;
  amount: number;
  date: string;
  note?: string;
}

export interface DebtRecord {
  id: string;
  debtorName: string;         // Имя должника / Покупателя
  phone?: string;             // Телефон / контакт
  productName?: string;       // Наименование товара или примечание
  quantity?: number;          // Кол-во
  totalAmount: number;        // Изначальный размер долга
  paidAmount: number;         // Сумма выплаченных средств
  currency: 'KGS' | 'USD';    // Валюта долга ('KGS' = сом, 'USD' = $)
  createdAt: string;          // Дата фиксации долга
  dueDate?: string;           // Планируемая дата возврата
  status: 'active' | 'partial' | 'paid'; // Состояние долга
  notes?: string;             // Заметки
  debtorPhotoUrl?: string;    // Фото должника (URL или base64)
  payments: DebtPayment[];    // История выплат
  saleId?: string;            // Ссылка на соответствующую запись продажи
}

export interface SaleItemRecord {
  productId: string;
  productName: string;
  quantity: number;
  priceType: 'wholesale' | 'retail';
  unitPrice: number;
  landedUnitCost: number;
  totalAmount: number;
  totalLandedCost: number;
  profit: number;
}

export interface SaleRecord {
  id: string;
  timestamp: string;          // ISO String e.g. 2026-08-03T18:00:00.000Z
  dateStr: string;            // YYYY-MM-DD
  batchId?: string;
  batchName?: string;
  items: SaleItemRecord[];
  totalRevenue: number;       // Общая выручка
  totalCogs: number;          // Себестоимость проданного товара
  netProfit: number;          // Чистая прибыль
  currency: 'KGS' | 'USD';    // Валюта продажи
  isDebt: boolean;            // В долг или за наличные
  debtorName?: string;        // Покупатель при продаже в долг
  initialPayment?: number;    // Первый взнос
  debtId?: string;            // Ссылка на запись долга
  debtStatus?: 'active' | 'partial' | 'paid'; // Текущий статус выплаты долга
  paidAmountOnDebt?: number;  // Сколько было выплачено по долгу
}

export type OrderStatus = 'new' | 'assembling' | 'shipped' | 'at_pickup_point' | 'delivered' | 'cancelled';

export interface OrderStatusUpdate {
  status: OrderStatus;
  timestamp: string;
  location: string;
  description: string;
}

export interface MarketplaceItem {
  productId: string;
  productName: string;
  imageUrl?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  batchId?: string;
  weight?: number;
}

export interface MarketplaceOrder {
  id: string;
  orderNumber: string;         // e.g. #WB-849204
  trackingNumber: string;      // e.g. WB-KG-984210
  buyerName: string;
  buyerPhone: string;
  buyerEmail?: string;
  items: MarketplaceItem[];
  totalAmount: number;
  currency: 'KGS' | 'USD';
  paymentMethod: 'stripe' | 'cash_on_delivery' | 'mbank_qr';
  paymentStatus: 'paid' | 'pending' | 'failed';
  stripeTransactionId?: string;
  deliveryType: 'pickup_point' | 'courier';
  deliveryAddress?: string;
  pickupPointName?: string;
  status: OrderStatus;
  statusHistory: OrderStatusUpdate[];
  createdAt: string;           // ISO timestamp
  estimatedDeliveryDate: string; // YYYY-MM-DD
  pickupCode: string;          // 4-digit code e.g. 8492
}

export interface PushNotification {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
  type: 'order_status' | 'payment' | 'delivery';
  orderId?: string;
}

