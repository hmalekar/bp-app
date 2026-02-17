import { Link } from 'react-router-dom'

function NotFoundPage() {
  return (
    <div className="text-center py-5">
      <h1 className="display-6">Page not found</h1>
      <p className="text-muted mt-2">
        The page you are looking for does not exist.
      </p>
      <Link className="btn btn-primary mt-3" to="/">
        Back to home
      </Link>
    </div>
  )
}

export default NotFoundPage
