/**
 * @typedef {Object} ModalOptions
 * @property {string} [title]
 * @property {string} [confirmText]
 * @property {string} [cancelText]
 * @property {string} [defaultValue]
 */

import { Modal } from 'bootstrap/dist/js/bootstrap.bundle.min.js';

/**
 * @typedef {Object} ModalOptions
 * @property {string} [title]
 * @property {string} [confirmText]
 * @property {string} [cancelText]
 * @property {string} [defaultValue]
 */

/**
 * Utility to replace native alert/confirm/prompt with Bootstrap 5 modals.
 */
class BootstrapDialogs {
  /**
   * @param {string} message
   * @param {ModalOptions} [options]
   * @returns {Promise<void>}
   */
  static async alert(message, options = {}) {
    /** @type {string} */
    const title = options.title || 'Alert';
    /** @type {string} */
    const confirmText = options.confirmText || 'OK';

    const html = this._createTemplate(title, message, false, confirmText);
    await this._show(html, 'alert');
  }

  /**
   * @param {string} message
   * @param {ModalOptions} [options]
   * @returns {Promise<boolean>}
   */
  static async confirm(message, options = {}) {
    /** @type {string} */
    const title = options.title || 'Confirm';
    /** @type {string} */
    const confirmText = options.confirmText || 'Yes';
    /** @type {string} */
    const cancelText = options.cancelText || 'No';

    const html = this._createTemplate(title, message, true, confirmText, cancelText);
    return await this._show(html, 'confirm');
  }

  /**
   * @param {string} message
   * @param {string} [defaultValue]
   * @param {ModalOptions} [options]
   * @returns {Promise<string|null>}
   */
  static async prompt(message, defaultValue = '', options = {}) {
    /** @type {string} */
    const title = options.title || 'Prompt';
    /** @type {string} */
    const confirmText = options.confirmText || 'Submit';
    /** @type {string} */
    const cancelText = options.cancelText || 'Cancel';

    const inputHtml = `<input type="text" class="form-control mt-2" id="bs-prompt-input" value="${defaultValue}">`;
    const bodyContent = `${message}${inputHtml}`;

    const html = this._createTemplate(title, bodyContent, true, confirmText, cancelText);
    return await this._show(html, 'prompt');
  }

  /**
   * @param {string} title
   * @param {string} body
   * @param {boolean} showCancel
   * @param {string} confirmText
   * @param {string} [cancelText]
   * @returns {string}
   */
  static _createTemplate(title, body, showCancel, confirmText, cancelText = 'Cancel') {
    /** @type {string} */
    const cancelBtn = showCancel
      ? `<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">${cancelText}</button>`
      : '';

    return `
            <div class="modal fade" id="bs-custom-modal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header" style="background-color: var(--app-navbar-bg);">
                            <h5 class="modal-title">${title}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close" style="color: #fff;"></button>
                        </div>
                        <div class="modal-body" style="white-space: pre-wrap;">${body}</div>
                        <div class="modal-footer">
                            ${cancelBtn}
                            <button type="button" class="btn btn-primary" id="bs-modal-confirm">${confirmText}</button>
                        </div>
                    </div>
                </div>
            </div>`;
  }

  /**
   * @param {string} html
   * @param {'alert'|'confirm'|'prompt'} type
   * @returns {Promise<any>}
   */
  static _show(html, type) {
    return new Promise((resolve) => {
      /** @type {HTMLElement|null} */
      const existing = document.getElementById('bs-custom-modal');
      if (existing) existing.remove();

      document.body.insertAdjacentHTML('beforeend', html);

      /** @type {HTMLElement} */
      const modalElement = document.getElementById('bs-custom-modal');
      /** @type {HTMLElement} */
      const confirmBtn = document.getElementById('bs-modal-confirm');
      /** @type {HTMLInputElement|null} */
      const inputField = document.getElementById('bs-prompt-input');

      // @ts-ignore
      const bsModal = new Modal(modalElement);
      /** @type {boolean} */
      let isConfirmed = false;

      /** @type {Function} */
      const handleConfirm = () => {
        isConfirmed = true;
        let value;
        if (type === 'prompt') value = inputField.value;
        else if (type === 'confirm') value = true;
        else value = undefined;

        bsModal.hide();
        resolve(value);
      };

      confirmBtn.addEventListener('click', handleConfirm);

      // Handle cancel/close
      modalElement.addEventListener('hidden.bs.modal', () => {
        modalElement.remove();
        if (!isConfirmed) {
          if (type === 'prompt') resolve(null);
          else if (type === 'confirm') resolve(false);
          else resolve();
        }
      });

      bsModal.show();
      if (type === 'prompt' && inputField) {
        modalElement.addEventListener('shown.bs.modal', () => inputField.focus());
      }
    });
  }
}

// Global Override
window.alert = (msg) => BootstrapDialogs.alert(msg);
window.confirm = (msg) => BootstrapDialogs.confirm(msg);
window.prompt = (msg, def) => BootstrapDialogs.prompt(msg, def);

export { BootstrapDialogs };

/**
 * @param {string} message
 * @param {ModalOptions} [options]
 * @returns {Promise<void>}
 */
export const alert = (msg) => BootstrapDialogs.alert(msg);

/**
 * @param {string} message
 * @param {string} [defaultValue]
 * @param {ModalOptions} [options]
 * @returns {Promise<string|null>}
 */
export const prompt = (msg, def) => BootstrapDialogs.prompt(msg, def);

/**
 * @param {string} message
 * @param {ModalOptions} [options]
 * @returns {Promise<boolean>}
 */
export const confirm = (msg) => BootstrapDialogs.confirm(msg);
