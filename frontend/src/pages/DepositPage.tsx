import React, { useState } from 'react';
import axios from 'axios';
import { 
  ArrowLeft, 
  Copy, 
  Upload, 
  CheckCircle2, 
  AlertTriangle,
  Info,
  ShieldAlert
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuthStore } from '../store/authStore.ts';

const STATIC_TRC20_ADDRESS = "TMAKxrnXeTAmSda3iEfuvBnhLcFZkqN5Dn"; // Dummy address
const STATIC_BEP20_ADDRESS = "0x7e88926125eb6749b5186034051db80dc52f3275"; // Dummy address

export const DepositPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [txHash, setTxHash] = useState('');
  const [amount, setAmount] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const [copiedNetwork, setCopiedNetwork] = useState<'TRC20' | 'BEP20' | null>(null);

  const buyRate = user?.settings?.buyRate || 120;
  const etbRequired = amount ? (parseFloat(amount) * buyRate).toLocaleString() : '0';

  const handleCopy = (address: string, net: 'TRC20' | 'BEP20') => {
    navigator.clipboard.writeText(address);
    setCopiedNetwork(net);
    setTimeout(() => {
      setCopiedNetwork(null);
    }, 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txHash || !amount || !file) {
      setError('Please fill all fields and upload proof screenshot');
      return;
    }

    setIsSubmitting(true);
    setError('');

    const formData = new FormData();
    formData.append('txHash', txHash);
    formData.append('amount', amount);
    formData.append('proof', file);

    try {
      await axios.post('/api/deposit/submit', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setIsSuccess(true);
      setTimeout(() => navigate('/'), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
        <div className="bg-emerald-500/20 p-6 rounded-full">
          <CheckCircle2 className="w-16 h-16 text-emerald-500" />
        </div>
        <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">Submit Success</h2>
        <p className="text-zinc-400 max-w-sm px-6">Your deposit request is being reviewed by an admin. This usually takes 5-30 minutes.</p>
        <button onClick={() => navigate('/')} className="text-orange-500 font-bold hover:underline italic">Return to Dashboard</button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 sm:space-y-8 pb-20 font-sans px-1 sm:px-0">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-xs sm:text-sm font-bold uppercase tracking-widest italic leading-none">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="space-y-5 sm:space-y-6">
        <div className="flex items-center gap-3 sm:gap-4">
           <div className="bg-orange-600 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl">
             <Upload className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
           </div>
           <h1 className="text-2xl sm:text-4xl font-black text-white italic uppercase tracking-tighter leading-none">Deposit USDT</h1>
        </div>

        {/* Instructions */}
        <div className="bg-red-500/10 border border-red-500/20 p-4 sm:p-6 rounded-2xl sm:rounded-3xl flex gap-3 sm:gap-4 items-start">
           <ShieldAlert className="w-5 h-5 sm:w-6 sm:h-6 text-red-500 shrink-0 mt-0.5" />
           <div className="space-y-1 sm:space-y-2">
             <p className="text-red-500 font-black uppercase text-[10px] tracking-[0.2em] italic">Critical Warning</p>
             <p className="text-zinc-300 text-xs sm:text-sm leading-relaxed font-medium">
               Only send <span className="text-white font-bold">USDT via TRC20 (TRON) or BEP20 (BSC)</span> network. Sending via other networks (ERC20, SOL, TON) will result in <span className="text-red-500 font-bold">permanent loss of funds</span>.
             </p>
           </div>
        </div>

        {/* Wallet Display */}
        <div className="bg-zinc-900 border border-zinc-800 p-5 sm:p-8 rounded-[1.5rem] sm:rounded-[2rem] space-y-4 sm:space-y-6 shadow-2xl">
           <div className="space-y-1.5 sm:space-y-2">
             <p className="text-zinc-500 text-[9px] sm:text-[10px] font-black uppercase tracking-widest italic">Deposit Address TRX (TRC20)</p>
             <div className="flex bg-black p-3 sm:p-4 rounded-xl border border-zinc-800 items-center gap-3 sm:gap-4">
                <code className="text-orange-500 font-mono text-[11px] sm:text-sm break-all flex-1">{STATIC_TRC20_ADDRESS}</code>
                <button 
                  type="button" 
                  onClick={() => handleCopy(STATIC_TRC20_ADDRESS, 'TRC20')} 
                  className="p-2 text-zinc-400 hover:text-white bg-zinc-900 rounded-lg transition-all relative shrink-0"
                >
                  {copiedNetwork === 'TRC20' && (
                    <span className="absolute -top-8 right-0 bg-orange-600 text-white text-[8px] font-black uppercase px-1.5 py-0.5 rounded shadow whitespace-nowrap italic leading-none animate-bounce">
                      Copied
                    </span>
                  )}
                  <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
             </div>
           </div>

           <div className="space-y-1.5 sm:space-y-2">
             <p className="text-zinc-500 text-[9px] sm:text-[10px] font-black uppercase tracking-widest italic">BSC (BEP20)</p>
             <div className="flex bg-black p-3 sm:p-4 rounded-xl border border-zinc-800 items-center gap-3 sm:gap-4">
                <code className="text-orange-500 font-mono text-[11px] sm:text-sm break-all flex-1">{STATIC_BEP20_ADDRESS}</code>
                <button 
                  type="button" 
                  onClick={() => handleCopy(STATIC_BEP20_ADDRESS, 'BEP20')} 
                  className="p-2 text-zinc-400 hover:text-white bg-zinc-900 rounded-lg transition-all relative shrink-0"
                >
                  {copiedNetwork === 'BEP20' && (
                    <span className="absolute -top-8 right-0 bg-orange-600 text-white text-[8px] font-black uppercase px-1.5 py-0.5 rounded shadow whitespace-nowrap italic leading-none animate-bounce">
                      Copied
                    </span>
                  )}
                  <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
             </div>
           </div>

           <div className="bg-zinc-950 p-3 sm:p-4 rounded-xl sm:rounded-2xl flex items-start gap-2.5">
             <Info className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-650 shrink-0 mt-0.5" />
             <p className="text-zinc-500 text-[10px] sm:text-xs italic leading-relaxed">
               After sending funds, paste the Transaction ID (txHash) below and upload a screenshot of the confirmation page.
             </p>
           </div>
        </div>

        {/* Submission Form */}
        <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 p-5 sm:p-8 rounded-[1.5rem] sm:rounded-[2rem] space-y-5 sm:space-y-8 shadow-2xl">
           <div className="space-y-4 sm:space-y-5">
              <div className="space-y-1.5 sm:space-y-2">
                <label className="text-zinc-500 text-[9px] sm:text-[10px] font-black uppercase tracking-widest italic">Transaction Hash (txHash)</label>
                <input 
                  type="text" 
                  value={txHash}
                  onChange={(e) => setTxHash(e.target.value)}
                  placeholder="Paste transaction hash here..."
                  className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder:text-zinc-700 focus:border-orange-600 outline-none transition-all font-mono text-xs sm:text-sm"
                />
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <div className="flex justify-between items-end gap-2">
                  <label className="text-zinc-500 text-[9px] sm:text-[10px] font-black uppercase tracking-widest italic">Exact Amount (USDT)</label>
                  <span className="text-[9px] sm:text-[10px] font-black text-emerald-500 italic uppercase">Rate: {buyRate} ETB/USDT</span>
                </div>
                <input 
                  type="number" 
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder:text-zinc-700 focus:border-orange-600 outline-none transition-all font-bold italic text-base"
                />
                {amount && (
                  <p className="text-[9px] sm:text-[10px] text-zinc-500 font-mono italic">
                    Amount in ETB: <span className="text-white font-bold">{etbRequired} ETB</span> 
                  </p>
                )}
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <label className="text-zinc-500 text-[9px] sm:text-[10px] font-black uppercase tracking-widest italic">Proof of Payment</label>
                <label className="flex flex-col items-center justify-center w-full h-28 sm:h-32 border-2 border-dashed border-zinc-800 rounded-xl sm:rounded-2xl cursor-pointer hover:border-zinc-700 hover:bg-zinc-900/50 transition-all p-4">
                  <div className="flex flex-col items-center justify-center text-center">
                    <Upload className="w-6 h-6 sm:w-8 sm:h-8 text-zinc-650 mb-1.5" />
                    <p className="text-xs text-zinc-550 italic break-all max-w-full">{file ? file.name : "Click to upload screenshot"}</p>
                  </div>
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                </label>
              </div>
           </div>

           {error && (
             <div className="bg-rose-500/10 border border-rose-500/20 p-3 sm:p-4 rounded-xl flex items-center gap-2.5 text-rose-500 text-xs sm:text-sm italic font-semibold">
               <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
             </div>
           )}

           <button 
             type="submit" 
             disabled={isSubmitting}
             className={`w-full py-3 sm:py-4 rounded-xl sm:rounded-2xl font-black uppercase tracking-widest italic shadow-lg transition-all text-xs sm:text-sm ${
               isSubmitting ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-white text-black hover:bg-zinc-200 active:scale-[0.98]'
             }`}
           >
             {isSubmitting ? 'Processing...' : 'Confirm Deposit'}
           </button>
        </form>
      </div>
    </div>
  );
};
