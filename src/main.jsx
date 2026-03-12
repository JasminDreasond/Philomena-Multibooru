import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@vidstack/react/player/styles/default/theme.css';
import '@vidstack/react/player/styles/default/layouts/video.css';

import '@fortawesome/fontawesome-free/css/all.min.css';
import 'bootstrap/dist/css/bootstrap.min.css'; // Bootstrap import
import './index.css';
import './tags.css';

import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import './tools/BootstrapDialogs.js';

import ServiceWorkerSync from './components/utils/ReactRounter';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ServiceWorkerSync />
    <App />
  </StrictMode>,
);
