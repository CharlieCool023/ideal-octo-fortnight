import { Routes, Route } from "react-router";
import "./App.css";
import Home from "./pages/Home";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import NotFound from "./pages/NotFound";
import ProfileView from "./pages/ProfileView";
import SuperAdminDashboard from "./pages/dashboard/SuperAdminDashboard";
import StateCommandantDashboard from "./pages/dashboard/StateCommandantDashboard";
import CampCommandantDashboard from "./pages/dashboard/CampCommandantDashboard";
import InstructorDashboard from "./pages/dashboard/InstructorDashboard";
import ManOWarDashboard from "./pages/dashboard/ManOWarDashboard";
import SoldierDashboard from "./pages/dashboard/SoldierDashboard";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/super-admin/login" element={<LoginPage portal="super_admin" />} />
      <Route path="/dashboard/super-admin" element={<SuperAdminDashboard />} />
      <Route path="/dashboard/state-commandant" element={<StateCommandantDashboard />} />
      <Route path="/dashboard/camp-commandant" element={<CampCommandantDashboard />} />
      <Route path="/dashboard/instructor" element={<InstructorDashboard />} />
      <Route path="/dashboard/man-o-war" element={<ManOWarDashboard />} />
      <Route path="/dashboard/soldier" element={<SoldierDashboard />} />
      <Route path="/profile/:id" element={<ProfileView />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
