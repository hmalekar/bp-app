import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { clearAuthToken, clearCurrentUser, clearUserRole, getCurrentUser, getUserRole } from "../api/http";

const PATH_PAGE_NAMES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/about": "About",
  "/pending-mis": "Pending MIS",
  "/pending-mis-table": "Pending MIS Table",
  "/pending-mis-grid": "Pending MIS Grid",
  "/pending-mis-excel": "Pending MIS Excel",
  "/upload-sales-mis": "Upload Sales MIS",
  "/review-sales-mis": "Review Sales MIS",
  "/add-disbursement-request": "Add Disbursement Request",
  "/manage-disbursement-request": "Manage Disbursement Request",
};

function RootLayout() {
  const currentUser = getCurrentUser();
  const userRole = getUserRole();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const pageName =
    PATH_PAGE_NAMES[pathname] ??
    (pathname.startsWith("/manage-disbursement-request") ? "Manage Disbursement Request" : "");

  const handleLogout = () => {
    clearAuthToken();
    clearCurrentUser();
    clearUserRole();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-vh-100 d-flex flex-column">
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
        <div className="container-fluid">
          <NavLink className="navbar-brand" to="/">
            Borrower Portal
          </NavLink>
          {pageName ? <span className="navbar-text text-light text-opacity-90 d-none d-md-inline">{pageName}</span> : null}
          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#primaryNavbar"
            aria-controls="primaryNavbar"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon" />
          </button>
          <div className="collapse navbar-collapse" id="primaryNavbar">
            {/* <div className="navbar-nav">
              <NavLink className="nav-link" to="/">
                Home
              </NavLink>
              <NavLink className="nav-link" to="/about">
                About
              </NavLink>
            </div> */}
            {currentUser ? (
              <div className="navbar-nav ms-auto align-items-center gap-2">
                <span className="nav-link text-light text-opacity-90 py-0" aria-label="Logged in as">
                  {currentUser}
                  {userRole ? ` (Role: ${userRole})` : ""}
                </span>
                <button
                  type="button"
                  className="btn btn-outline-light btn-sm d-flex align-items-center justify-content-center p-2"
                  onClick={handleLogout}
                  aria-label="Log out"
                  title="Log out"
                >
                  <i className="bi bi-power" aria-hidden />
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </nav>

      <main className="container-fluid py-4 flex-grow-1">
        <Outlet />
      </main>

      <footer className="bg-light border-top py-3">
        <div className="container-fluid text-muted small">© {new Date().getFullYear()} Arbour Investments</div>
      </footer>
    </div>
  );
}

export default RootLayout;
