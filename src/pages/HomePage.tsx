import { Link } from 'react-router-dom'

function HomePage() {
  return (
    <section className="text-center py-5">
      <h1 className="display-5 fw-semibold">Welcome to Borrower Portal</h1>
      <p className="lead text-muted mt-3">
        Bootstrap, React Router, and Axios are ready to go. Start building your
        pages here.
      </p>
      <div className="mt-4 d-flex justify-content-center gap-3">
        <Link className="btn btn-primary btn-lg" to="/about">
          Learn more
        </Link>
        <a
          className="btn btn-outline-secondary btn-lg"
          href="https://getbootstrap.com/docs/5.3/getting-started/introduction/"
          target="_blank"
          rel="noreferrer"
        >
          View docs
        </a>
      </div>
    </section>
  )
}

export default HomePage
