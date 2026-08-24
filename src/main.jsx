import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BootstrapDialogs } from 'tiny-essentials/webTemplates/bootstrap/5.3/html/BootstrapDialogs';
import { Modal } from 'bootstrap/dist/js/bootstrap.bundle.min.js';

import '@vidstack/react/player/styles/default/theme.css';
import '@vidstack/react/player/styles/default/layouts/video.css';

import '@fortawesome/fontawesome-free/css/all.min.css';
import 'bootstrap/dist/css/bootstrap.min.css'; // Bootstrap import
import './index.css';
import './tags.css';

import ServiceWorkerSync from './components/utils/ReactRouter';
import App from './App.jsx';

BootstrapDialogs.Modal = Modal;
window.alert = (msg) => BootstrapDialogs.alert(msg);
window.confirm = (msg) => BootstrapDialogs.confirm(msg);
window.prompt = (msg, def) => BootstrapDialogs.prompt(msg, def);

const headerConfig = BootstrapDialogs.headerConfig;
BootstrapDialogs.headerConfig = {
  className: headerConfig.className,
  styles: { ...headerConfig.styles, 'background-color': 'var(--app-navbar-bg, #000) !important' },
};

const titleConfig = BootstrapDialogs.titleConfig;
BootstrapDialogs.titleConfig = {
  className: titleConfig.className,
  styles: { ...titleConfig.styles, color: '#fff' },
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ServiceWorkerSync />
    <App />
  </StrictMode>,
);
