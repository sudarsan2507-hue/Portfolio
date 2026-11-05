import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import ShortApp from './ShortApp';
import './short.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ShortApp />
  </StrictMode>,
);
