/// <reference types="vite/client" />

import TinyServiceWorker from 'tiny-essentials/libs/router/TinyServiceWorker';
import {
  alert,
  confirm,
  prompt,
} from 'tiny-essentials/webTemplates/bootstrap/5.3/html/BootstrapDialogs';

declare global {
  interface Window {
    swManager: TinyServiceWorker;
    alert: alert;
    confirm: confirm;
    prompt: prompt;
  }
}
