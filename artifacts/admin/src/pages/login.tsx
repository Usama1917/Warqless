import { useState } from "react";
import { useLocation } from "wouter";
import { BookMarked, Eye, EyeOff, AlertCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { AdminRole } from "@/data/mockData";

export default function LoginPage() {
  const { login } = useAuth();
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AdminRole>("admin");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    const ok = login(email, password, role);
    setLoading(false);
    if (ok) {
      navigate("/dashboard");
    } else {
      setError("Invalid credentials. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left panel — brand */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#1A4A7C] flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="absolute border border-white/30 rounded-2xl"
              style={{
                width: `${120 + i * 40}px`,
                height: `${120 + i * 40}px`,
                top: "50%",
                left: "50%",
                transform: `translate(-50%, -50%) rotate(${i * 15}deg)`,
              }}
            />
          ))}
        </div>
        <div className="relative z-10 text-center text-white">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-16 h-16 rounded-2xl bg-[#E8A22C] flex items-center justify-center shadow-xl">
              <BookMarked size={32} className="text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-3">Warqless</h1>
          <p className="text-white/70 text-lg max-w-xs mx-auto leading-relaxed">
            Publisher & Admin Dashboard
          </p>
          <div className="mt-12 grid grid-cols-3 gap-6 text-center">
            {[
              { label: "Books", value: "140+" },
              { label: "Students", value: "12K+" },
              { label: "Revenue", value: "EGP 500K" },
            ].map((s) => (
              <div key={s.label}>
                <div className="text-2xl font-bold text-[#E8A22C]">{s.value}</div>
                <div className="text-white/60 text-sm mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <BookMarked size={16} className="text-primary-foreground" />
            </div>
            <span className="text-foreground font-bold">Warqless Admin</span>
          </div>

          <h2 className="text-2xl font-bold text-foreground">Sign in</h2>
          <p className="text-muted-foreground text-sm mt-1 mb-7">
            For publishers and administrators only.
          </p>

          {/* Role selector */}
          <div className="flex rounded-xl border border-border bg-muted p-1 mb-5">
            {(["admin", "publisher"] as AdminRole[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all capitalize ${
                  role === r
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={role === "admin" ? "admin@warqless.com" : "publisher@darmaref.eg"}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-card text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-card text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring transition pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 px-3 py-2.5 rounded-lg">
                <AlertCircle size={14} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition disabled:opacity-60 flex items-center justify-center gap-2 mt-1"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <div className="mt-6 p-3.5 rounded-xl bg-muted border border-border">
            <p className="text-xs font-medium text-muted-foreground mb-2">Demo credentials</p>
            <div className="space-y-1 text-xs text-muted-foreground">
              <div className="flex gap-2">
                <span className="font-medium text-foreground w-16">Admin:</span>
                <span>admin@warqless.com / admin123</span>
              </div>
              <div className="flex gap-2">
                <span className="font-medium text-foreground w-16">Publisher:</span>
                <span>publisher@darmaref.eg / pub123</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
