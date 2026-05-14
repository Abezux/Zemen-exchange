import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore.ts';
import { 
  ArrowLeft, 
  ArrowUpRight, 
  Banknote, 
  CheckCircle2, 
  AlertTriangle,
  AlertCircle,
  Check
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type Network = 'TRC20' | 'BEP20';

interface ValidationState {
  amount: { valid: boolean; error: string };
  address: { valid: boolean; error: string };
  network: { valid: boolean; error: string };
}

const NETWORK_FEES: Record<Network, number> = {
  'TRC20': 1.5,
  'BEP20': 2.0
};

export const WithdrawPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [amount, setAmount] = useState('');
  const [address, setAddress] = useState('');
  const [network, setNetwork] = useState<Network>('TRC20');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const [validations, setValidations] = useState<ValidationState>({
    amount: { valid: false, error: '' },
    address: { valid: false, error: '' },
    network: { valid: false, error: '' }
  });

  const balance = user?.wallet?.balance || 0;
  const fee = NETWORK_FEES[network];
  const amountNum = parseFloat(amount) || 0;
  const willReceive = Math.max(0, amountNum - fee);

  // Auto-detect network based on address
  const detectNetwork = (addr: string): Network | null => {
    if (addr.startsWith('T')) return 'TRC20';
    if (addr.startsWith('0x')) return 'BEP20';
    return null;
  };

  // Validate amount
  const validateAmount = (val: string) => {
    const num = parseFloat(val);
    if (!val) return { valid: false, error: '' };
    if (num <= 5) return { valid: false, error: 'Amount must be greater than 5 USDT' };
    if (num > balance) return { valid: false, error: 'Insufficient balance' };
    return { valid: true, error: '' };
  };

  // Validate address
  const validateAddress = (addr: string, selectedNetwork: Network) => {
    if (!addr) return { valid: false, error: '' };
    
    const detectedNet = detectNetwork(addr);
    
    if (selectedNetwork === 'TRC20') {
      if (!addr.startsWith('T')) {
        return { valid: false, error: 'Address does not match selected network' };
      }
      if (addr.length !== 34) {
        return { valid: false, error: 'Invalid TRC20 address format' };
      }
    } else if (selectedNetwork === 'BEP20') {
      if (!addr.startsWith('0x')) {
        return { valid: false, error: 'Address does not match selected network' };
      }
      if (addr.length !== 42) {
        return { valid: false, error: 'Invalid BEP20 address format' };
      }
    }
    
    return { valid: true, error: '' };
  };

  // Update validations on input change
  useEffect(() => {
    const amountValidation = validateAmount(amount);
    const addressValidation = validateAddress(address, network);
    
    // If address is valid but network doesn't match, suggest correct network
    const detectedNet = detectNetwork(address);
    let networkValidation = { valid: true, error: '' };
    if (address && detectedNet && detectedNet !== network) {
      networkValidation = { 
        valid: false, 
        error: `Address starts with "${address[0]}..." → suggests ${detectedNet}` 
      };
    }

    setValidations({
      amount: amountValidation,
      address: addressValidation,
      network: networkValidation
    });
  }, [amount, address, network]);

  const isFormValid = validations.amount.valid && validations.address.valid && validations.network.valid;

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newAddress = e.target.value;
    setAddress(newAddress);
    
    // Auto-detect and suggest network
    const detected = detectNetwork(newAddress);
    if (detected && detected !== network) {
      // Don't auto-change, just show suggestion via validation message
    }
  };

  const handleNetworkChange = (newNetwork: Network) => {
    setNetwork(newNetwork);
    // Re-validate address with new network
    const validation = validateAddress(address, newNetwork);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFormValid) {
      setError('Please fill all fields correctly');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await axios.post('/api/withdraw/usdt', {
        amount: parseFloat(amount),
        network,
        recipientAddress: address,
        fee,
        willReceive
      });
      setIsSuccess(true);
      setTimeout(() => navigate('/'), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Couldn\'t process withdrawal. Please check details and try again.');
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
        <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">Withdrawal Submitted</h2>
        <p className="text-zinc-400 max-w-sm">Your USDT withdrawal request has been submitted. You will receive {willReceive.toFixed(2)} USDT to your wallet address.</p>
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
             <ArrowUpRight className="w-6 h-6 text-white" />
           </div>
           <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter">Withdraw USDT</h1>
        </div>

        {/* Balance Card */}
        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2rem] flex justify-between items-center shadow-xl">
           <div>
             <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest italic">Available Balance</p>
             <h3 className="text-3xl font-black text-white italic tracking-tighter">
               {balance.toLocaleString()} <span className="text-sm">USDT</span>
             </h3>
           </div>
           <Banknote className="w-8 h-8 text-orange-500/30" />
        </div>

        {/* Withdrawal Form */}
        <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2rem] space-y-6 shadow-2xl">
           
           {/* Amount Input */}
           <div className="space-y-2">
             <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest italic">Amount (USDT)</label>
             <input 
               type="number" 
               value={amount}
               onChange={(e) => setAmount(e.target.value)}
               placeholder="Enter amount"
               step="0.01"
               className={`w-full bg-black rounded-xl px-4 py-3 text-white placeholder:text-zinc-700 outline-none transition-all font-bold italic border-2 ${
                 amount === '' ? 'border-zinc-800 focus:border-orange-600' :
                 validations.amount.valid ? 'border-green-500/50 focus:border-green-500' : 'border-red-500/50 focus:border-red-500'
               }`}
             />
             {validations.amount.error && (
               <div className="flex items-center gap-2 text-red-500 text-[10px] font-bold uppercase italic">
                 <AlertCircle className="w-3 h-3" /> {validations.amount.error}
               </div>
             )}
             {validations.amount.valid && amount && (
               <div className="flex items-center gap-2 text-green-500 text-[10px] font-bold uppercase italic">
                 <Check className="w-3 h-3" /> Valid amount
               </div>
             )}
           </div>

           {/* Network Selection */}
           <div className="space-y-3">
             <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest italic">Select Network</label>
             <div className="grid grid-cols-2 gap-4">
               <button 
                 type="button" 
                 onClick={() => handleNetworkChange('TRC20')}
                 className={`p-4 rounded-xl border-2 transition-all font-bold uppercase tracking-tight italic ${
                   network === 'TRC20' 
                     ? 'bg-orange-600/10 border-orange-600 text-white' 
                     : 'bg-black border-zinc-800 text-zinc-500 hover:border-zinc-700'
                 }`}
               >
                 TRC20 (Tron)
               </button>
               <button 
                 type="button" 
                 onClick={() => handleNetworkChange('BEP20')}
                 className={`p-4 rounded-xl border-2 transition-all font-bold uppercase tracking-tight italic ${
                   network === 'BEP20' 
                     ? 'bg-orange-600/10 border-orange-600 text-white' 
                     : 'bg-black border-zinc-800 text-zinc-500 hover:border-zinc-700'
                 }`}
               >
                 BEP20 (BSC)
               </button>
             </div>
           </div>

           {/* Wallet Address Input */}
           <div className="space-y-2">
             <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest italic">Recipient Address</label>
             <input 
               type="text" 
               value={address}
               onChange={handleAddressChange}
               placeholder="Paste USDT wallet address"
               className={`w-full bg-black rounded-xl px-4 py-3 text-white placeholder:text-zinc-700 outline-none transition-all font-mono text-sm border-2 ${
                 address === '' ? 'border-zinc-800 focus:border-orange-600' :
                 validations.address.valid ? 'border-green-500/50 focus:border-green-500' : 'border-red-500/50 focus:border-red-500'
               }`}
             />
             {validations.address.error && (
               <div className="flex items-center gap-2 text-red-500 text-[10px] font-bold uppercase italic">
                 <AlertCircle className="w-3 h-3" /> {validations.address.error}
               </div>
             )}
             {validations.network.error && (
               <div className="flex items-center gap-2 text-amber-500 text-[10px] font-bold italic">
                 <AlertCircle className="w-3 h-3" /> {validations.network.error}
               </div>
             )}
             {validations.address.valid && address && (
               <div className="flex items-center gap-2 text-green-500 text-[10px] font-bold uppercase italic">
                 <Check className="w-3 h-3" /> Valid address
               </div>
             )}
           </div>

           {/* Fee + Receive Summary */}
           {amount && validations.amount.valid && (
             <div className="bg-black border border-zinc-800 p-4 rounded-xl space-y-3">
               <div className="flex justify-between items-center">
                 <span className="text-zinc-500 text-[10px] font-black uppercase italic">Network Fee</span>
                 <span className="text-white font-bold italic">{fee.toFixed(2)} USDT</span>
               </div>
               <div className="border-t border-zinc-800 pt-3 flex justify-between items-center">
                 <span className="text-white text-sm font-black uppercase italic">You will receive</span>
                 <span className="text-orange-500 text-xl font-black italic">{willReceive.toFixed(2)} USDT</span>
               </div>
             </div>
           )}

           {/* Warning Message */}
           <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl flex gap-3">
             <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
             <p className="text-amber-500 text-[11px] font-bold uppercase italic leading-tight">
                Make sure the selected network matches the recipient address. Transactions cannot be reversed.
             </p>
           </div>

           {error && (
             <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl flex items-center gap-3 text-rose-500 text-sm italic font-medium">
               <AlertTriangle className="w-4 h-4" /> {error}
             </div>
           )}

           <button 
             type="submit" 
             disabled={!isFormValid || isSubmitting}
             className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest italic shadow-lg transition-all ${
               !isFormValid || isSubmitting 
                 ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' 
                 : 'bg-orange-600 text-white hover:bg-orange-700 active:scale-[0.98]'
             }`}
           >
             {isSubmitting ? 'Processing withdrawal...' : 'Withdraw USDT'}
           </button>
        </form>
      </div>
    </div>
  );
};
