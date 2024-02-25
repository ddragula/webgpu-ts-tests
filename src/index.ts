import './style.css';
import App from './App';

const canvas = document.getElementById('main-canvas') as HTMLCanvasElement;
const app = new App(canvas);

app.run();
