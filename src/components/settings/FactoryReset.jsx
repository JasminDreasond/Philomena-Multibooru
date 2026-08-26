import { confirm } from 'tiny-essentials/webTemplates/bootstrap/5.3/html/BootstrapDialogs';
import { factoryResetDatabase } from '../../services/api/System.js';

/**
 * @param {Object} config
 * @param {boolean} config.isLoading
 */
export const FactoryReset = ({ isLoading }) => {
  /**
   * @returns {Promise<void>}
   */
  const handleFactoryReset = async () => {
    /** @type {boolean} */
    const firstWarning = await confirm(
      'WARNING: This will delete ALL data, including cached images, tags, and accounts. Do you want to proceed?',
    );
    if (!firstWarning) return;

    /** @type {boolean} */
    const secondWarning = await confirm(
      'FINAL WARNING: This action is completely irreversible. Are you absolutely sure you want to factory reset the database?',
    );
    if (secondWarning) {
      await factoryResetDatabase();
      window.location.reload();
    }
  };

  return (
    <div className="alert alert-danger d-flex flex-column flex-md-row justify-content-between align-items-center mb-0 mt-2 shadow-sm">
      <div className="mb-2 mb-md-0">
        <strong>Danger Zone:</strong> Factory reset will wipe the entire JsStore database.
      </div>
      <button className="btn btn-danger fw-bold" onClick={handleFactoryReset} disabled={isLoading}>
        FACTORY RESET
      </button>
    </div>
  );
};
