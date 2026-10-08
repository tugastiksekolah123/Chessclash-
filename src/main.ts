import './ui/styles.css';
import { ChessApp } from './ui/app';

document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('app') || document.body;
  new ChessApp(root);

  // Register PWA Service Worker
  if ('serviceWorker' in navigator && (window.location.protocol === 'https:' || window.location.hostname === 'localhost')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js')
        .then((reg) => {
          console.log('chessclash Service Worker registered:', reg.scope);
        })
        .catch((err) => {
          console.warn('Service Worker registration non-fatal notice:', err);
        });
    });
  }
});
