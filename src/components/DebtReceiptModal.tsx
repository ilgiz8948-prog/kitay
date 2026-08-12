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
  FileCheck,
  AlertCircle,
  Clock,
  CheckCircle2,
  Coins,
  FileText
} from 'lucide-react';
import { DebtRecord } from '../types';

interface DebtReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  debt: DebtRecord | null;
  currencySymbol?: string;
  storeName?: string;
  sellerPhone?: string;
}

export default function DebtReceiptModal({
  isOpen,
  onClose,
  debt,
  currencySymbol = 'сом',
  storeName = 'БИЗНЕС СКЛАД',
  sellerPhone = '+996 ___ ___ ___'
}: DebtReceiptModalProps) {
  const [copiedText, setCopiedText] = useState(false);

  if (!isOpen || !debt) return null;

  const symbol = debt.currency === 'USD' ? '$' : (currencySymbol || 'сом');

  const formatMoney = (amount: number) => {
    return (amount || 0).toLocaleString('ru-RU');
  };

  const receiptNumber = `ЧЕК-Д-${debt.id.slice(-6).toUpperCase()}`;
  const remainingDebt = Math.max(0, debt.totalAmount - debt.paidAmount);
  const percentPaid = debt.totalAmount > 0 
    ? Math.min(100, Math.round((debt.paidAmount / debt.totalAmount) * 100)) 
    : 100;

  // Formatted Text Receipt for WhatsApp / Telegram / SMS
  const generatePlainTextReceipt = () => {
    const lines: string[] = [];
    lines.push(`🧾 *АКТ СВЕРКИ ЗАДОЛЖЕННОСТИ № ${receiptNumber}*`);
    lines.push(`🏪 Продавец: *${storeName}*`);
    if (sellerPhone && !sellerPhone.includes('___')) {
      lines.push(`📞 Тел. продавца: ${sellerPhone}`);
    }
    lines.push(`📅 Дата фиксации: ${debt.createdAt}`);
    if (debt.dueDate) {
      lines.push(`⏳ Срок оплаты: *${debt.dueDate}*`);
    }
    lines.push(`─────────────────────────`);
    lines.push(`👤 *ПОКУПАТЕЛЬ / ДОЛЖНИК:*`);
    lines.push(`Имя: *${debt.debtorName}*`);
    if (debt.phone) {
      lines.push(`Телефон: ${debt.phone}`);
    }
    lines.push(`─────────────────────────`);
    lines.push(`📦 *ПРЕДМЕТ ЗАДОЛЖЕННОСТИ:*`);
    lines.push(`Товар/Услуга: *${debt.productName || 'Товар в рассрочку/долг'}*`);
    if (debt.quantity && debt.quantity > 1) {
      lines.push(`Количество: ${debt.quantity} шт.`);
    }
    lines.push(`─────────────────────────`);
    lines.push(`📊 *ФИНАНСОВЫЙ БАЛАНС:*`);
    lines.push(`• Первоначальная сумма долга: *${formatMoney(debt.totalAmount)} ${symbol}*`);
    lines.push(`• Внесено (погашено): *${formatMoney(debt.paidAmount)} ${symbol}* (${percentPaid}%)`);
    lines.push(`• *ОСТАТОК К ОПЛАТЕ: ${formatMoney(remainingDebt)} ${symbol}*`);
    
    if (debt.payments && debt.payments.length > 0) {
      lines.push(`─────────────────────────`);
      lines.push(`📝 *ИСТОРИЯ ВНЕСЕННЫХ ОПЛАТ:*`);
      debt.payments.forEach((p, idx) => {
        lines.push(`${idx + 1}. ${p.date}: +${formatMoney(p.amount)} ${symbol} ${p.note ? `(${p.note})` : ''}`);
      });
    }

    if (debt.notes) {
      lines.push(`─────────────────────────`);
      lines.push(`💬 Примечание: "${debt.notes}"`);
    }

    lines.push(`─────────────────────────`);
    if (remainingDebt > 0) {
      lines.push(`⚠️ *Уважаемый(ая) ${debt.debtorName}!*`);
      lines.push(`Просим произвести оплату остатка долга в размере *${formatMoney(remainingDebt)} ${symbol}*.`);
    } else {
      lines.push(`🎉 *Долг полностью погашен! Спасибо за своевременную оплату.*`);
    }

    return lines.join('\n');
  };

  const handleCopyText = () => {
    const text = generatePlainTextReceipt();
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
  };

  const handleSendWhatsApp = () => {
    const text = generatePlainTextReceipt();
    let cleanPhone = (debt.phone || '').replace(/[^0-9]/g, '');
    if (cleanPhone.length === 9) {
      cleanPhone = `996${cleanPhone}`;
    }
    const encodedText = encodeURIComponent(text);
    
    if (cleanPhone) {
      window.open(`https://wa.me/${cleanPhone}?text=${encodedText}`, '_blank');
    } else {
      window.open(`https://api.whatsapp.com/send?text=${encodedText}`, '_blank');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShareWeb = async () => {
    const text = generatePlainTextReceipt();
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Чек долга - ${debt.debtorName}`,
          text: text
        });
      } catch (e) {
        // Fallback to copy
        handleCopyText();
      }
    } else {
      handleCopyText();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fadeIn">
      {/* Printable Area Specific CSS */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #debt-receipt-printable, #debt-receipt-printable * {
            visibility: visible;
          }
          #debt-receipt-printable {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            max-width: 80mm;
            background: white !important;
            color: black !important;
            padding: 10px !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto">
        
        {/* Modal Header */}
        <div className="no-print p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white leading-tight">
                Чек задолженности клиента
              </h3>
              <p className="text-xs text-slate-400">
                Акт сверки для отправки клиенту в WhatsApp или печати
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Receipt View */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto max-h-[70vh]">
          
          {/* Action Buttons Top Bar */}
          <div className="no-print grid grid-cols-2 sm:grid-cols-3 gap-2">
            <button
              onClick={handleSendWhatsApp}
              className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all col-span-2 sm:col-span-1"
            >
              <Send className="w-4 h-4" />
              <span>WhatsApp</span>
            </button>

            <button
              onClick={handleCopyText}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs flex items-center justify-center gap-2 border border-slate-700 transition-all"
            >
              {copiedText ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400 font-bold">Скопировано!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-amber-400" />
                  <span>Скопировать</span>
                </>
              )}
            </button>

            <button
              onClick={handlePrint}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs flex items-center justify-center gap-2 border border-slate-700 transition-all"
            >
              <Printer className="w-4 h-4 text-blue-400" />
              <span>Печать</span>
            </button>
          </div>

          {/* THE THERMAL / PAPER RECEIPT CONTAINER */}
          <div
            id="debt-receipt-printable"
            className="bg-white text-slate-900 rounded-2xl p-5 sm:p-6 font-mono text-xs shadow-xl relative border border-slate-200 space-y-4 select-text"
          >
            {/* Header / Store Brand */}
            <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-300">
              <div className="flex items-center justify-center gap-1.5 font-sans font-black text-slate-900 text-base uppercase tracking-wider">
                <Building2 className="w-5 h-5 text-slate-800 inline" />
                <span>{storeName}</span>
              </div>
              <p className="text-[11px] text-slate-600 font-sans">
                Акт сверки расчетов и задолженности
              </p>
              <div className="text-[10px] text-slate-500 pt-0.5">
                {receiptNumber} • {debt.createdAt}
              </div>
            </div>

            {/* Debtor Info */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5 font-sans">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">ПОКУПАТЕЛЬ / ДОЛЖНИК</span>
                  <p className="font-bold text-slate-900 text-sm">{debt.debtorName}</p>
                  {debt.phone && (
                    <p className="text-xs text-slate-600 font-mono mt-0.5 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-500 inline" />
                      <span>{debt.phone}</span>
                    </p>
                  )}
                </div>

                {debt.debtorPhotoUrl && (
                  <img
                    src={debt.debtorPhotoUrl}
                    alt={debt.debtorName}
                    className="w-12 h-12 rounded-lg object-cover border border-slate-300 shadow-sm flex-shrink-0"
                  />
                )}
              </div>

              {debt.dueDate && (
                <div className="text-[11px] text-amber-700 bg-amber-50 p-1.5 rounded-lg border border-amber-200 font-mono mt-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>Срок полного возврата: <strong>{debt.dueDate}</strong></span>
                </div>
              )}
            </div>

            {/* Product / Description */}
            <div className="space-y-1 font-sans">
              <span className="text-[10px] text-slate-500 uppercase block font-bold">ОПИСАНИЕ ТОВАРА / УСЛУГИ</span>
              <div className="p-2.5 bg-slate-100 rounded-xl font-medium text-slate-800 text-xs flex items-center justify-between">
                <span className="font-bold">{debt.productName || 'Товар в рассрочку/долг'}</span>
                {debt.quantity && debt.quantity > 1 && (
                  <span className="text-slate-600 font-mono font-bold">x{debt.quantity} шт.</span>
                )}
              </div>
            </div>

            {/* Calculation Table */}
            <div className="space-y-1.5 pt-2 border-t border-dashed border-slate-300">
              <div className="flex justify-between items-center text-slate-600">
                <span>Первоначальный долг:</span>
                <span className="font-bold text-slate-900">{formatMoney(debt.totalAmount)} {symbol}</span>
              </div>
              
              <div className="flex justify-between items-center text-slate-600">
                <span>Внесено / Погашено:</span>
                <span className="font-bold text-emerald-600">+{formatMoney(debt.paidAmount)} {symbol} ({percentPaid}%)</span>
              </div>

              {/* Status Banner */}
              <div className={`p-3 rounded-xl border mt-2 text-center font-sans ${
                remainingDebt === 0 
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900' 
                  : debt.paidAmount > 0 
                  ? 'bg-amber-50 border-amber-300 text-amber-900' 
                  : 'bg-rose-50 border-rose-300 text-rose-900'
              }`}>
                <span className="text-[10px] uppercase font-bold block opacity-80">
                  {remainingDebt === 0 ? 'СТАТУС ДОЛГА' : 'ТЕКУЩИЙ ОСТАТОК К ОПЛАТЕ'}
                </span>
                <p className="text-xl font-black font-mono mt-0.5">
                  {remainingDebt === 0 ? (
                    <span className="flex items-center justify-center gap-1 text-emerald-700">
                      <CheckCircle2 className="w-5 h-5 inline" />
                      ПОЛНОСТЬЮ ПОГАШЕН
                    </span>
                  ) : (
                    <span>{formatMoney(remainingDebt)} {symbol}</span>
                  )}
                </p>
              </div>
            </div>

            {/* Payment History List if any */}
            {debt.payments && debt.payments.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-dashed border-slate-300 font-sans">
                <span className="text-[10px] text-slate-500 uppercase block font-bold">ИСТОРИЯ ВНЕСЕНИЯ ПЛАТЕЖЕЙ</span>
                <div className="space-y-1 text-[11px] font-mono">
                  {debt.payments.map((p, idx) => (
                    <div key={p.id || idx} className="flex justify-between items-center bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                      <span className="text-slate-600">{p.date}</span>
                      <div className="text-right">
                        <span className="font-bold text-emerald-600">+{formatMoney(p.amount)} {symbol}</span>
                        {p.note && <span className="text-[9px] text-slate-500 block italic">{p.note}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes if available */}
            {debt.notes && (
              <div className="text-[11px] text-slate-600 italic bg-slate-50 p-2 rounded-lg border border-slate-200">
                💬 "{debt.notes}"
              </div>
            )}

            {/* Footer Notice */}
            <div className="text-center pt-3 border-t border-dashed border-slate-300 text-[10px] text-slate-500 space-y-1 font-sans">
              <p className="font-bold text-slate-700">
                Уважаемый(ая) {debt.debtorName}, спасибо за сотрудничество!
              </p>
              <p>
                По вопросам сверки расчетов обращайтесь по тел: {sellerPhone}
              </p>
              {/* Decorative Barcode */}
              <div className="pt-2 flex flex-col items-center justify-center gap-0.5 opacity-60">
                <div className="h-6 w-48 bg-slate-800 rounded-xs flex items-center justify-around px-1">
                  {Array.from({ length: 24 }).map((_, i) => (
                    <div key={i} className={`h-full bg-white ${i % 3 === 0 ? 'w-1' : i % 2 === 0 ? 'w-0.5' : 'w-1.5'}`} />
                  ))}
                </div>
                <span className="text-[9px] font-mono tracking-widest text-slate-500">{receiptNumber}</span>
              </div>
            </div>

          </div>

        </div>

        {/* Modal Footer */}
        <div className="no-print p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <button
            onClick={handleSendWhatsApp}
            className="px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
          >
            <Send className="w-4 h-4" />
            <span>Отправить клиенту в WhatsApp</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs transition-colors"
          >
            Закрыть
          </button>
        </div>

      </div>
    </div>
  );
}
