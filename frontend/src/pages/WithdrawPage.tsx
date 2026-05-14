import React, { useState } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore.ts';
import { 
  ArrowLeft, 
  ArrowUpRight, 
  Banknote, 
  CheckCircle2, 
  AlertTriangle,
  CreditCard,
  Phone
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const WithdrawPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [amountEtb, setAmountEtb] = useState('');
  const [destination, setDestination] = useState('');
  const [method, setMethod] = useState<'bank' | 'telebirr'>('telebirr');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const sellRate = user?.settings?.sellRate || 115;
  const usdtEquivalent = amountEtb ? (parseFloat(amountEtb) / sellRate).toFixed(2) : '0.00';
  const maxEtb = (user?.wallet?.balance || 0) * sellRate;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amountEtb || !destination) {
      setError('Please fill all fields');
      return;
    }

    const amount = parseFloat(amountEtb);
    if (amount > maxEtb) {
      setError('Insufficient balance for this amount');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await axios.post('/api/withdraw/request', {
        amountEtb: amount,
        destination: `${method.toUpperCase()}: ${destination}`
      });
      setIsSuccess(true);
      setTimeout(() => navigate('/'), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Withdrawal request failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
        <div className="bg-orange-500/20 p-6 rounded-full">
          <CheckCircle2 className="w-16 h-16 text-orange-500" />
        </div>
        <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">Request Received</h2>
        <p className="text-zinc-400 max-w-sm">Admin will process your ETB payment to {destination} shortly. Typical processing: 2-12 hours.</p>
        <button onClick={() => navigate('/')} className="text-orange-500 font-bold hover:underline italic">Return to Dashboard</button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-3 sm:space-y-6 md:space-y-8 pb-20">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-xs sm:text-sm font-bold uppercase tracking-widest italic">
        <ArrowLeft className="w-3 sm:w-4 h-3 sm:h-4" /> Back
      </button>

      <div className="space-y-3 sm:space-y-6 md:space-y-6">
        <div className="flex items-center gap-2 sm:gap-4">
           <div className="bg-orange-600 p-2 sm:p-3 rounded-2xl shrink-0">
             <ArrowUpRight className="w-5 sm:w-6 h-5 sm:h-6 text-white" />
           </div>
           <h1 className="text-2xl sm:text-4xl font-black text-white italic uppercase tracking-tighter">Withdraw ETB</h1>
        </div>

        {/* Balance Card */}
        <div className="bg-zinc-900 border border-zinc-800 p-3 sm:p-6 md:p-8 rounded-[2rem] flex justify-between items-center shadow-xl">
           <div>
             <p className="text-zinc-500 text-[9px] sm:text-[10px] font-black uppercase tracking-widest italic">Your Available Balance</p>
             <h3 className="text-xl sm:text-3xl font-black text-white italic tracking-tighter">
               ${user?.wallet?.balance?.toLocaleString()} <span className="text-xs sm:text-sm">USDT</span>
             </h3>
             <p className="text-zinc-400 text-[8px] sm:text-[10px] font-bold uppercase mt-1">≈ {maxEtb.toLocaleString()} ETB</p>
           </div>
           <Banknote className="w-6 sm:w-8 h-6 sm:h-8 text-orange-500/30 shrink-0" />
        </div>

        {/* Withdrawal Form */}
        <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 p-3 sm:p-6 md:p-8 rounded-[2rem] space-y-4 sm:space-y-8 shadow-2xl">
           <div className="space-y-3 sm:space-y-6">
              <div className="space-y-1.5 sm:space-y-2">
                <div className="flex justify-between items-end">
                  <label className="text-zinc-500 text-[9px] sm:text-[10px] font-black uppercase tracking-widest italic">Withdrawal Amount (ETB)</label>
                  <span className="text-[8px] sm:text-[10px] font-black text-orange-500 italic uppercase">Rate: {sellRate} ETB/USDT</span>
                </div>
                <input 
                  type="number" 
                  value={amountEtb}
                  onChange={(e) => setAmountEtb(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-black border border-zinc-800 rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base text-white placeholder:text-zinc-700 focus:border-orange-600 outline-none transition-all font-bold italic"
                />
                {amountEtb && (
                  <p className="text-[8px] sm:text-[10px] text-zinc-500 font-mono italic">
                    Deduction: <span className="text-white font-bold">{usdtEquivalent} USDT</span>
                  </p>
                )}
              </div>

              <div className="space-y-1.5 sm:space-y-3">
                <label className="text-zinc-500 text-[9px] sm:text-[10px] font-black uppercase tracking-widest italic">Payment Method</label>
                <div className="grid grid-cols-2 gap-2 sm:gap-4">
                  <button 
                    type="button" 
                    onClick={() => setMethod('telebirr')}
                    className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-4 rounded-xl border transition-all text-xs sm:text-sm ${method === 'telebirr' ? 'bg-orange-600/10 border-orange-600 text-white' : 'bg-black border-zinc-800 text-zinc-500'}`}
                  >
                    <Phone className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                    <span className="font-bold uppercase tracking-tight italic">Telebirr</span>
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setMethod('bank')}
                    className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-4 rounded-xl border transition-all text-xs sm:text-sm ${method === 'bank' ? 'bg-orange-600/10 border-orange-600 text-white' : 'bg-black border-zinc-800 text-zinc-500'}`}
                  >
                    <CreditCard className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                    <span className="font-bold uppercase tracking-tight italic">Bank</span>
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <label className="text-zinc-500 text-[9px] sm:text-[10px] font-black uppercase tracking-widest italic">
                  {method === 'telebirr' ? 'Phone Number' : 'Account Details'}
                </label>
                <textarea 
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder={method === 'telebirr' ? '0912...' : 'Name, Bank, Acc #'}
                  rows={method === 'telebirr' ? 1 : 2}
                  className="w-full bg-black border border-zinc-800 rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-sm text-white placeholder:text-zinc-700 focus:border-orange-600 outline-none transition-all font-medium resize-none"
                />
              </div>
           </div>

           {error && (
             <div className="bg-rose-500/10 border border-rose-500/20 p-2 sm:p-4 rounded-xl flex items-center gap-2 sm:gap-3 text-rose-500 text-xs sm:text-sm italic font-medium">
               <AlertTriangle className="w-3.5 sm:w-4 h-3.5 sm:h-4 shrink-0" /> {error}
             </div>
           )}

           <button 
             type="submit" 
             disabled={isSubmitting}
             className={`w-full py-3 sm:py-4 rounded-2xl font-black uppercase tracking-widest italic shadow-lg transition-all text-sm sm:text-base ${
               isSubmitting ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-orange-600 text-white hover:bg-orange-700 active:scale-[0.98]'
             }`}
           >
             {isSubmitting ? 'Processing...' : 'Request Withdrawal'}
           </button>
        </form>
      </div>
    </div>
  );
};
