export const About = () => (
  <div className="fade-in pt-3">
    <div className="card no-anim mb-4">
      <div className="card-header fw-bold">About Philomena Multi-Booru</div>
      <div className="card-body">
        <p>
          Welcome to <strong>Philomena Multi-Booru</strong>! This project was born out of a desire
          to create a unified, fast, and customizable experience for browsing various
          Philomena-based image boards all in one place.
        </p>
        <p>
          It was built as a passion project to give back to the community, aiming to provide a
          seamless interface that respects user privacy and system resources. Whether you are
          browsing, filtering, or organizing your favorite images, this tool is designed to make the
          experience as smooth as possible.
        </p>

        <h6 className="fw-bold mt-4 border-top pt-3" style={{ borderColor: 'var(--app-border)' }}>
          Support & Contributions
        </h6>
        <p className="mb-2">
          If you like this project and want to support its development, you can check out the source
          code, contribute, or find donation links on my GitHub profile. Every little bit of support
          is highly appreciated!
        </p>
        <a
          href="https://github.com/Pony-House/Philomena-Multibooru"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-outline-primary btn-sm fw-bold"
        >
          <i class="fa-brands fa-github"></i> Visit my GitHub
        </a>
      </div>
    </div>

    <div className="card no-anim">
      <div className="card-header fw-bold">Frequently Asked Questions (FAQ)</div>
      <div className="card-body">
        <div className="mb-4">
          <h6 className="fw-bold text-primary">Is this an official Philomena application?</h6>
          <p className="text-muted small mb-0">
            No, absolutely not. This is a 100% independent project. I have no affiliation with the
            official Philomena open-source project or any specific booru website. I am just a
            regular person and community member who wanted to build a helpful tool for everyone to
            enjoy.
          </p>
        </div>

        <div className="mb-4">
          <h6 className="fw-bold text-primary">Will you add image uploading features?</h6>
          <p className="text-muted small mb-0">
            No. I do not plan to implement any image upload APIs. I am not interested in taking
            responsibility for any glitches, misattributions, or accidental rule-breaking uploads
            that could happen through a third-party application. Uploading images is a sensitive
            process and is best done directly on the respective websites.
          </p>
        </div>

        <div className="mb-0">
          <h6 className="fw-bold text-primary">Why aren't all website features available here?</h6>
          <p className="text-muted small mb-0">
            This application relies entirely on the public API endpoints provided by the Philomena
            software. If a feature isn't supported by their API, I cannot magically add it here.
            However, as the API evolves, I will do my best to implement new supported features!
          </p>
        </div>
      </div>
    </div>
  </div>
);
