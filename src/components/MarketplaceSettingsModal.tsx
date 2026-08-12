import React, { useState } from 'react';
import { X, Store, MapPin, Clock, Phone, Sparkles, Check, ExternalLink, Save, Building2 } from 'lucide-react';
import { MarketplaceSettings } from '../types';

interface MarketplaceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: MarketplaceSettings;
  onSave: (newSettings: MarketplaceSettings) => void;
  onOpenMarketplace: () => void;
}

export const MarketplaceSettingsModal: React.FC<MarketplaceSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
  onOpenMarketplace,
}) => {
  const [formData, setFormData] = useState<MarketplaceSettings>(settings);
  const [isSavedNotice, setIsSavedNotice] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    setIsSavedNotice(true);
    setTimeout(() => setIsSavedNotice(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Управление Маркетплейсом и ПВЗ</span>
              </h2>
              <p className="text-xs text-slate-400">Настройка адреса пункта выдачи, часов работы и публичной витрины</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* SUCCESS BANNER */}
          {isSavedNotice && (
            <div className="bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 p-3 rounded-2xl flex items-center gap-2.5 animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Настройки маркетплейса и ПВЗ успешно сохранены и обновлены!</span>
            </div>
          )}

          {/* PVZ SETTINGS */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
              <MapPin className="w-4 h-4 text-indigo-400" />
              <span>Пункт выдачи заказов (ПВЗ)</span>
            </h3>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Адрес пункта выдачи (ПВЗ):</label>
              <div className="relative">
                <Building2 className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  value={formData.pvzAddress}
                  onChange={(e) => setFormData({ ...formData, pvzAddress: e.target.value })}
                  placeholder="г. Бишкек, ул. Чуй 128 (ЦУМ)"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 pl-9 pr-3 text-white text-xs outline-none focus:border-indigo-500 font-semibold"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Часы работы ПВЗ:</label>
                <div className="relative">
                  <Clock className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    value={formData.pvzWorkingHours}
                    onChange={(e) => setFormData({ ...formData, pvzWorkingHours: e.target.value })}
                    placeholder="Работаем ежедневно 09:00 - 21:00"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 pl-9 pr-3 text-white text-xs outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Телефон / Ватсап ПВЗ:</label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    value={formData.pvzPhone}
                    onChange={(e) => setFormData({ ...formData, pvzPhone: e.target.value })}
                    placeholder="+996 (555) 123-456"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 pl-9 pr-3 text-white text-xs outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* STOREFRONT BANNER SETTINGS */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Баннер и текстовое оформление витрины</span>
            </h3>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Название магазина / Маркетплейса:</label>
              <input
                type="text"
                value={formData.storeName}
                onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                placeholder="Amperbike.kg"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-white text-xs outline-none focus:border-emerald-500 font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Заголовок главного баннера:</label>
              <input
                type="text"
                value={formData.heroTitle}
                onChange={(e) => setFormData({ ...formData, heroTitle: e.target.value })}
                placeholder="Электротранспорт и качественные товары в наличии в Бишкеке"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-white text-xs outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Подзаголовок баннера:</label>
              <textarea
                rows={2}
                value={formData.heroSubtitle}
                onChange={(e) => setFormData({ ...formData, heroSubtitle: e.target.value })}
                placeholder="Официальный каталог Amperbike.kg с прямой гарантией склада..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white text-xs outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* ACTIONS */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenMarketplace();
              }}
              className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl flex items-center justify-center gap-2 transition-all border border-slate-700"
            >
              <ExternalLink className="w-4 h-4 text-emerald-400" />
              <span>Открыть витрину клиентов</span>
            </button>

            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-extrabold rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Сохранить настройки ПВЗ</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MarketplaceSettingsModal;
