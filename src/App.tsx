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
import ReviewSalesMisPage from "./pages/ReviewSalesMisPage";
import AddDisbursementRequestPage from "./pages/AddDisbursementRequestPage";
import ManageDisbursementRequestPage from "./pages/ManageDisbursementRequestPage";
import BorrowerDisbursementRequestPage from "./pages/BorrowerDisbursementRequestPage";
import DownloadSalesMisPage from "./pages/DownloadSalesMisPage";
import ApprovedDisbursementRequestsPage from "./pages/ApprovedDisbursementRequestsPage";

function App() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route index element={<Navigate to="/login" replace />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="pending-workflow" element={<DashboardPage />} />
        <Route path="dashboard" element={<Navigate to="/pending-workflow" replace />} />
        <Route path="pending-mis" element={<PendingMisDetailPage />} />
        <Route path="pending-mis-table" element={<PendingMisTableDrawerPage />} />
        <Route path="pending-mis-grid" element={<PendingMisGridEditPage />} />
        <Route path="pending-mis-excel" element={<PendingMisExcelGridPage />} />
        <Route path="upload-sales-mis" element={<UploadSalesMisPage />} />
        <Route path="review-sales-mis" element={<ReviewSalesMisPage />} />
        <Route path="download-sales-mis" element={<DownloadSalesMisPage />} />
        <Route path="add-disbursement-request" element={<AddDisbursementRequestPage />} />
        <Route path="manage-disbursement-request/:drNumber" element={<ManageDisbursementRequestPage />} />
        <Route path="my-disbursement-request/:drNumber" element={<BorrowerDisbursementRequestPage />} />
        <Route path="approved-disbursement-requests" element={<ApprovedDisbursementRequestsPage />} />
      </Route>
      <Route element={<AuthLayout />}>
        <Route path="login" element={<LoginPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
