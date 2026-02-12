import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { SidebarProvider } from "@/contexts/SidebarContext";
import { useAuth } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/layout/ProtectedRoute";

import Auth from "./pages/Auth";
import DashboardLayout from "./components/layout/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import ReceptionDashboard from "./pages/ReceptionDashboard";
import DoctorDashboard from "./pages/DoctorDashboard";
import LaboratoryDashboard from "./pages/LaboratoryDashboard";
import NursingDashboard from "./pages/NursingDashboard";
import NurseTaskProgress from "./pages/NurseTaskProgress";
import GenerateNurseReport from "./pages/GenerateNurseReport";
import PharmacyDashboard from "./pages/PharmacyDashboard";
import Patients from "./pages/Patients";
import DoctorExamination from "./pages/DoctorExamination";
import Appointments from "./pages/Appointments";
import AdminAppointments from "./pages/AdminAppointments";
import Staff from "./pages/Staff";
import StaffSchedule from "./pages/StaffSchedule";
import Laboratory from "./pages/Laboratory";
import Pharmacy from "./pages/Pharmacy";
import Reports from "./pages/Reports";
import UserManagement from "./pages/UserManagement";
import Billing from "./pages/Billing";
import Invoices from "./pages/Invoices";
import Accounts from "./pages/Accounts";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();


const roleDashboardMap: Record<string, string> = {
  receptionist: "/reception-dashboard",
  doctor: "/doctor-dashboard",
  lab_technician: "/laboratory-dashboard",
  nurse: "/nursing-dashboard",
  pharmacist: "/pharmacy-dashboard",
  admin: "/admin-dashboard",
};

const RootRedirect = () => {
  const { user, loading, roles } = useAuth();

  // Wait for auth loading to complete
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

  if (!user) return <Navigate to="/auth" replace />;

  // Redirect to the dashboard for the user's primary role
  const primaryRole = roles && roles.length > 0 ? roles[0] : null;
  const dashboardPath = primaryRole && roleDashboardMap[primaryRole] ? roleDashboardMap[primaryRole] : "/dashboard";
  return <Navigate to={dashboardPath} replace />;
};

const DashboardRedirect = () => {
  const { loading, roles } = useAuth();

  // Wait for auth loading to complete
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

  // Redirect /dashboard to the user's role-specific dashboard
  const primaryRole = roles && roles.length > 0 ? roles[0] : null;
  const dashboardPath = primaryRole && roleDashboardMap[primaryRole] ? roleDashboardMap[primaryRole] : "/dashboard";
  return <Navigate to={dashboardPath} replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
          <AuthProvider>
            <SidebarProvider>
              <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/auth" element={<Auth />} />
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<DashboardRedirect />} />
              <Route path="/admin-dashboard" element={
                <ProtectedRoute module="dashboard" requiredRole="admin">
                  <Dashboard />
                </ProtectedRoute>
              } />
              {/* Role-based dashboards */}
              <Route path="/reception-dashboard" element={
                <ProtectedRoute module="dashboard" requiredRole="receptionist">
                  <ReceptionDashboard />
                </ProtectedRoute>
              } />
              <Route path="/doctor-dashboard" element={
                <ProtectedRoute module="dashboard" requiredRole="doctor">
                  <DoctorDashboard />
                </ProtectedRoute>
              } />
              <Route path="/laboratory-dashboard" element={
                <ProtectedRoute module="dashboard" requiredRole="lab_technician">
                  <LaboratoryDashboard />
                </ProtectedRoute>
              } />
              <Route path="/nursing-dashboard" element={
                <ProtectedRoute module="dashboard" requiredRole="nurse">
                  <NursingDashboard />
                </ProtectedRoute>
              } />
              <Route path="/nurse-task-progress" element={
                <ProtectedRoute module="dashboard" requiredRole="nurse">
                  <NurseTaskProgress />
                </ProtectedRoute>
              } />
              <Route path="/generate-nurse-report" element={
                <ProtectedRoute module="dashboard" requiredRole="nurse">
                  <GenerateNurseReport />
                </ProtectedRoute>
              } />
              <Route path="/pharmacy-dashboard" element={
                <ProtectedRoute module="dashboard" requiredRole="pharmacist">
                  <PharmacyDashboard />
                </ProtectedRoute>
              } />
              {/* Existing routes */}
              <Route path="/patients" element={
                <ProtectedRoute module="patients">
                  <Patients />
                </ProtectedRoute>
              } />
              <Route path="/doctor-examination" element={
                <ProtectedRoute module="patients">
                  <DoctorExamination />
                </ProtectedRoute>
              } />
              <Route path="/appointments" element={
                <ProtectedRoute module="appointments">
                  <Appointments />
                </ProtectedRoute>
              } />
              <Route path="/admin/appointments" element={
                <ProtectedRoute module="appointments" requiredRole="admin">
                  <AdminAppointments />
                </ProtectedRoute>
              } />
              <Route path="/staff" element={
                <ProtectedRoute module="staff">
                  <Staff />
                </ProtectedRoute>
              } />
              <Route path="/staff-schedule" element={
                <ProtectedRoute module="staff">
                  <StaffSchedule />
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
              <Route path="/invoices" element={
                <ProtectedRoute module="billing">
                  <Invoices />
                </ProtectedRoute>
              } />
              <Route path="/accounts" element={
                <ProtectedRoute module="accounts">
                  <Accounts />
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
            </SidebarProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;