import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { gsap } from "gsap";
import toast from "react-hot-toast";
import {
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  Sparkles,
  UsersRound
} from "lucide-react";

import api from "../services/api";
import { isRemembered, saveSession } from "../services/auth";

const modeCopy = {
  login: {
    title: "Welcome back",
    subtitle: "Login to manage your projects, teams, and daily tasks.",
    action: "Login"
  },
  signup: {
    title: "Create your account",
    subtitle: "Start managing team projects and tasks in one clean workspace.",
    action: "Create account"
  },
  forgot: {
    title: "Reset your password",
    subtitle: "Enter your email and create a new password in a few seconds.",
    action: "Send reset link"
  },
  reset: {
    title: "Set a new password",
    subtitle: "Choose a new password and continue to your workspace.",
    action: "Reset password"
  },
  verify: {
    title: "Verify email",
    subtitle: "Confirm your email to activate your account.",
    action: "Verify email"
  }
};

export default function Login({ mode = "login" }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const shellRef = useRef(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(isRemembered());
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "member",
    token: searchParams.get("token") || ""
  });

  const currentMode = useMemo(() => {
    if (location.pathname.includes("signup")) return "signup";
    if (location.pathname.includes("forgot")) return "forgot";
    if (location.pathname.includes("reset")) return "reset";
    if (location.pathname.includes("verify")) return "verify";
    return mode;
  }, [location.pathname, mode]);

  useEffect(() => {
    gsap.fromTo(
      shellRef.current?.querySelectorAll(".auth-animate"),
      { y: 22, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.7, stagger: 0.08, ease: "power3.out" }
    );
  }, [currentMode]);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      if (currentMode === "signup") {
        await api.post("/auth/register", form);
        toast.success("Registered successfully. Now you can login.");
        navigate("/login");
        return;
      }

      if (currentMode === "forgot") {
        const res = await api.post("/auth/forgot-password", { email: form.email });
        toast.success("Reset token generated.");
        if (res.data.resetToken) navigate(`/reset-password?token=${res.data.resetToken}`);
        return;
      }

      if (currentMode === "reset") {
        await api.post("/auth/reset-password", {
          token: form.token,
          password: form.password
        });
        toast.success("Password reset. Please login again.");
        navigate("/login");
        return;
      }

      if (currentMode === "verify") {
        await api.get(`/auth/verify-email/${form.token}`);
        toast.success("Email verified.");
        navigate("/login");
        return;
      }

      const res = await api.post("/auth/login", {
        email: form.email,
        password: form.password,
        rememberMe
      });

      saveSession(res.data, rememberMe);
      toast.success("Login successful");
      navigate("/");
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Cannot reach the server. Make sure backend is running on port 5001."
      );
    } finally {
      setLoading(false);
    }
  };

  const copy = modeCopy[currentMode];
  const loadingText =
    currentMode === "signup"
      ? "Creating account..."
      : currentMode === "login"
        ? "Logging in..."
        : "Please wait...";

  return (
    <main ref={shellRef} className="auth-page">
      <section className="auth-brand auth-animate">
        <div className="brand-mark">
          <UsersRound size={20} />
        </div>
        <h1>Team Task Manager</h1>
        <p>
          A clean workspace to create projects, assign tasks, track progress, and keep
          your team moving together.
        </p>
        <div className="auth-motion-card">
          <span className="motion-ring ring-large" />
          <span className="motion-ring ring-medium" />
          <span className="motion-ring ring-small" />
          <span className="motion-pulse pulse-one" />
          <span className="motion-pulse pulse-two" />
          <span className="motion-pulse pulse-three" />
          <Sparkles className="motion-spark spark-one" size={24} />
          <Sparkles className="motion-spark spark-two" size={18} />
        </div>
      </section>

      <form onSubmit={handleSubmit} className="auth-panel auth-animate" autoComplete="off">
        <input className="auth-autofill-trap" type="text" name="email" autoComplete="username" tabIndex="-1" />
        <input
          className="auth-autofill-trap"
          type="password"
          name="password"
          autoComplete="current-password"
          tabIndex="-1"
        />

        <div>
          <p className="eyebrow">Secure workspace</p>
          <h2>{copy.title}</h2>
          <p>{copy.subtitle}</p>
        </div>

        {currentMode === "signup" && (
          <>
            <label>
              Name
              <input
                type="text"
                name="team_task_manager_name"
                autoComplete="off"
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="Rahul Sharma"
                required
              />
            </label>

            <label>
              Role
              <select value={form.role} onChange={(e) => updateField("role", e.target.value)}>
                <option value="member">Member</option>
                <option value="manager">Project Manager</option>
                <option value="admin">Admin</option>
              </select>
            </label>
          </>
        )}

        {["login", "signup", "forgot"].includes(currentMode) && (
          <label>
            Email
            <span className="input-icon">
              <Mail size={18} />
              <input
                type="email"
                name="team_task_manager_email"
                autoComplete="off"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                placeholder="you@company.com"
                required
              />
            </span>
          </label>
        )}

        {["login", "signup", "reset"].includes(currentMode) && (
          <label>
            Password
            <span className="input-icon">
              <KeyRound size={18} />
              <input
                type={showPassword ? "text" : "password"}
                name="team_task_manager_password"
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => updateField("password", e.target.value)}
                placeholder="Minimum 6 characters"
                minLength={6}
                required
              />
              <button type="button" className="icon-button" onClick={() => setShowPassword((v) => !v)}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </span>
          </label>
        )}

        {["reset", "verify"].includes(currentMode) && (
          <label>
            Token
            <input
              type="text"
              name="team_task_manager_token"
              autoComplete="off"
              value={form.token}
              onChange={(e) => updateField("token", e.target.value)}
              placeholder="Paste token"
              required
            />
          </label>
        )}

        {currentMode === "login" && (
          <div className="auth-row">
            <label className="check-row">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              Remember me
            </label>
            <Link to="/forgot-password">Forgot password?</Link>
          </div>
        )}

        <button type="submit" className="primary-button" disabled={loading}>
          {loading ? loadingText : copy.action}
          <ArrowRight size={18} />
        </button>

        <div className="auth-links">
          {currentMode !== "login" && <Link to="/login">Back to login</Link>}
          {currentMode === "login" && <Link to="/signup">Create account</Link>}
        </div>
      </form>
    </main>
  );
}
