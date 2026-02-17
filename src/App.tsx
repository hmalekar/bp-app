import { Navigate, Route, Routes } from "react-router-dom";
import AuthLayout from "./layouts/AuthLayout";
import RootLayout from "./layouts/RootLayout";
import AboutPage from "./pages/AboutPage";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import NotFoundPage from "./pages/NotFoundPage";
import PendingMisDetailPage from "./pages/PendingMisDetailPage";
import PendingMisGridEditPage from "./pages/PendingMisGridEditPage";
import PendingMisExcelGridPage from "./pages/PendingMisExcelGridPage";
import PendingMisTableDrawerPage from "./pages/PendingMisTableDrawerPage";
import UploadSalesMisPage from "./pages/UploadSalesMisPage";

function App() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route index element={<Navigate to="/login" replace />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="pending-mis" element={<PendingMisDetailPage />} />
        <Route path="pending-mis-table" element={<PendingMisTableDrawerPage />} />
        <Route path="pending-mis-grid" element={<PendingMisGridEditPage />} />
        <Route path="pending-mis-excel" element={<PendingMisExcelGridPage />} />
        <Route path="upload-sales-mis" element={<UploadSalesMisPage />} />
      </Route>
      <Route element={<AuthLayout />}>
        <Route path="login" element={<LoginPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
