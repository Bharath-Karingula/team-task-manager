import ReactDOM from "react-dom/client";

import { Toaster } from "react-hot-toast";

import {
  BrowserRouter,
  Routes,
  Route
} from "react-router-dom";

import "./index.css";
import App from "./App";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import Tasks from "./pages/Tasks";
import Activity from "./pages/Activity";
import Team from "./pages/Team";
import Notifications from "./pages/Notifications";
import Settings from "./pages/Settings";

import ProtectedRoute from "./components/ProtectedRoute";
import { ThemeProvider } from "./context/ThemeContext";

ReactDOM.createRoot(
  document.getElementById("root")
).render(

  <ThemeProvider>

  <BrowserRouter>

    <Toaster position="top-right" />

    <Routes>

      <Route
        path="/welcome"
        element={<App />}
      />

      <Route
        path="/login"
        element={<Login />}
      />

      <Route
        path="/signup"
        element={<Login mode="signup" />}
      />

      <Route
        path="/forgot-password"
        element={<Login mode="forgot" />}
      />

      <Route
        path="/reset-password"
        element={<Login mode="reset" />}
      />

      <Route
        path="/verify-email"
        element={<Login mode="verify" />}
      />

      <Route
        path="/"
        element={
          <ProtectedRoute>

            <Dashboard />

          </ProtectedRoute>
        }
      />

      <Route
        path="/projects"
        element={
          <ProtectedRoute>

            <Projects />

          </ProtectedRoute>
        }
      />

      <Route
        path="/tasks"
        element={
          <ProtectedRoute>

            <Tasks />

          </ProtectedRoute>
        }
      />

      <Route
        path="/activity"
        element={
          <ProtectedRoute>
            <Activity />
          </ProtectedRoute>
        }
      />

      <Route
        path="/team"
        element={
          <ProtectedRoute>
            <Team />
          </ProtectedRoute>
        }
      />

      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <Notifications />
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />

    </Routes>

  </BrowserRouter>

  </ThemeProvider>

);
