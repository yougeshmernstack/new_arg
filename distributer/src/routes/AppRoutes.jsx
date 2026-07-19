import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import AppLayout from '../components/layout/AppLayout';
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
import ChangePassword from '../pages/auth/ChangePassword';
import Dashboard from '../pages/dashboard/Dashboard';
import Profile from '../pages/profile/Profile';
import Notifications from '../pages/notifications/Notifications';
import Products from '../pages/store/Products';
import ProductDetail from '../pages/store/ProductDetail';
import Packages from '../pages/store/Packages';
import PackageCheckout from '../pages/store/PackageCheckout';
import Cart from '../pages/store/Cart';
import Checkout from '../pages/store/Checkout';
import Orders from '../pages/store/Orders';
import OrderDetail from '../pages/store/OrderDetail';
import TeamList from '../pages/team/TeamList';
import BinaryTeam from '../pages/team/BinaryTeam';
import BinaryLegList from '../pages/team/BinaryLegList';
import FundWallet from '../pages/wallet/FundWallet';

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="fund-wallet" element={<FundWallet />} />
            <Route path="packages" element={<Packages />} />
            <Route path="packages/:packageId/checkout" element={<PackageCheckout />} />
            <Route path="products" element={<Products />} />
            <Route path="products/:productId" element={<ProductDetail />} />
            <Route path="cart" element={<Cart />} />
            <Route path="checkout" element={<Checkout />} />
            <Route path="orders" element={<Orders />} />
            <Route path="orders/:orderId" element={<OrderDetail />} />
            <Route path="team/direct" element={<TeamList type="direct" />} />
            <Route path="team/generation" element={<TeamList type="generation" />} />
            <Route path="team/left" element={<BinaryLegList side="left" />} />
            <Route path="team/right" element={<BinaryLegList side="right" />} />
            <Route path="team/binary" element={<BinaryTeam />} />
            <Route path="profile" element={<Profile />} />
            <Route path="change-password" element={<ChangePassword />} />
            <Route path="notifications" element={<Notifications />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
