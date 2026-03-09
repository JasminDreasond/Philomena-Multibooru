export const Loading = () => {
  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        zIndex: 9999,
        backdropFilter: 'blur(3px)',
      }}
    >
      <div
        className="spinner-border text-primary"
        style={{ width: '4rem', height: '4rem' }}
        role="status"
      >
        <span className="visually-hidden">Loading...</span>
      </div>
    </div>
  );
};
