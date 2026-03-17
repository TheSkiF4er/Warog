/** @jsxImportSource @warog/dom */
import { hydrate } from '@warog/dom';
import { App } from './app.js';

hydrate(document.getElementById('app')!, <App />);
