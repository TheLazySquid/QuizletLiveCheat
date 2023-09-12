import { version } from '../package.json';
import Cheat from './cheat';
import type { QuizletWindow } from './interfaces';
// @ts-ignore
import hud from '../hud/hud.svelte';

(window as unknown as QuizletWindow).qlc = new Cheat();

console.log(`Quizlet Live Cheat v${version} loaded!`)

window.addEventListener('load', () => {
    new hud({
        target: document.body
    });
});