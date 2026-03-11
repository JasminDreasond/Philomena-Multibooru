export const Privacy = () => (
  <div className="fade-in pt-3">
    <div className="card no-anim">
      <div className="card-header fw-bold">Privacy Policy & Terms of Use</div>
      <div className="card-body">
        <h5 className="fw-bold text-primary">Privacy & Security First</h5>
        <p>
          Your data is <em>yours</em>.{' '}
          <strong>
            Philomena Multi-Booru does not collect, track, or send any of your personal information
            to external servers.
          </strong>
        </p>
        <ul className="mb-4">
          <li className="mb-2">
            <strong>Local Storage Only:</strong> Everything—from your cached images and search
            history to your custom themes—is stored locally in your browser using IndexedDB
            (JsStore) and LocalStorage.
          </li>
          <li className="mb-2">
            <strong>API Key Responsibility:</strong> Because your API keys are saved directly within
            your browser's local environment, keeping them secure is entirely your responsibility.
            Treat your browser and device security with care, and never share your exported app data
            if it contains your keys.
          </li>
        </ul>

        <h5
          className="fw-bold mt-4 text-primary border-top pt-3"
          style={{ borderColor: 'var(--app-border)' }}
        >
          Philomena API Limitations
        </h5>
        <p className="mb-0">
          This entire application is built around and strictly limited by the capabilities of the
          official <strong>Philomena API</strong>. Because we rely entirely on the endpoints
          provided by the platform, not every native website feature can be brought into this app
          right now. However, the project is actively maintained. Whenever the API receives updates
          that open the door for new functionalities, they will be implemented here.
        </p>
      </div>
    </div>
  </div>
);
