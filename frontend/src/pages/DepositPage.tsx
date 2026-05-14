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
const STATIC_BEP20_ADDRESS = "0x7e88926125eb6749b5186034051db80dc52f3275"; //

export const DepositPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [txHash, setTxHash] = useState('');
  const [amount, setAmount] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const buyRate = user?.settings?.buyRate || 120;
  const etbRequired = amount ? (parseFloat(amount) * buyRate).toLocaleString() : '0';

  const handleCopy = () => {
    navigator.clipboard.writeText(STATIC_TRC20_ADDRESS);
    alert('Address copied to clipboard');
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
        <p className="text-zinc-400 max-w-sm">Your deposit request is being reviewed by an admin. This usually takes 5-30 minutes.</p>
        <button onClick={() => navigate('/')} className="text-orange-500 font-bold hover:underline italic">Return to Dashboard</button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-20">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-sm font-bold uppercase tracking-widest italic">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="space-y-6">
        <div className="flex items-center gap-4">
           <div className="bg-orange-600 p-3 rounded-2xl">
             <Upload className="w-6 h-6 text-white" />
           </div>
           <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter">Deposit USDT</h1>
        </div>

        {/* Instructions */}
        <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-3xl flex gap-4">
           <ShieldAlert className="w-6 h-6 text-red-500 shrink-0" />
           <div className="space-y-2">
             <p className="text-red-500 font-black uppercase text-xs tracking-[0.2em] italic">Critical Warning</p>
             <p className="text-zinc-300 text-sm leading-relaxed font-medium">
               Only send <span className="text-white font-bold">USDT via TRC20 (TRON)</span> network. Sending via other networks (ERC20, BEP20) will result in <span className="text-red-500 font-bold">permanent loss of funds</span>.
             </p>
           </div>
        </div>

        {/* Wallet Display */}
        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2rem] space-y-6 shadow-2xl">
           <div className="space-y-2">
             <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest italic">Deposit Address TRX(TRC20)</p>
             <div className="flex bg-black p-4 rounded-xl border border-zinc-800 items-center gap-4">
                <code className="text-orange-500 font-mono text-sm break-all flex-1">{STATIC_TRC20_ADDRESS}</code>
                <button onClick={handleCopy} className="p-2 text-zinc-400 hover:text-white bg-zinc-900 rounded-lg transition-all">
                  <Copy className="w-4 h-4" />
                </button>
                
             </div>
             
           </div>
            <div className="space-y-2">
             <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest italic">BSC(BEP20)</p>
             <div className="flex bg-black p-4 rounded-xl border border-zinc-800 items-center gap-4">
                <code className="text-orange-500 font-mono text-sm break-all flex-1">{STATIC_BEP20_ADDRESS}</code>
                <button onClick={handleCopy} className="p-2 text-zinc-400 hover:text-white bg-zinc-900 rounded-lg transition-all">
                  <Copy className="w-4 h-4" />
                </button>
                
             </div>
             
           </div>


           <div className="bg-zinc-950 p-4 rounded-2xl flex items-start gap-3">
             <Info className="w-5 h-5 text-zinc-600 shrink-0 mt-0.5" />
             <p className="text-zinc-500 text-xs italic leading-relaxed">
               After sending funds, paste the Transaction ID (txHash) below and upload a screenshot of the confirmation page.
             </p>
           </div>
        </div>

        {/* Submission Form */}
        <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2rem] space-y-8 shadow-2xl">
           <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest italic">Transaction Hash (txHash)</label>
                <input 
                  type="text" 
                  value={txHash}
                  onChange={(e) => setTxHash(e.target.value)}
                  placeholder="Paste transaction hash here..."
                  className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder:text-zinc-700 focus:border-orange-600 outline-none transition-all font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest italic">Exact Amount (USDT)</label>
                  <span className="text-[10px] font-black text-emerald-500 italic uppercase">Rate: {buyRate} ETB/USDT</span>
                </div>
                <input 
                  type="number" 
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder:text-zinc-700 focus:border-orange-600 outline-none transition-all font-bold italic"
                />
                {amount && (
                  <p className="text-[10px] text-zinc-500 font-mono italic">
                    Amonunt in ETB  <span className="text-white font-bold">{etbRequired} ETB</span> 
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest italic">Proof of Payment</label>
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-zinc-800 rounded-2xl cursor-pointer hover:border-zinc-700 hover:bg-zinc-900/50 transition-all">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 text-zinc-600 mb-2" />
                    <p className="text-xs text-zinc-500 italic">{file ? file.name : "Click to upload screenshot"}</p>
                  </div>
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                </label>
              </div>
           </div>

           {error && (
             <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl flex items-center gap-3 text-rose-500 text-sm italic font-medium">
               <AlertTriangle className="w-4 h-4" /> {error}
             </div>
           )}

           <button 
             type="submit" 
             disabled={isSubmitting}
             className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest italic shadow-lg transition-all ${
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
