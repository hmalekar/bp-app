import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiPost } from "../api/client";
import { clearAuthToken, clearCurrentUser, clearUserRole, setCurrentUser, setUserRole } from "../api/http";
import { API_ENDPOINTS } from "../api/contracts/endpoints";
import type { LoginRequest, LoginResponse } from "../api/contracts/types";

const SESSION_EXPIRED_MESSAGE = "Your session has expired. Please sign in again to continue.";

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isSessionExpired = searchParams.get("session") === "expired";

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      clearAuthToken();
      clearUserRole();
      clearCurrentUser();
      const payload: LoginRequest = { Email: email, Password: password };
      const response = await apiPost<LoginResponse, LoginRequest>(API_ENDPOINTS.LOGIN, payload);
      setUserRole(response.Role ?? "");
      setCurrentUser(response.Email ?? "");
      navigate("/pending-workflow", { replace: true });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Login failed";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container min-vh-100 d-flex align-items-center justify-content-center py-5">
      <div className="w-100 mx-auto" style={{ maxWidth: "420px" }}>
        <div className="mb-4">
          <div className="d-flex align-items-center justify-content-center gap-3">
            <h1 className="h3 mb-0">Arbour</h1>
            <img src="/brand.png" alt="Arbour" style={{ height: "40px" }} />
            <h1 className="h3 mb-0">Borrower Portal</h1>
          </div>
          <p className="text-muted text-center mt-2 mb-0">Use the email registered with AIMS to sign in.</p>
        </div>

        <div className="card shadow-sm border-0">
          <div className="card-body p-4">
            {isSessionExpired ? (
              <div className="alert alert-info small py-2 mb-3" role="alert">
                {SESSION_EXPIRED_MESSAGE}
              </div>
            ) : null}
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label" htmlFor="email">
                  Email address
                </label>
                <input
                  className="form-control"
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@company.com"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label" htmlFor="password">
                  Password
                </label>
                <input
                  className="form-control"
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </div>

              {error ? <div className="alert alert-danger small py-2">{error}</div> : null}

              <button className="btn btn-primary w-100" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Signing in..." : "Sign in"}
              </button>
            </form>
          </div>
        </div>

        <p className="text-center text-muted small mt-3 mb-0">Authorized business users only.</p>
      </div>
    </div>
  );
}

export default LoginPage;
