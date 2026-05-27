import React, { useState, useEffect } from 'react';
import { useAuthStore, User } from '../store/authStore';
import axios from 'axios';
import { 
  User as UserIcon, 
  Shield, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  Trash2, 
  Check, 
  X, 
  Edit3, 
  CreditCard, 
  Unlock, 
  Building, 
  Globe, 
  Camera, 
  Info,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

export const ProfilePage = () => {
  const { user, updateProfile, checkAuth } = useAuthStore();
  
  // Profile Form States
  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatarUrl || null);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  // Payment Methods States
  const [paymentMethods, setPaymentMethods] = useState<any[]>(user?.paymentMethods || []);
  const [isAddingMethod, setIsAddingMethod] = useState(false);
  const [editingMethodId, setEditingMethodId] = useState<string | null>(null);
  const [pmBankName, setPmBankName] = useState('CBE');
  const [pmAccountName, setPmAccountName] = useState('');
  const [pmAccountNumber, setPmAccountNumber] = useState('');
  const [pmIsDefault, setPmIsDefault] = useState(false);
  const [pmError, setPmError] = useState('');
  const [isLoadingPM, setIsLoadingPM] = useState(false);

  const getPaymentMethodLabel = (code: string) => {
    const key = code.trim().toUpperCase();
    switch (key) {
      case 'CBE': return 'Commercial Bank of Ethiopia (CBE)';
      case 'TELEBIRR': return 'Telebirr (Mobile Wallet)';
      case 'ABYSSINIA': return 'Bank of Abyssinia (BoA)';
      case 'DASHEN': return 'Dashen Bank';
      case 'AWASH': return 'Awash Bank';
      case 'CBE BIRR': return 'CBE Birr Wallet';
      default: return code;
    }
  };

  // Load latest payment methods
  const fetchPaymentMethods = async () => {
    try {
      const res = await axios.get('/api/user/payment-methods');
      setPaymentMethods(res.data);
    } catch (err) {
      console.error('Failed to get payment methods', err);
    }
  };

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    setProfileSuccess('');
    setProfileError('');

    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('bio', bio);
      if (avatarFile) {
        formData.append('avatar', avatarFile);
      }

      await updateProfile(formData);
      setProfileSuccess('Profile updated successfully!');
      setTimeout(() => setProfileSuccess(''), 4000);
    } catch (err: any) {
      setProfileError(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleAddPaymentMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pmAccountName || !pmAccountNumber) {
      setPmError('Please complete all account fields');
      return;
    }
    setPmError('');
    setIsLoadingPM(true);

    try {
      const payload = {
        bankName: pmBankName.trim().toUpperCase(),
        accountName: pmAccountName,
        accountNumber: pmAccountNumber,
        isDefault: pmIsDefault
      };

      if (editingMethodId) {
        // Edit existing payment method
        const res = await axios.put(`/api/user/payment-methods/${editingMethodId}`, payload);
        setPaymentMethods(res.data);
        setEditingMethodId(null);
      } else {
        // Add new payment method
        const res = await axios.post('/api/user/payment-methods', payload);
        setPaymentMethods(res.data);
      }

      await checkAuth();

      // Reset form
      setPmBankName('CBE');
      setPmAccountName('');
      setPmAccountNumber('');
      setPmIsDefault(false);
      setIsAddingMethod(false);
    } catch (err: any) {
      setPmError(err.response?.data?.error || 'Failed to save payment method');
    } finally {
      setIsLoadingPM(false);
    }
  };

  const handleStartEdit = (method: any) => {
    setEditingMethodId(method.id);
    setPmBankName(method.bankName.trim().toUpperCase());
    setPmAccountName(method.accountName);
    setPmAccountNumber(method.accountNumber);
    setPmIsDefault(method.isDefault);
    setIsAddingMethod(true);
  };

  const handleDeleteMethod = async (id: string) => {
    if (!confirm('Are you sure you want to delete this payment method?')) return;
    try {
      const res = await axios.delete(`/api/user/payment-methods/${id}`);
      setPaymentMethods(res.data);
      await checkAuth();
    } catch (err) {
      alert('Deletion failed');
    }
  };

  const handleToggleMethod = async (id: string) => {
    try {
      const res = await axios.patch(`/api/user/payment-methods/${id}/toggle`);
      // Update local state
      setPaymentMethods(paymentMethods.map(m => m.id === id ? { ...m, isEnabled: res.data.isEnabled } : m));
      await checkAuth();
    } catch (err) {
      alert('Toggle status failed');
    }
  };

  const handleSetDefaultMethod = async (id: string) => {
    try {
      const res = await axios.post(`/api/user/payment-methods/${id}/default`);
      setPaymentMethods(res.data);
      await checkAuth();
    } catch (err) {
      alert('Setting default failed');
    }
  };

  return (
    <div className="space-y-8" id="zemen-profile-page-root">
      {/* Page Title & Status Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-zinc-900/40 p-6 rounded-2xl border border-zinc-800">
        <div className="flex items-center gap-4">
          <div className="relative w-20 h-20 rounded-full bg-zinc-850 border-2 border-orange-500 overflow-hidden shrink-0 flex items-center justify-center">
            {avatarPreview ? (
              <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <UserIcon className="w-10 h-10 text-zinc-500" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">{user?.name || user?.email.split('@')[0]}</h1>
            <p className="text-sm text-zinc-400 mt-1">{user?.email}</p>
            <div className="flex flex-wrap items-center gap-2 mt-2.5">
              {/* Account Type Badge */}
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                user?.accountType === 'merchant' 
                  ? 'bg-orange-600/20 text-orange-400 border border-orange-500/30' 
                  : 'bg-zinc-800 text-zinc-400 border border-zinc-700/50'
              }`}>
                {user?.accountType === 'merchant' ? '👑 Merchant Layer' : 'User Member'}
              </span>

              {/* Verification Status Badge */}
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1 ${
                user?.verificationStatus === 'verified'
                  ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                  : user?.verificationStatus === 'pending'
                  ? 'bg-yellow-600/20 text-yellow-400 border border-yellow-500/30'
                  : 'bg-red-600/20 text-red-400 border border-red-500/30'
              }`}>
                {user?.verificationStatus === 'verified' && <CheckCircle2 className="w-3.5 h-3.5" />}
                {user?.verificationStatus === 'pending' && <Info className="w-3.5 h-3.5" />}
                {user?.verificationStatus === 'unverified' && <AlertCircle className="w-3.5 h-3.5" />}
                {user?.verificationStatus || 'unverified'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* EDIT PROFILE PORTION */}
        <div className="lg:col-span-1 bg-zinc-950 rounded-2xl border border-zinc-800 p-6 space-y-6">
          <div className="flex items-center gap-2 border-b border-zinc-900 pb-4">
            <Edit3 className="w-5 h-5 text-orange-500" />
            <h2 className="text-md font-bold text-white uppercase tracking-wider">Profile Information</h2>
          </div>

          <form onSubmit={handleProfileSubmit} className="space-y-4 text-xs">
            {profileSuccess && (
              <div className="p-3 bg-emerald-950/40 border border-emerald-800 text-emerald-400 rounded-lg font-medium">
                {profileSuccess}
              </div>
            )}
            {profileError && (
              <div className="p-3 bg-red-950/40 border border-red-800 text-red-400 rounded-lg font-medium">
                {profileError}
              </div>
            )}

            {/* Change Avatar Picker */}
            <div className="space-y-2">
              <label className="text-zinc-400 font-bold block mb-1">Profile Photo</label>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden flex items-center justify-center shrink-0">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="w-5 h-5 text-zinc-600" />
                  )}
                </div>
                <label className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white rounded-lg cursor-pointer font-bold select-none transition-colors">
                  Upload Avatar
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Display Name Input */}
            <div className="space-y-1.5">
              <label className="text-zinc-400 font-bold block">Display Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter display name"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500 font-medium"
              />
            </div>

            {/* Bio Input */}
            <div className="space-y-1.5">
              <label className="text-zinc-400 font-bold block">About / Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Write a brief profile description..."
                rows={4}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500 font-medium resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={isUpdatingProfile}
              className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-2.5 rounded-xl transition-all disabled:opacity-50 uppercase tracking-wider"
            >
              {isUpdatingProfile ? 'Saving updates...' : 'Save Profile Changes'}
            </button>
          </form>
        </div>

        {/* PAYMENT METHODS PORTION */}
        <div className="lg:col-span-2 bg-zinc-950 rounded-2xl border border-zinc-800 p-6 space-y-6">
          <div className="flex justify-between items-center border-b border-zinc-900 pb-4">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-orange-500" />
              <h2 className="text-md font-bold text-white uppercase tracking-wider">Saved Payment Methods</h2>
            </div>
            {!isAddingMethod && (
              <button
                onClick={() => {
                  setEditingMethodId(null);
                  setPmAccountName('');
                  setPmAccountNumber('');
                  setPmIsDefault(false);
                  setIsAddingMethod(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600/10 hover:bg-orange-600/20 text-orange-500 border border-orange-500/20 hover:border-orange-500/40 rounded-xl font-bold text-xs transition-all"
              >
                <Plus className="w-4 h-4" /> Add Method
              </button>
            )}
          </div>

          {/* Form to Add / Edit Payment Method */}
          {isAddingMethod && (
            <form onSubmit={handleAddPaymentMethod} className="bg-zinc-900/40 border border-orange-500/20 p-5 rounded-2xl space-y-4 text-xs">
              <h3 className="text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center justify-between">
                <span>{editingMethodId ? 'Edit Payment Account' : 'New Payment Account'}</span>
                <button 
                  type="button" 
                  onClick={() => setIsAddingMethod(false)}
                  className="p-1 hover:bg-zinc-800 rounded-full text-zinc-500 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </h3>

              {pmError && (
                <div className="p-3 bg-red-950/40 border border-red-800 text-red-400 rounded-lg">
                  {pmError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-1">
                  <label className="text-zinc-400 font-bold block">Method/Bank Name</label>
                  <select
                    value={pmBankName}
                    onChange={(e) => setPmBankName(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-orange-500 font-medium"
                  >
                    <option value="CBE">Commercial Bank of Ethiopia (CBE)</option>
                    <option value="TELEBIRR">Telebirr (Mobile Wallet)</option>
                    <option value="ABYSSINIA">Bank of Abyssinia (BoA)</option>
                    <option value="DASHEN">Dashen Bank</option>
                    <option value="AWASH">Awash Bank</option>
                    <option value="CBE BIRR">CBE Birr Wallet</option>
                  </select>
                </div>

                <div className="space-y-1.5 col-span-1">
                  <label className="text-zinc-400 font-bold block">Account Holder Name</label>
                  <input
                    type="text"
                    value={pmAccountName}
                    onChange={(e) => setPmAccountName(e.target.value)}
                    placeholder="Enter full name"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <div className="space-y-1.5 col-span-1">
                  <label className="text-zinc-400 font-bold block">Account / Mobile Number</label>
                  <input
                    type="text"
                    value={pmAccountNumber}
                    onChange={(e) => setPmAccountNumber(e.target.value)}
                    placeholder="Enter account/wallet digit"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500 font-medium"
                  />
                </div>

                <div className="flex items-center gap-2 col-span-1 h-full pt-4">
                  <input
                    type="checkbox"
                    id="pmIsDefault"
                    checked={pmIsDefault}
                    onChange={(e) => setPmIsDefault(e.target.checked)}
                    className="w-4 h-4 text-orange-600 bg-zinc-900 border-zinc-800 rounded focus:ring-orange-500"
                  />
                  <label htmlFor="pmIsDefault" className="text-zinc-400 font-bold select-none cursor-pointer">
                    Set as preferred default option
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingMethod(false)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoadingPM}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl transition-all"
                >
                  {isLoadingPM ? 'Saving...' : (editingMethodId ? 'Update Method' : 'Add Bank Method')}
                </button>
              </div>
            </form>
          )}

          {/* List of current payment methods */}
          <div className="space-y-3.5">
            {paymentMethods.length === 0 ? (
              <div className="p-8 text-center bg-zinc-900/20 border border-dashed border-zinc-800 rounded-2xl text-zinc-500 text-sm">
                <CreditCard className="w-10 h-10 mx-auto mb-2 opacity-30 text-zinc-400" />
                <p className="font-bold text-zinc-400">No payment accounts found</p>
                <p className="text-xs text-zinc-600 mt-1">Please configure at least one bank account to trade seamlessly.</p>
              </div>
            ) : (
              paymentMethods.map((method) => (
                <div 
                  key={method.id} 
                  className={`p-4 border rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all ${
                    method.isDefault 
                      ? 'bg-orange-950/20 border-orange-500/40' 
                      : method.isEnabled
                      ? 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700/80'
                      : 'bg-zinc-950/30 border-zinc-900 opacity-60'
                  }`}
                >
                  <div className="flex items-start gap-3 text-xs">
                    <div className={`p-2 rounded-xl shrink-0 ${
                      method.isDefault ? 'bg-orange-600/10 text-orange-500' : 'bg-zinc-850 text-zinc-400'
                    }`}>
                      <Building className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-white text-sm">{getPaymentMethodLabel(method.bankName)}</h4>
                        {method.isDefault && (
                          <span className="px-2 py-0.5 rounded-md bg-orange-600/20 text-orange-500 text-[10px] font-extrabold uppercase tracking-wide">
                            Default
                          </span>
                        )}
                        {!method.isEnabled && (
                          <span className="px-2 py-0.5 rounded-md bg-zinc-900 text-zinc-600 text-[10px] font-bold">
                            Disabled
                          </span>
                        )}
                      </div>
                      <p className="font-bold text-zinc-300 mt-1">{method.accountName}</p>
                      <p className="font-mono text-zinc-500 mt-0.5 text-[11px]">{method.accountNumber}</p>
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="flex items-center gap-2 text-xs w-full md:w-auto justify-end border-t border-zinc-900/60 md:border-0 pt-3 md:pt-0">
                    {/* Default Trigger */}
                    {!method.isDefault && method.isEnabled && (
                      <button
                        onClick={() => handleSetDefaultMethod(method.id)}
                        className="px-2.5 py-1.5 text-zinc-400 hover:text-orange-400 hover:bg-zinc-900 rounded-lg font-bold"
                        title="Set as default"
                      >
                        Set Default
                      </button>
                    )}

                    {/* Enable/Disable Toggle */}
                    <button
                      onClick={() => handleToggleMethod(method.id)}
                      className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg"
                      title={method.isEnabled ? "Disable payment option" : "Enable payment option"}
                    >
                      {method.isEnabled ? (
                        <ToggleRight className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <ToggleLeft className="w-5 h-5 text-zinc-650" />
                      )}
                    </button>

                    {/* Edit Option */}
                    <button
                      onClick={() => handleStartEdit(method)}
                      className="p-1.5 text-zinc-400 hover:text-orange-500 hover:bg-zinc-900 rounded-lg"
                      title="Edit Account"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    {/* Delete Option */}
                    <button
                      onClick={() => handleDeleteMethod(method.id)}
                      className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-zinc-900 rounded-lg"
                      title="Delete Account"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
