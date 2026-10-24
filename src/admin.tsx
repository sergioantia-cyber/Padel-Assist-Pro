import { createRoot } from 'react-dom/client';
import { AdminApp } from './admin/AdminApp';
import './index.css';

const container = document.getElementById('admin-root');
if (container) {
  const root = createRoot(container);
  root.render(<AdminApp />);
}
