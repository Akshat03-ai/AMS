import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import About from "./pages/About";
import Login from "./pages/Login";
import Contact from "./pages/Contact";
import Privacy from "./pages/PrivacyPolicy";
import Terms from "./pages/Terms";
import ForgotPassword from "./pages/ForgotPassword";
import StoreManagerDashboard from "./storemanager/StoreManagerDashboard";
import OfficerDashboard from "./officer/OfficerDashboard";
import AdminDashboard from "./admin/AdminDashboard";
import CreateUser from "./components/CreateUser";
import Profile from "./components/Profile";
import Users from "./admin/Users";
import Departments from "./admin/Departments";
import Offices from "./admin/Offices";
import Audit from "./admin/Audit";
import SMAudit from "./storemanager/StoreManagerAudit";
import Inventory from "./storemanager/Assets/Inventory";
import AssetMaster from "./storemanager/Assets/AssetMaster";
import Purchases from "./storemanager/StoreManagerPurchases";
import Disposals from "./storemanager/StoreManagerDisposals";
import Maintenance from "./storemanager/StoreManagerMaintenance";
import Lifecycle from "./storemanager/StoreManagerLifecycle";
import Assignments from "./storemanager/Assignments";
import Assets from "./officer/MyAssets";
import Request from "./officer/Request";
import RequestsStatus from "./officer/RequestsStatus";
import Requests from "./storemanager/Requests";

const Layout = () => {
  const location = useLocation();

  const hideFooterRoutes = ["/login", "/forgot-password"];

  const shouldShowFooter = !hideFooterRoutes.includes(location.pathname);

  return (
    <>
      <Navbar />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/store-manager/dashboard" element={<StoreManagerDashboard />} />
        <Route path="/officer/dashboard" element={<OfficerDashboard />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/create-user" element={<CreateUser />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/admin/users" element={<Users />} />
        <Route path="/admin/departments" element={<Departments />} />
        <Route path="/admin/offices" element={<Offices />} />
        <Route path="/admin/audit" element={<Audit />} />
        <Route path="/store-manager/audit" element={<SMAudit />} />
        <Route path="/store-manager/assets">
          <Route index element={<Inventory />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="master" element={<AssetMaster />} />
        </Route>
        <Route path="/store-manager/lifecycle" element={<Lifecycle />} />
        <Route path="/store-manager/lifecycle/purchases" element={<Purchases />} />
        <Route path="/store-manager/lifecycle/maintenance" element={<Maintenance />} />
        <Route path="/store-manager/lifecycle/disposals" element={<Disposals />} />
        <Route path="/store-manager/assignments" element={<Assignments />} />
        <Route path="/officer/assets" element={<Assets />} />
        <Route path="/officer/request" element={<Request />} />
        <Route path="/officer/requeststatus" element={<RequestsStatus />} />
        <Route path="/store-manager/requests" element={<Requests />} />
      </Routes>

      { shouldShowFooter && <Footer />
}
    </>
  );
};

function App() {

  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  );
}

export default App;
