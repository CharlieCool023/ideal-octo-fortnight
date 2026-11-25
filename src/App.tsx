import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router";
import "./App.css";

const Home = lazy(() => import("./pages/Home"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ProfileView = lazy(() => import("./pages/ProfileView"));
const SuperAdminDashboard = lazy(() => import("./pages/dashboard/SuperAdminDashboard"));
const StateCommandantDashboard = lazy(() => import("./pages/dashboard/StateCommandantDashboard"));
const CampCommandantDashboard = lazy(() => import("./pages/dashboard/CampCommandantDashboard"));
const InstructorDashboard = lazy(() => import("./pages/dashboard/InstructorDashboard"));
const ManOWarDashboard = lazy(() => import("./pages/dashboard/ManOWarDashboard"));
const SoldierDashboard = lazy(() => import("./pages/dashboard/SoldierDashboard"));

function PageLoading() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center" role="status" aria-label="Loading page">
      <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function renderPage(element: React.ReactNode) {
  return <Suspense fallback={<PageLoading />}>{element}</Suspense>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={renderPage(<Home />)} />
      <Route path="/register" element={renderPage(<RegisterPage />)} />
      <Route path="/login" element={renderPage(<LoginPage />)} />
      <Route path="/super-admin/login" element={renderPage(<LoginPage portal="super_admin" />)} />
      <Route path="/dashboard/super-admin" element={renderPage(<SuperAdminDashboard />)} />
      <Route path="/dashboard/state-commandant" element={renderPage(<StateCommandantDashboard />)} />
      <Route path="/dashboard/camp-commandant" element={renderPage(<CampCommandantDashboard />)} />
      <Route path="/dashboard/instructor" element={renderPage(<InstructorDashboard />)} />
      <Route path="/dashboard/man-o-war" element={renderPage(<ManOWarDashboard />)} />
      <Route path="/dashboard/soldier" element={renderPage(<SoldierDashboard />)} />
      <Route path="/profile/:id" element={renderPage(<ProfileView />)} />
      <Route path="*" element={renderPage(<NotFound />)} />
    </Routes>
  );
}
