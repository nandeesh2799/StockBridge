import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import API from '../../api/axiosInstance';
import { toast } from 'sonner';

const LanguageSwitcher = () => {
  const { i18n, t } = useTranslation();

  const languages = [
    { code: 'en', label: 'English', flag: '🇺🇸' },
    { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
    { code: 'kn', label: 'ಕನ್ನಡ', flag: '🇮🇳' },
  ];

  const changeLanguage = async (lng) => {
    try {
      i18n.changeLanguage(lng);
      localStorage.setItem('i18nextLng', lng);
      
      const token = localStorage.getItem('retailflow_token');
      if (token) {
        // Update local storage shop object
        const shopData = localStorage.getItem('retailflow_shop');
        if (shopData) {
          const shop = JSON.parse(shopData);
          shop.language = lng;
          localStorage.setItem('retailflow_shop', JSON.stringify(shop));
        }

        await API.put('/auth/profile', { language: lng });
      }
    } catch (err) {
      console.error('Failed to sync language with backend:', err);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Globe size={18} className="text-slate-400" />
      <select
        value={i18n.language}
        onChange={(e) => changeLanguage(e.target.value)}
        className="bg-slate-900/50 border border-slate-700/50 text-slate-300 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-1.5 outline-none cursor-pointer hover:bg-slate-800 transition-colors font-bold"
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.flag} {lang.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default LanguageSwitcher;
