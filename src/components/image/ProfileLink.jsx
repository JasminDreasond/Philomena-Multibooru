import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * Helper component to render a grouped submenu for URLs.
 * @param {{ icon: string, label: string, url: string, openLeft: boolean }} props
 */
const ContextMenuGroup = ({ icon, label, url, openLeft }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleCopy = () => navigator.clipboard.writeText(url);
  const handleOpenTab = () => window.open(url, '_blank', 'noopener,noreferrer');
  const handleOpenWindow = () =>
    window.open(url, '_blank', 'width=800,height=600,noopener,noreferrer');

  return (
    <div
      className="position-relative"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        className="dropdown-item d-flex justify-content-between align-items-center fw-semibold rounded"
        style={{
          fontSize: '0.85rem',
          padding: '0.4rem 1rem',
          cursor: 'default',
        }}
        onClick={(e) => e.preventDefault()}
      >
        <span>
          <i
            className={`${icon} me-2 text-primary`}
            style={{ width: '16px', textAlign: 'center' }}
          ></i>
          {label}
        </span>
        <i className="fa-solid fa-chevron-right ms-4 text-muted" style={{ fontSize: '0.7rem' }}></i>
      </button>

      {isOpen && (
        <div
          className="dropdown-menu show shadow position-absolute border p-1"
          style={{
            top: '-5px',
            ...(openLeft
              ? { right: '100%', left: 'auto', marginRight: '2px' }
              : { left: '100%', right: 'auto', marginLeft: '2px' }),
            margin: 0,
            backgroundColor: 'var(--app-surface)',
            minWidth: '170px',
          }}
        >
          <button
            className="dropdown-item fw-semibold rounded py-1"
            style={{ fontSize: '0.85rem' }}
            onClick={handleCopy}
          >
            <i className="fa-solid fa-copy me-2" style={{ width: '16px', textAlign: 'center' }}></i>{' '}
            Copy URL
          </button>
          <button
            className="dropdown-item fw-semibold rounded py-1"
            style={{ fontSize: '0.85rem' }}
            onClick={handleOpenTab}
          >
            <i
              className="fa-solid fa-arrow-up-right-from-square me-2"
              style={{ width: '16px', textAlign: 'center' }}
            ></i>{' '}
            New Tab
          </button>
          <button
            className="dropdown-item fw-semibold rounded py-1"
            style={{ fontSize: '0.85rem' }}
            onClick={handleOpenWindow}
          >
            <i
              className="fa-solid fa-window-restore me-2"
              style={{ width: '16px', textAlign: 'center' }}
            ></i>{' '}
            New Window
          </button>
        </div>
      )}
    </div>
  );
};

/**
 * @typedef {(booruUrl: string, username: string, id: number) => void} OpenProfile
 */

/**
 * @param {{ x: number, y: number, booruUrl: string, username: string, userId?: number | null, onClose: () => void, openProfile: OpenProfile }} props
 */
const ProfileContextMenu = ({ x, y, booruUrl, username, userId, onClose, openProfile }) => {
  const booruHostname = new URL(booruUrl).hostname;

  const appProfileUrl = `${window.location.origin}/${booruHostname}/profiles/${userId}`;
  const booruProfileUrl = `${booruUrl}/profiles/${encodeURIComponent(username.replace(/ /g, '+'))}`;

  const groups = [
    { icon: 'fa-solid fa-id-badge', label: 'App Profile', url: appProfileUrl },
    { icon: 'fa-solid fa-user-circle', label: 'Booru Profile', url: booruProfileUrl },
  ];

  const openProfilesInApp = localStorage.getItem('app_inAppProfileViewer') === 'true';
  const openLeft = x > window.innerWidth - 380;
  const safeX = Math.min(x, window.innerWidth - 220);

  const totalItemsCount = (!openProfilesInApp ? 1 : 0) + groups.length;
  const safeY = Math.min(y, window.innerHeight - totalItemsCount * 40);

  return createPortal(
    <>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 1040,
        }}
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      />
      <div
        className="dropdown-menu show shadow p-1"
        style={{
          position: 'fixed',
          top: Math.max(0, safeY),
          left: Math.max(0, safeX),
          zIndex: 1050,
          backgroundColor: 'var(--app-surface)',
          borderColor: 'var(--app-border)',
        }}
      >
        {!openProfilesInApp && (
          <>
            <button
              className="dropdown-item d-flex justify-content-start align-items-center fw-semibold rounded"
              style={{
                fontSize: '0.85rem',
                padding: '0.4rem 1rem',
                color: 'var(--app-text)',
              }}
              onClick={(e) => {
                e.preventDefault();
                openProfile(booruUrl, userId, userId);
                onClose();
              }}
            >
              <i
                className="fa-solid fa-id-badge me-2 text-primary"
                style={{ width: '16px', textAlign: 'center' }}
              ></i>
              Open Profile in App
            </button>
            <hr className="dropdown-divider my-1" style={{ borderColor: 'var(--app-border)' }} />
          </>
        )}

        {groups.map((group, idx) => (
          <ContextMenuGroup
            key={idx}
            icon={group.icon}
            label={group.label}
            url={group.url}
            openLeft={openLeft}
          />
        ))}
      </div>
    </>,
    document.body,
  );
};

/**
 * @param {{ booruUrl: string, username: string, userId?: number | null, className?: string, children: import('react').ReactNode, openProfile: OpenProfile }} props
 */
export const ProfileLink = ({
  booruUrl,
  username,
  userId,
  className,
  children,
  onClick,
  openProfile,
}) => {
  /** @type {[{ visible: boolean, x: number, y: number }, import('react').Dispatch<import('react').SetStateAction<{ visible: boolean, x: number, y: number }>>]} */
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0 });

  const openProfilesInApp = localStorage.getItem('app_inAppProfileViewer') === 'true';
  const booruHostname = new URL(booruUrl).hostname;

  const appProfileUrl = `/${booruHostname}/profiles/${userId}`;
  const booruProfileUrl = `${booruUrl}/profiles/${encodeURIComponent(username.replace(/ /g, '+'))}`;

  const targetUrl = openProfilesInApp ? appProfileUrl : booruProfileUrl;

  useEffect(() => {
    if (!contextMenu.visible) return;

    const handleClickOutside = () => setContextMenu({ visible: false, x: 0, y: 0 });
    document.addEventListener('click', handleClickOutside);

    return () => document.removeEventListener('click', handleClickOutside);
  }, [contextMenu.visible]);

  /**
   * @param {import('react').MouseEvent} e
   */
  const handleContextMenu = (e) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
    });
  };

  const closeContextMenu = () => {
    setContextMenu({ visible: false, x: 0, y: 0 });
  };

  return (
    <>
      <a
        href={targetUrl}
        target={openProfilesInApp ? null : '_blank'}
        rel={openProfilesInApp ? '' : 'noopener noreferrer'}
        className={className || 'text-decoration-none fw-bold text-primary cursor-pointer'}
        onContextMenu={handleContextMenu}
        onClick={onClick}
      >
        {children}
      </a>

      {contextMenu.visible && (
        <ProfileContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          booruUrl={booruUrl}
          username={username}
          userId={userId}
          openProfile={openProfile}
          onClose={closeContextMenu}
        />
      )}
    </>
  );
};
