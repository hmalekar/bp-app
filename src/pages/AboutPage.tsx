function AboutPage() {
  return (
    <section className="row justify-content-center">
      <div className="col-lg-8">
        <h1 className="mb-3">About this setup</h1>
        <p className="text-muted">
          This project is wired with Bootstrap styles, client-side routing via
          React Router, and Axios ready for API calls. Add additional pages or
          layouts as needed.
        </p>
        <div className="card mt-4">
          <div className="card-body">
            <h5 className="card-title">Next steps</h5>
            <ul className="mb-0">
              <li>Create feature modules under <code>src/pages</code>.</li>
              <li>Add route groups or nested layouts for large sections.</li>
              <li>Set up an Axios client in <code>src/api</code> if needed.</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}

export default AboutPage
