import { useState } from "react";
import { useLocation } from "wouter";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export default function AdminLoginPage() {
  const [, setLocation] = useLocation();
  const { adminLogin, verifyAdminMfa } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("obtaylor@gmail.com");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setLoading(true);
    try { const result = await adminLogin(email, password); if (result.requiresMfa) setChallengeToken(result.challengeToken!); else setLocation("/admin"); }
    catch (error: any) { toast({ title: "Owner sign-in failed", description: error.message, variant: "destructive" }); }
    finally { setLoading(false); }
  };
  const submitCode = async (event: React.FormEvent) => {
    event.preventDefault(); if (!challengeToken) return; setLoading(true);
    try { await verifyAdminMfa(challengeToken, code); setLocation("/admin"); }
    catch (error: any) { toast({ title: "Code not accepted", description: error.message, variant: "destructive" }); }
    finally { setLoading(false); }
  };
  return <div className="min-h-screen grid place-items-center px-4 bg-[#080d16] text-white">
    <div className="w-full max-w-md rounded-[28px] border border-violet-400/20 bg-[#111827] p-7 shadow-2xl">
      <div className="w-12 h-12 rounded-2xl bg-violet-500/15 text-violet-300 grid place-items-center mb-5"><ShieldCheck/></div>
      <div className="text-[10px] uppercase tracking-[.2em] text-violet-300 font-black">Restricted access</div>
      <h1 className="text-2xl font-black mt-2">Trade Pro owner</h1>
      <p className="text-sm text-slate-400 mt-2">View user progress, platform activity, and safety signals.</p>
      {!challengeToken ? <form onSubmit={submit} className="mt-7 space-y-4">
        <label className="block text-xs font-bold text-slate-300">Owner email<input aria-label="Owner email" type="email" required value={email} onChange={e=>setEmail(e.target.value)} className="mt-2 w-full h-12 rounded-xl bg-slate-950 border border-slate-700 px-4 text-white"/></label>
        <label className="block text-xs font-bold text-slate-300">Password<input aria-label="Password" type="password" required value={password} onChange={e=>setPassword(e.target.value)} className="mt-2 w-full h-12 rounded-xl bg-slate-950 border border-slate-700 px-4 text-white"/></label>
        <button disabled={loading} className="w-full h-12 rounded-xl bg-violet-500 hover:bg-violet-400 disabled:opacity-50 font-black flex items-center justify-center gap-2"><LockKeyhole size={16}/>{loading ? "Checking…" : "Open owner dashboard"}</button>
      </form> : <form onSubmit={submitCode} className="mt-7 space-y-4">
        <div className="rounded-xl border border-violet-400/20 bg-violet-500/10 p-4 text-sm text-violet-100">Open your authenticator app and enter the current six-digit code. A recovery code also works.</div>
        <label className="block text-xs font-bold text-slate-300">Security code<input aria-label="Security code" autoFocus required value={code} onChange={e=>setCode(e.target.value.toUpperCase())} className="mt-2 w-full h-14 rounded-xl bg-slate-950 border border-slate-700 px-4 text-white text-center text-xl font-mono tracking-[.25em]"/></label>
        <button disabled={loading} className="w-full h-12 rounded-xl bg-violet-500 hover:bg-violet-400 disabled:opacity-50 font-black">{loading ? "Checking…" : "Verify and open dashboard"}</button>
        <button type="button" onClick={()=>{setChallengeToken(null);setCode("")}} className="w-full text-xs text-slate-500">Use a different account</button>
      </form>}
      <button onClick={()=>setLocation("/login")} className="w-full mt-4 text-xs text-slate-500 hover:text-slate-300">Back to user sign in</button>
      <p className="text-[10px] text-slate-600 text-center mt-6">Owner sessions expire after 8 hours.</p>
    </div>
  </div>;
}
