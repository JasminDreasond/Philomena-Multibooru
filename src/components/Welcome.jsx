/**
 * @param {{ onClick: () => void }} props
 */
export const Welcome = ({ onClick }) => {
  return (
    <div
      className="container d-flex flex-column align-items-center justify-content-center text-center mt-5 fade-in welcome-container"
      style={{ minHeight: '60vh' }}
    >
      <style>{`
                @keyframes floatAnimation {
                  0% { transform: translateY(0px); filter: drop-shadow(0 0 10px rgba(79, 70, 229, 0.3)); }
                  50% { transform: translateY(-15px); filter: drop-shadow(0 0 25px rgba(79, 70, 229, 0.7)); }
                  100% { transform: translateY(0px); filter: drop-shadow(0 0 10px rgba(79, 70, 229, 0.3)); }
                }
                @keyframes pulseGlow {
                  0% { opacity: 0.8; }
                  50% { opacity: 1; filter: brightness(1.2); }
                  100% { opacity: 0.8; }
                }
                .magical-float {
                  animation: floatAnimation 4s ease-in-out infinite;
                }
                .sparkle-text {
                  background: linear-gradient(45deg, var(--app-primary), #d946ef, var(--app-primary));
                  background-size: 200% auto;
                  -webkit-background-clip: text;
                  -webkit-text-fill-color: transparent;
                  animation: pulseGlow 3s linear infinite;
                  display: inline-block;
                }
                .magical-button {
                  background: linear-gradient(45deg, var(--app-primary), #8b5cf6);
                  border: none;
                  box-shadow: 0 4px 15px rgba(139, 92, 246, 0.4);
                  transition: all 0.3s ease;
                }
                .magical-button:hover {
                  transform: translateY(-3px) scale(1.03);
                  box-shadow: 0 6px 20px rgba(139, 92, 246, 0.6);
                  color: white !important;
                }
                .welcome-container {
                  background: radial-gradient(circle at center, rgba(79, 70, 229, 0.05) 0%, transparent 60%);
                  border-radius: 30px;
                }
              `}</style>

      <div className="position-relative mb-4">
        <img
          src="/icon/icon.png"
          height={350}
          alt="Magical icon"
          className="magical-float"
          style={{ zIndex: 2, position: 'relative' }}
        />
      </div>

      <h1 className="display-5 fw-bold mb-3" style={{ color: 'var(--app-text)' }}>
        Welcome to <span className="sparkle-text">Philomena Multi-Booru!</span> ✨
      </h1>

      <p
        className="lead mb-4 mx-auto"
        style={{ maxWidth: '650px', color: 'var(--app-text-muted)' }}
      >
        Your unified gallery experience is almost ready! To start exploring a universe of art and
        bringing multiple instances together, you just need to weave your first spell: connecting
        your favorite Boorus.
      </p>

      <div
        className="alert border-0 shadow-sm mb-4 rounded-4"
        style={{
          backgroundColor: 'var(--app-surface)',
          color: 'var(--app-text)',
          maxWidth: '550px',
        }}
      >
        <i className="bi bi-info-circle-fill text-primary me-2"></i>
        <strong>It's empty here!</strong> Add at least one Philomena API account to unlock the
        portal and start syncing data.
      </div>

      <button
        className="btn btn-lg magical-button text-white fw-bold px-5 py-3 rounded-pill mt-2"
        onClick={onClick}
      >
        <i className="bi bi-magic me-2"></i> Let the Magic Begin!
      </button>
    </div>
  );
};
