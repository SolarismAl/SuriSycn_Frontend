"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { api } from "@/lib/axios";
import Image from "next/image";

// ─── Schemas ──────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

const registerSchema = z.object({
  first_name: z.string().min(1, { message: "First name is required" }),
  last_name: z.string().min(1, { message: "Last name is required" }),
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters" }),
  password_confirmation: z.string(),
}).refine((d) => d.password === d.password_confirmation, {
  message: "Passwords do not match",
  path: ["password_confirmation"],
});

type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;

// ─── Field component ──────────────────────────────────────────────────────────

function Field({
  id,
  label,
  type = "text",
  placeholder,
  error,
  registration,
}: {
  id: string;
  label: string;
  type?: string;
  placeholder?: string;
  error?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  registration: any;
}) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";

  return (
    <div className="space-y-2">
      <Label
        htmlFor={id}
        className="ml-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider"
      >
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          type={isPassword ? (show ? "text" : "password") : type}
          placeholder={placeholder}
          className="rounded-xl h-12 px-4 border-black/10 dark:border-white/10 bg-white/50 dark:bg-black/50 focus-visible:ring-blue-500/50 focus-visible:ring-offset-0 focus-visible:border-blue-500 transition-all font-medium"
          {...registration}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
      {error && <span className="text-xs text-destructive ml-1">{error}</span>}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = "login" | "register";

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, user } = useAuthStore();
  const [tab, setTab] = useState<Tab>("login");
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      if (user?.role === "user" || user?.role === "staff") {
        router.push("/dashboard/schedule");
      } else {
        router.push("/dashboard");
      }
    }
  }, [isAuthenticated, user, router]);

  // ── Login form ──
  const {
    register: regLogin,
    handleSubmit: handleLogin,
    formState: { errors: loginErrors },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  const onLogin = async (data: LoginValues) => {
    setIsLoading(true);
    try {
      const response = await api.post("/login", data);
      if (response.data?.status === "success") {
        const { user: u, access_token } = response.data.data;
        login(u, access_token);
        toast.success("Welcome back!");
        router.push((u.role === "user" || u.role === "staff") ? "/dashboard/schedule" : "/dashboard");
      } else {
        toast.error("Invalid credentials");
      }
    } catch (error: unknown) {
      const msg =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Invalid credentials";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Register form ──
  const {
    register: regRegister,
    handleSubmit: handleRegister,
    formState: { errors: registerErrors },
    reset: resetRegister,
  } = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) });

  const onRegister = async (data: RegisterValues) => {
    setIsLoading(true);
    try {
      const response = await api.post("/register", data);
      if (response.data?.status === "success") {
        const { user: u, access_token } = response.data.data;
        login(u, access_token);
        toast.success("Account created! Welcome to SuriSync.");
        router.push("/dashboard/schedule");
      } else {
        toast.error("Registration failed");
      }
    } catch (error: unknown) {
      const msg =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Registration failed";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 relative overflow-hidden bg-background">
      {/* Ambient background */}
      <div className="absolute top-[10%] left-[20%] w-[40%] h-[40%] rounded-full bg-blue-500/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[10%] right-[20%] w-[30%] h-[30%] rounded-full bg-purple-500/10 blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, type: "spring", bounce: 0.4 }}
        className="w-full max-w-sm relative z-10"
      >
        {/* Logo */}
        <div className="mb-8 text-center flex flex-col items-center">
          <div className="w-16 h-16 flex items-center justify-center mb-4 shrink-0">
            <Image src="/images/surigao-logo.png" alt="Surigao City Logo" width={64} height={64} className="object-contain" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">SuriSync</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {tab === "login" ? "Sign in to access the portal" : "Create your account"}
          </p>
        </div>

        <Card className="border-black/5 dark:border-white/10 bg-white/60 dark:bg-black/40 backdrop-blur-3xl shadow-xl rounded-[2rem] overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-black/5 dark:border-white/5">
            {(["login", "register"] as Tab[]).map((t) => (
              <button
                key={t}
                id={`tab-${t}`}
                onClick={() => {
                  setTab(t);
                  resetRegister();
                }}
                className={`flex-1 py-3.5 text-sm font-semibold capitalize transition-all ${
                  tab === t
                    ? "text-foreground border-b-2 border-blue-500 -mb-px"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "login" ? "Sign In" : "Register"}
              </button>
            ))}
          </div>

          <div className="p-6 md:p-8">
            <AnimatePresence mode="wait">
              {tab === "login" ? (
                <motion.form
                  key="login"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handleLogin(onLogin)}
                  className="space-y-5"
                >
                  <Field
                    id="login-email"
                    label="Email"
                    type="email"
                    placeholder="juan@surigaocity.gov.ph"
                    error={loginErrors.email?.message}
                    registration={regLogin("email")}
                  />
                  <Field
                    id="login-password"
                    label="Password"
                    type="password"
                    error={loginErrors.password?.message}
                    registration={regLogin("password")}
                  />

                  <Button
                    id="login-submit"
                    type="submit"
                    className="w-full rounded-xl h-12 font-medium bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all mt-2"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Authenticating…
                      </>
                    ) : (
                      "Sign In"
                    )}
                  </Button>

                  <p className="text-center text-xs text-muted-foreground pt-1">
                    Don&apos;t have an account?{" "}
                    <button
                      type="button"
                      onClick={() => setTab("register")}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      Register here
                    </button>
                  </p>
                </motion.form>
              ) : (
                <motion.form
                  key="register"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handleRegister(onRegister)}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <Field
                      id="reg-first-name"
                      label="First Name"
                      placeholder="Juan"
                      error={registerErrors.first_name?.message}
                      registration={regRegister("first_name")}
                    />
                    <Field
                      id="reg-last-name"
                      label="Last Name"
                      placeholder="Dela Cruz"
                      error={registerErrors.last_name?.message}
                      registration={regRegister("last_name")}
                    />
                  </div>

                  <Field
                    id="reg-email"
                    label="Email"
                    type="email"
                    placeholder="juan@example.com"
                    error={registerErrors.email?.message}
                    registration={regRegister("email")}
                  />
                  <Field
                    id="reg-password"
                    label="Password"
                    type="password"
                    error={registerErrors.password?.message}
                    registration={regRegister("password")}
                  />
                  <Field
                    id="reg-password-confirm"
                    label="Confirm Password"
                    type="password"
                    error={registerErrors.password_confirmation?.message}
                    registration={regRegister("password_confirmation")}
                  />

                  {/* Role notice */}
                  <div className="flex items-start gap-2 rounded-xl bg-blue-500/10 border border-blue-500/20 px-3 py-2.5">
                    <span className="text-blue-500 text-lg leading-none mt-0.5">ℹ</span>
                    <p className="text-xs text-blue-600 dark:text-blue-400 leading-relaxed">
                      New accounts are registered as <strong>Regular User</strong> with access to
                      Schedule, Reservations, and Tasks. Contact an admin to upgrade your role.
                    </p>
                  </div>

                  <Button
                    id="register-submit"
                    type="submit"
                    className="w-full rounded-xl h-12 font-medium bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all mt-1"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating account…
                      </>
                    ) : (
                      "Create Account"
                    )}
                  </Button>

                  <p className="text-center text-xs text-muted-foreground pt-1">
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => setTab("login")}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      Sign in
                    </button>
                  </p>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
