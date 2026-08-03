import React, { useState } from 'react';
import { 
  X, 
  Printer, 
  Copy, 
  Check, 
  Share2, 
  Receipt, 
  Calendar, 
  User, 
  Phone, 
  Package, 
  DollarSign, 
  Send,
  Building2,
  FileCheck
} from 'lucide-react';
import { SaleRecord } from '../types';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: SaleRecord | null;
  currencySymbol: string;
  storeName?: string;
  sellerPhone?: string;
}

export default function ReceiptModal({
  isOpen,
  onClose,
  sale,
  currencySymbol,
  storeName = 'SinoCalc Commerce',
  sellerPhone = '+996 ___ ___ ___'
}: ReceiptModalProps) {
  const [copiedText, setCopiedText] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen || !sale) return null;

  // Formatting utilities
  const formatMoney = (amount: number) => {
    return (amount || 0).toLocaleString('ru-RU');
  };

  const receiptDate = sale.dateStr 
    ? new Date(sale.dateStr).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : new Date(sale.timestamp || Date.now()).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const receiptTime = sale.timestamp 
    ? new Date(sale.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    : '12:00';

  const receiptNumber = `ЧЕК-${sale.id.slice(-6).toUpperCase()}`;

  // Build items list
  const items = sale.items && sale.items.length > 0 ? sale.items : [
    {
      productId: '1',
      productName: 'Товар',
      quantity: 1,
      priceType: 'retail' as const,
      unitPrice: sale.totalRevenue || 0,
      landedUnitCost: sale.totalCogs || 0,
      totalAmount: sale.totalRevenue || 0,
      totalLandedCost: sale.totalCogs || 0,
      profit: sale.netProfit || 0
    }
  ];

  const totalPcs = items.reduce((acc, item) => acc + item.quantity, 0);

  // Formatted Text Receipt for WhatsApp / Telegram / SMS
  const generatePlainTextReceipt = () => {
    const lines = [];
    lines.push(`🧾 *ТОВАРНЫЙ ЧЕК № ${receiptNumber}*`);
    lines.push(`📅 Дата: ${receiptDate} ${receiptTime}`);
    lines.push(`🏪 Продавец: ${storeName}`);
    if (sale.batchName) {
      lines.push(`📦 Партия: ${sale.batchName}`);
    }
    if (sale.debtorName) {
      lines.push(`👤 Покупатель: ${sale.debtorName}`);
    }
    lines.push(`─────────────────────────`);
    lines.push(`*ПОЗИЦИИ В ЧЕКЕ:*`);
    
    items.forEach((item, index) => {
      const typeLabel = item.priceType === 'wholesale' ? '(Опт)' : '(Розница)';
      lines.push(`${index + 1}. *${item.productName}*`);
      lines.push(`   ${item.quantity} шт × ${formatMoney(item.unitPrice)} ${currencySymbol} ${typeLabel} = *${formatMoney(item.totalAmount)} ${currencySymbol}*`);
    });

    lines.push(`─────────────────────────`);
    lines.push(`📊 *ИТОГО:*`);
    lines.push(`• Позиций: ${items.length} (всего ${totalPcs} шт)`);
    lines.push(`• *Сумма к оплате: ${formatMoney(sale.totalRevenue)} ${currencySymbol}*`);

    if (sale.isDebt) {
      lines.push(`• Оплата: 📝 В ДОЛГ`);
      if (sale.initialPayment && sale.initialPayment > 0) {
        lines.push(`• Первоначальный взнос: ${formatMoney(sale.initialPayment)} ${currencySymbol}`);
        lines.push(`• *Остаток долга: ${formatMoney(sale.totalRevenue - sale.initialPayment)} ${currencySymbol}*`);
      }
    } else {
      lines.push(`• Оплата: 💵 Наличные (Оплачено сполна)`);
    }

    lines.push(`─────────────────────────`);
    lines.push(`🙏 Спасибо за покупку!`);
    
    return lines.join('\n');
  };

  const handleCopyText = () => {
    const text = generatePlainTextReceipt();
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(generatePlainTextReceipt());
    const url = `https://api.whatsapp.com/send?text=${text}`;
    window.open(url, '_blank');
  };

  const handleTelegramShare = () => {
    const text = encodeURIComponent(generatePlainTextReceipt());
    const url = `https://t.me/share/url?url=&text=${text}`;
    window.open(url, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[70] flex items-center justify-center p-2 sm:p-4 animate-fadeIn">
      
      {/* Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[96vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* HEADER TOOLBAR (Screen Only) */}
        <div className="print:hidden p-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between gap-3 flex-wrap flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <span>Товарный чек</span>
                <span className="text-xs text-emerald-400 font-mono font-normal">#{receiptNumber}</span>
              </h3>
              <p className="text-[11px] text-slate-400">Готов для печати или отправки клиенту</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
              title="Распечатать чек на принтере"
            >
              <Printer className="w-4 h-4 text-blue-400" />
              <span className="hidden sm:inline">Печать</span>
            </button>

            <button
              onClick={handleWhatsAppShare}
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-emerald-950/40"
              title="Отправить чек в WhatsApp клиенту"
            >
              <Send className="w-4 h-4" />
              <span>WhatsApp</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-xl transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MODAL BODY / PRINTABLE AREA */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-950/50">
          
          {/* THE ACTUAL RECEIPT CARD (Styled cleanly for print and screen) */}
          <div 
            id="printable-receipt" 
            className="printable-receipt bg-white text-slate-900 rounded-2xl p-6 sm:p-8 space-y-5 border border-slate-200 shadow-xl font-sans text-sm"
          >
            {/* STORE BRANDING & RECEIPT HEADER */}
            <div className="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                  <Building2 className="w-6 h-6 text-slate-900 print:hidden" />
                  <span>ТОВАРНЫЙ ЧЕК</span>
                </h1>
                <p className="text-xs text-slate-600 font-medium mt-0.5">
                  Накладная продажи товаров • {storeName}
                </p>
              </div>

              <div className="text-left sm:text-right font-mono text-xs text-slate-700 space-y-0.5">
                <p className="font-bold text-slate-900 text-sm">{receiptNumber}</p>
                <p>Дата: <strong>{receiptDate}</strong></p>
                <p>Время: <strong>{receiptTime}</strong></p>
              </div>
            </div>

            {/* DETAILS METADATA GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Покупатель / Клиент</span>
                <span className="font-bold text-slate-900 text-sm">
                  {sale.debtorName ? sale.debtorName : 'Частный покупатель (Розница/Опт)'}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Форма оплаты</span>
                <span className={`font-bold inline-block ${sale.isDebt ? 'text-amber-800' : 'text-emerald-800'}`}>
                  {sale.isDebt ? '📝 Продажа в долг' : '💵 Оплата наличными'}
                </span>
              </div>

              {sale.batchName && (
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Партия товара</span>
                  <span className="font-medium text-slate-800">{sale.batchName}</span>
                </div>
              )}

              {sale.isDebt && sale.initialPayment !== undefined && sale.initialPayment > 0 && (
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Первоначальный взнос</span>
                  <span className="font-bold text-emerald-700">{formatMoney(sale.initialPayment)} {currencySymbol}</span>
                </div>
              )}
            </div>

            {/* TABLE OF ITEMS */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-900 bg-slate-100 text-slate-900 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-2 px-2 text-center w-8">№</th>
                    <th className="py-2 px-2">Наименование товара</th>
                    <th className="py-2 px-2 text-center">Тип</th>
                    <th className="py-2 px-2 text-center">Кол-во</th>
                    <th className="py-2 px-2 text-right">Цена</th>
                    <th className="py-2 px-2 text-right">Сумма</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono text-xs">
                  {items.map((item, index) => (
                    <tr key={index} className="hover:bg-slate-50">
                      <td className="py-2.5 px-2 text-center text-slate-500 font-bold">{index + 1}</td>
                      <td className="py-2.5 px-2 font-sans font-semibold text-slate-900">{item.productName}</td>
                      <td className="py-2.5 px-2 text-center text-[11px] text-slate-600">
                        {item.priceType === 'wholesale' ? 'Опт' : 'Розн'}
                      </td>
                      <td className="py-2.5 px-2 text-center font-bold text-slate-900">{item.quantity} шт</td>
                      <td className="py-2.5 px-2 text-right text-slate-700">{formatMoney(item.unitPrice)} {currencySymbol}</td>
                      <td className="py-2.5 px-2 text-right font-bold text-slate-900">{formatMoney(item.totalAmount)} {currencySymbol}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* TOTALS SUMMARY BLOCK */}
            <div className="border-t-2 border-slate-900 pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="text-xs text-slate-600 font-mono space-y-0.5">
                <p>Всего наименований: <strong>{items.length}</strong></p>
                <p>Общее количество: <strong>{totalPcs} шт.</strong></p>
              </div>

              <div className="bg-slate-100 p-4 rounded-xl border border-slate-300 text-right space-y-1 font-mono">
                <div className="text-xs text-slate-600">ИТОГО К ОПЛАТЕ:</div>
                <div className="text-2xl font-black text-slate-900">
                  {formatMoney(sale.totalRevenue)} <span className="text-base font-normal">{currencySymbol}</span>
                </div>
                {sale.isDebt && (
                  <div className="text-xs text-amber-800 pt-1 border-t border-slate-300 font-bold">
                    Остаток долга: {formatMoney(sale.totalRevenue - (sale.initialPayment || 0))} {currencySymbol}
                  </div>
                )}
              </div>
            </div>

            {/* SIGNATURE & STAMP FOOTER */}
            <div className="pt-6 border-t border-slate-300 grid grid-cols-2 gap-8 text-xs text-slate-700 pt-8">
              <div className="space-y-6">
                <p className="font-medium">Отпустил (Продавец):</p>
                <div className="border-b border-slate-400 w-full pt-4"></div>
                <p className="text-[10px] text-slate-500 text-center">(подпись / ФИО)</p>
              </div>

              <div className="space-y-6">
                <p className="font-medium">Получил (Покупатель):</p>
                <div className="border-b border-slate-400 w-full pt-4"></div>
                <p className="text-[10px] text-slate-500 text-center">(подпись / ФИО)</p>
              </div>
            </div>

            {/* THANK YOU NOTE */}
            <div className="text-center pt-2 text-[11px] text-slate-500 font-serif italic border-t border-slate-200">
              Благодарим за покупку! Претензии по количеству и качеству принимаются в момент получения.
            </div>

          </div>

          {/* QUICK ACTIONS BAR BELOW RECEIPT (Screen only) */}
          <div className="print:hidden bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Share2 className="w-4 h-4 text-emerald-400" />
              <span>Быстрые способы отправить чек клиенту:</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                onClick={handleWhatsAppShare}
                className="p-3 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-800/80 rounded-xl text-xs font-bold text-emerald-300 flex items-center justify-center gap-2 transition-all"
              >
                <Send className="w-4 h-4 text-emerald-400" />
                <span>В WhatsApp</span>
              </button>

              <button
                onClick={handleTelegramShare}
                className="p-3 bg-blue-950/60 hover:bg-blue-900/80 border border-blue-800/80 rounded-xl text-xs font-bold text-blue-300 flex items-center justify-center gap-2 transition-all"
              >
                <Send className="w-4 h-4 text-blue-400" />
                <span>В Telegram</span>
              </button>

              <button
                onClick={handleCopyText}
                className="p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-bold text-slate-200 flex items-center justify-center gap-2 transition-all"
              >
                {copiedText ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400">Скопировано!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-400" />
                    <span>Скопировать текст</span>
                  </>
                )}
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* PRINT STYLES standard injection for full page printing */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-receipt, #printable-receipt * {
            visibility: visible;
          }
          #printable-receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 20px;
            box-shadow: none !important;
            border: 1px solid #000 !important;
          }
        }
      `}</style>
    </div>
  );
}
