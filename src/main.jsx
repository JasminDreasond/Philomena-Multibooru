import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import 'plyr/css';
import 'bootstrap/dist/css/bootstrap.min.css'; // Bootstrap import
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import './index.css';
import './tags.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
