import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import 'plyr/css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import 'bootstrap/dist/css/bootstrap.min.css'; // Bootstrap import
import './index.css';
import './tags.css';

import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import './tools/BootstrapDialogs.js';

import App from './App.jsx';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(() => {
      console.log('ServiceWorker registered');
    });
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
