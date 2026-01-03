import "./admin.css";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Train, Lock, Mail, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/context/AuthProvider";

const AdminSignup = () => {
  const navigate = useNavigate();
  const { signup, isAuthenticated, error: authError, status } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      setLocalError("Please fill in all fields");
      return;
    }

    if (password.length < 6) {
      setLocalError("Password must be at least 6 characters long");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setLocalError("Please enter a valid email address");
      return;
    }

    setLocalError(null);
    try {
      await signup({ email, password });
    } catch {
      // Error is handled by auth context
    }
  };

  return (
    <div className="admin-login-page">
      <div className="login-card animate-slide-in">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
            <Train className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground mb-2">
            Kochi Metro Rail
          </h1>
          <p className="text-muted-foreground text-sm">
            Admin Signup Portal
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSignup} className="space-y-5 relative z-20">
          {/* Email */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground/90">
              Email Address
            </Label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Enter email id"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (localError) setLocalError(null);
                }}
                className="pl-11 relative z-20"
                required
                autoComplete="email"
                disabled={status === "loading"}
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground/90">
              Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Create password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (localError) setLocalError(null);
                }}
                className="pl-11 pr-11 relative z-20"
                required
                autoComplete="new-password"
                disabled={status === "loading"}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Error */}
          {(authError || localError) && (
            <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20">
              <p className="text-sm text-red-400 text-center">
                {authError || localError}
              </p>
            </div>
          )}

          {/* Submit */}
          <Button
            type="submit"
            size="lg"
            className="w-full mt-6 bg-[#93A7BB] hover:bg-[#7F8FA3] text-white"
            disabled={status === "loading"}
          >
            {status === "loading" ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Creating account...
              </span>
            ) : (
              "Sign Up"
            )}
          </Button>
        </form>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-center text-sm">
          <span className="text-muted-foreground mr-2">
            Already have an account?
          </span>
          <button
            type="button"
            className="text-primary hover:text-primary/80 transition-colors font-medium"
            onClick={() => navigate("/admin/login")}
          >
            Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminSignup;
