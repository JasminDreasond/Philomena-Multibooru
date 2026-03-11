import './404.css';

/**
 * @param {{ onClick: () => void }} props
 */
export const Error404 = ({ onClick }) => {
  return (
    <div className="error-container text-center fade-in">
      <img
        src="/img/error404.png"
        alt="Confused ponies at a broken machine"
        className="pony-image mb-4"
      />

      <h3 className="fw-bold mb-3 error-title">Oops! Page Not Found</h3>

      <p className="error-description mb-4 mx-auto">
        The URL you requested does not exist or it belongs to a Booru account that is not currently
        connected in your settings.
      </p>

      <button className="btn btn-home fw-bold shadow-sm" onClick={onClick}>
        Return to Home
      </button>
    </div>
  );
};
