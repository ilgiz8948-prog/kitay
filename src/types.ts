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
}
