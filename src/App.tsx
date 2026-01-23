import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/layout/ProtectedRoute";

import Auth from "./pages/Auth";
import DashboardLayout from "./components/layout/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Patients from "./pages/Patients";
import Appointments from "./pages/Appointments";
import Staff from "./pages/Staff";
import Laboratory from "./pages/Laboratory";
import Pharmacy from "./pages/Pharmacy";
import Reports from "./pages/Reports";
import UserManagement from "./pages/UserManagement";
import Billing from "./pages/Billing";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const RootRedirect = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return <Navigate to={user ? "/dashboard" : "/auth"} replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/auth" element={<Auth />} />
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={
                <ProtectedRoute module="dashboard">
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/patients" element={
                <ProtectedRoute module="patients">
                  <Patients />
                </ProtectedRoute>
              } />
              <Route path="/appointments" element={
                <ProtectedRoute module="appointments">
                  <Appointments />
                </ProtectedRoute>
              } />
              <Route path="/staff" element={
                <ProtectedRoute module="staff">
                  <Staff />
                </ProtectedRoute>
              } />
              <Route path="/laboratory" element={
                <ProtectedRoute module="laboratory">
                  <Laboratory />
                </ProtectedRoute>
              } />
              <Route path="/pharmacy" element={
                <ProtectedRoute module="pharmacy">
                  <Pharmacy />
                </ProtectedRoute>
              } />
              <Route path="/reports" element={
                <ProtectedRoute module="reports">
                  <Reports />
                </ProtectedRoute>
              } />
              <Route path="/billing" element={
                <ProtectedRoute module="billing">
                  <Billing />
                </ProtectedRoute>
              } />
              <Route path="/admin/users" element={
                <ProtectedRoute module="user_management">
                  <UserManagement />
                </ProtectedRoute>
              } />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;