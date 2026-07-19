import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import AppLayout from '../components/layout/AppLayout';
import Login from '../pages/auth/Login';
import ChangePassword from '../pages/auth/ChangePassword';
import Dashboard from '../pages/dashboard/Dashboard';
import Franchises from '../pages/franchises/Franchises';
import CreateFranchise from '../pages/franchises/CreateFranchise';
import Distributors from '../pages/distributors/Distributors';
import AuditLogs from '../pages/audit/AuditLogs';
import Products from '../pages/products/Products';
import CreateProduct from '../pages/products/CreateProduct';
import EditProduct from '../pages/products/EditProduct';
import StockHistory from '../pages/products/StockHistory';
import Inventory from '../pages/inventory/Inventory';
import Packages from '../pages/packages/Packages';
import CreatePackage from '../pages/packages/CreatePackage';
import EditPackage from '../pages/packages/EditPackage';
import Orders from '../pages/orders/Orders';
import OrderDetail from '../pages/orders/OrderDetail';
import PaymentSettings from '../pages/payments/PaymentSettings';
import FundDeposits from '../pages/payments/FundDeposits';
import FundDepositHistory from '../pages/payments/FundDepositHistory';
import SendFund from '../pages/payments/SendFund';
import SendFundHistory from '../pages/payments/SendFundHistory';

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="franchises" element={<Franchises />} />
            <Route path="franchises/create" element={<CreateFranchise />} />
            <Route path="distributors" element={<Distributors />} />
            <Route path="products" element={<Products />} />
            <Route path="products/create" element={<CreateProduct />} />
            <Route path="products/:productId/edit" element={<EditProduct />} />
            <Route path="packages" element={<Packages />} />
            <Route path="packages/create" element={<CreatePackage />} />
            <Route path="packages/:packageId/edit" element={<EditPackage />} />
            <Route path="stock-history" element={<StockHistory />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="orders" element={<Navigate to="/orders/franchise" replace />} />
            <Route path="orders/franchise" element={<Orders buyerRole="franchise" />} />
            <Route path="orders/distributor" element={<Orders buyerRole="distributor" />} />
            <Route path="orders/theme" element={<Orders buyerRole="theme" />} />
            <Route path="orders/:orderId" element={<OrderDetail />} />

            <Route path="payment-settings" element={<PaymentSettings />} />
            <Route path="fund-deposits" element={<FundDeposits />} />
            <Route path="fund-deposit-history" element={<FundDepositHistory />} />
            <Route path="send-fund" element={<SendFund />} />
            <Route path="send-fund-history" element={<SendFundHistory />} />
            <Route path="audit-logs" element={<AuditLogs />} />
            <Route path="change-password" element={<ChangePassword />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
