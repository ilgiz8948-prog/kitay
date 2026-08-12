import React, { useState } from 'react';
import { CreditCard, Lock, ShieldCheck, CheckCircle2, AlertCircle, RefreshCw, X, Sparkles } from 'lucide-react';

interface StripeCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalAmount: number;
  currency: 'KGS' | 'USD';
  onSuccess: (stripeTxId: string) => void;
}

export const StripeCheckoutModal: React.FC<StripeCheckoutModalProps> = ({
  isOpen,
  onClose,
  totalAmount,
  currency,
  onSuccess,
}) => {
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'form' | '3dsecure' | 'success'>('form');
  const [errorMsg, setErrorMsg] = useState('');
  const [secureCode, setSecureCode] = useState('');

  if (!isOpen) return null;

  const formatCardNumber = (val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 16);
    return cleaned.replace(/(.{4})/g, '$1 ').trim();
  };

  const formatExpiry = (val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 4);
    if (cleaned.length >= 3) {
      return `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    }
    return cleaned;
  };

  const handleSubmitCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (cardNumber.replace(/\s/g, '').length < 16) {
      setErrorMsg('Введите полный 16-значный номер карты');
      return;
    }
    if (!cardHolder.trim()) {
      setErrorMsg('Укажите имя держателя карты');
      return;
    }
    if (expiry.length < 5) {
      setErrorMsg('Укажите срок действия карты (ММ/ГГ)');
      return;
    }
    if (cvc.length < 3) {
      setErrorMsg('Укажите CVC / CVV код (3 цифры)');
      return;
    }

    setErrorMsg('');
    setIsProcessing(true);

    // Simulate Stripe payment processing & 3D Secure
    setTimeout(() => {
      setIsProcessing(false);
      setStep('3dsecure');
    }, 1200);
  };

  const handleVerify3DSecure = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    setTimeout(() => {
      setIsProcessing(false);
      const txId = `ch_stripe_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      setStep('success');
      setTimeout(() => {
        onSuccess(txId);
      }, 1500);
    }, 1500);
  };

  const symbol = currency === 'KGS' ? 'сом' : '$';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl relative">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 p-5 border-b border-indigo-500/20 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="bg-indigo-600/30 border border-indigo-400/40 p-2 rounded-xl text-indigo-300">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-white">Stripe Payment</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold">
                  256-bit SSL
                </span>
              </div>
              <p className="text-xs text-slate-300">Безопасный эквайринг банковских карт</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Amount bar */}
        <div className="bg-slate-950/60 px-6 py-3 border-b border-slate-800/80 flex justify-between items-center">
          <span className="text-xs text-slate-400">Сумма к оплате:</span>
          <span className="text-xl font-extrabold text-emerald-400">
            {totalAmount.toLocaleString('ru-RU')} {symbol}
          </span>
        </div>

        <div className="p-6">
          {step === 'form' && (
            <form onSubmit={handleSubmitCard} className="space-y-4">
              {/* Virtual Card Preview */}
              <div className="relative bg-gradient-to-tr from-slate-900 via-indigo-950 to-purple-900 border border-indigo-500/30 rounded-xl p-4 text-white shadow-lg overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-1.5 text-xs text-indigo-300 font-medium">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Stripe Secure Pay
                  </div>
                  <CreditCard className="w-7 h-7 text-indigo-300/80" />
                </div>
                <div className="font-mono text-lg tracking-widest mb-4 text-slate-100">
                  {cardNumber || '•••• •••• •••• ••••'}
                </div>
                <div className="flex justify-between items-end text-xs">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase">CARD HOLDER</p>
                    <p className="font-semibold uppercase tracking-wider text-slate-200">
                      {cardHolder || 'CARDHOLDER NAME'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase">EXPIRES</p>
                    <p className="font-semibold font-mono text-slate-200">{expiry || 'MM/YY'}</p>
                  </div>
                </div>
              </div>

              {errorMsg && (
                <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs p-3 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Number */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Номер карты (Visa / MasterCard / Мир)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                    placeholder="4000 1234 5678 9010"
                    maxLength={19}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  <CreditCard className="w-5 h-5 text-slate-500 absolute right-3 top-2.5 pointer-events-none" />
                </div>
              </div>

              {/* Holder */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Имя на карте (как указано на латинице)
                </label>
                <input
                  type="text"
                  value={cardHolder}
                  onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                  placeholder="IVAN IVANOV"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-white uppercase placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Expiry & CVC */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Срок действия
                  </label>
                  <input
                    type="text"
                    value={expiry}
                    onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                    placeholder="MM/YY"
                    maxLength={5}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    CVC / CVV
                  </label>
                  <input
                    type="password"
                    value={cvc}
                    onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="123"
                    maxLength={4}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>Обработка платежа Stripe...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-5 h-5" />
                      <span>Оплатить {totalAmount.toLocaleString('ru-RU')} {symbol}</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-center gap-4 pt-1 text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <Lock className="w-3 h-3 text-emerald-400" /> Stripe Encrypted
                </span>
                <span>•</span>
                <span>Visa / MasterCard Verified</span>
              </div>
            </form>
          )}

          {step === '3dsecure' && (
            <form onSubmit={handleVerify3DSecure} className="space-y-4 text-center py-2">
              <div className="w-12 h-12 bg-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center mx-auto border border-indigo-500/30">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">3D Secure Подтверждение</h3>
                <p className="text-xs text-slate-300 mt-1">
                  На ваш номер телефона отправлен SMS-код подтверждения транзакции от Банка
                </p>
              </div>

              <div className="max-w-[200px] mx-auto">
                <input
                  type="text"
                  value={secureCode}
                  onChange={(e) => setSecureCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="• • • • • •"
                  maxLength={6}
                  autoFocus
                  className="w-full text-center bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-xl tracking-widest font-mono text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">Для теста введите любой код (например: 123456)</p>
              </div>

              <button
                type="submit"
                disabled={isProcessing}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Проверка кода безопасности...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Подтвердить списание</span>
                  </>
                )}
              </button>
            </form>
          )}

          {step === 'success' && (
            <div className="text-center py-6 space-y-3 animate-in zoom-in-95 duration-300">
              <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/40">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-lg font-extrabold text-white">Оплата пройдена успешно!</h3>
              <p className="text-xs text-slate-300 max-w-xs mx-auto">
                Платеж обработан через Stripe. Вашему заказу присвоен статус{' '}
                <span className="text-emerald-400 font-semibold">«Оплачен»</span>.
              </p>
              <div className="bg-slate-950 border border-slate-800 p-3 rounded-lg text-xs font-mono text-slate-400 max-w-xs mx-auto">
                Transaction ID: <span className="text-indigo-300 font-semibold">ch_stripe_ok</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StripeCheckoutModal;
