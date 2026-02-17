import { NavLink, Outlet } from 'react-router-dom'

function RootLayout() {
  return (
    <div className="min-vh-100 d-flex flex-column">
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
        <div className="container-fluid">
          <NavLink className="navbar-brand" to="/">
            Borrower Portal
          </NavLink>
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
            <div className="navbar-nav">
              <NavLink className="nav-link" to="/">
                Home
              </NavLink>
              <NavLink className="nav-link" to="/about">
                About
              </NavLink>
            </div>
          </div>
        </div>
      </nav>

      <main className="container-fluid py-4 flex-grow-1">
        <Outlet />
      </main>

      <footer className="bg-light border-top py-3">
        <div className="container-fluid text-muted small">
          © {new Date().getFullYear()} Borrower Portal
        </div>
      </footer>
    </div>
  )
}

export default RootLayout
