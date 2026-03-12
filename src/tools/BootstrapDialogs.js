import { Modal } from 'bootstrap/dist/js/bootstrap.bundle.min.js';

/**
 * @typedef {Object} ModalOptions
 * @property {string} [title]
 * @property {string} [confirmText]
 * @property {string} [cancelText]
 * @property {string} [defaultValue]
 */

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
  /** @type {Modal|null} */
  static _activeInstance = null;
  /** @type {Function|null} */
  static _activeResolve = null;
  /** @type {'alert'|'confirm'|'prompt'|null} */
  static _activeType = null;

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
                        <div class="modal-header" style="background-color: var(--app-navbar-bg, #000);">
                            <h5 class="modal-title" style="color: #fff;">${title}</h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
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
   * Clean up any existing modal and resolve its promise.
   */
  static _cleanup() {
    if (this._activeResolve) {
      /** @type {any} */
      let cancelValue;
      if (this._activeType === 'prompt') cancelValue = null;
      else if (this._activeType === 'confirm') cancelValue = false;

      this._activeResolve(cancelValue);
      this._activeResolve = null;
    }

    if (this._activeInstance) {
      this._activeInstance.dispose();
      this._activeInstance = null;
    }

    /** @type {HTMLElement|null} */
    const element = document.getElementById('bs-custom-modal');
    if (element) element.remove();

    /** @type {HTMLElement|null} */
    const backdrop = document.querySelector('.modal-backdrop');
    if (backdrop) backdrop.remove();

    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
  }

  /**
   * @param {string} html
   * @param {'alert'|'confirm'|'prompt'} type
   * @returns {Promise<any>}
   */
  static _show(html, type) {
    this._cleanup();

    return new Promise((resolve) => {
      this._activeResolve = resolve;
      this._activeType = type;

      document.body.insertAdjacentHTML('beforeend', html);

      /** @type {HTMLElement} */
      const modalElement = document.getElementById('bs-custom-modal');
      /** @type {HTMLElement} */
      const confirmBtn = document.getElementById('bs-modal-confirm');
      /** @type {HTMLInputElement|null} */
      const inputField = document.getElementById('bs-prompt-input');

      this._activeInstance = new Modal(modalElement);
      /** @type {boolean} */
      let isConfirmed = false;

      /** @type {Function} */
      const handleConfirm = () => {
        isConfirmed = true;
        /** @type {any} */
        let value;
        if (type === 'prompt') value = inputField.value;
        else if (type === 'confirm') value = true;

        this._activeInstance.hide();
        resolve(value);
      };

      confirmBtn.addEventListener('click', handleConfirm);

      // Handle cancel/close
      modalElement.addEventListener('hidden.bs.modal', () => {
        if (this._activeResolve === resolve) {
          if (!isConfirmed) {
            /** @type {any} */
            let value;
            if (type === 'prompt') value = null;
            else if (type === 'confirm') value = false;
            resolve(value);
          }
          this._activeResolve = null;
          this._activeInstance = null;
        }
        modalElement.remove();
      });

      this._activeInstance.show();
      if (type === 'prompt' && inputField) {
        modalElement.addEventListener('shown.bs.modal', () => {
          inputField.focus();
          inputField.select();
        });
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
 * @param {string} msg
 * @returns {Promise<void>}
 */
export const alert = (msg) => BootstrapDialogs.alert(msg);

/**
 * @param {string} msg
 * @param {string} [def]
 * @returns {Promise<string|null>}
 */
export const prompt = (msg, def) => BootstrapDialogs.prompt(msg, def);

/**
 * @param {string} msg
 * @returns {Promise<boolean>}
 */
export const confirm = (msg) => BootstrapDialogs.confirm(msg);
