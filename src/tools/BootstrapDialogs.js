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
 * Utility to replace native alert/prompt with Bootstrap 5 modals.
 */
class BootstrapDialogs {
  /**
   * @param {string} message
   * @param {ModalOptions} [options]
   * @returns {Promise<void>}
   */
  static async alert(message, options = {}) {
    const { title = 'Alert', confirmText = 'OK' } = options;

    const html = this._createTemplate(title, message, false, confirmText);
    await this._show(html);
  }

  /**
   * @param {string} message
   * @param {string} [defaultValue]
   * @param {ModalOptions} [options]
   * @returns {Promise<string|null>}
   */
  static async prompt(message, defaultValue = '', options = {}) {
    const { title = 'Prompt', confirmText = 'Submit', cancelText = 'Cancel' } = options;

    // Added mt-2 for spacing between text and input
    const inputHtml = `<input type="text" class="form-control mt-2" id="bs-prompt-input" value="${defaultValue}">`;
    const bodyContent = `${message}${inputHtml}`;

    const html = this._createTemplate(title, bodyContent, true, confirmText, cancelText);

    return await this._show(html, true);
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
    const cancelBtn = showCancel
      ? `<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">${cancelText}</button>`
      : '';

    // The 'style="white-space: pre-wrap;"' ensures \n is respected
    return `
            <div class="modal fade" id="bs-custom-modal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">${title}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
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
   * @param {boolean} isPrompt
   * @returns {Promise<any>}
   */
  static _show(html, isPrompt = false) {
    return new Promise((resolve) => {
      // Remove existing modal if any
      const existing = document.getElementById('bs-custom-modal');
      if (existing) existing.remove();

      document.body.insertAdjacentHTML('beforeend', html);
      const modalElement = document.getElementById('bs-custom-modal');
      const confirmBtn = document.getElementById('bs-modal-confirm');
      const inputField = document.getElementById('bs-prompt-input');

      // @ts-ignore
      const bsModal = new Modal(modalElement);
      let isConfirmed = false;

      const handleConfirm = () => {
        isConfirmed = true;
        const value = isPrompt ? inputField.value : true;
        bsModal.hide();
        resolve(value);
      };

      confirmBtn.addEventListener('click', handleConfirm);

      // Handle cancel/close
      modalElement.addEventListener('hidden.bs.modal', () => {
        modalElement.remove();
        if (!isConfirmed) {
          resolve(isPrompt ? null : undefined);
        }
      });

      bsModal.show();
      if (isPrompt) {
        modalElement.addEventListener('shown.bs.modal', () => inputField.focus());
      }
    });
  }
}

// Global Override
window.alert = (msg) => BootstrapDialogs.alert(msg);
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
