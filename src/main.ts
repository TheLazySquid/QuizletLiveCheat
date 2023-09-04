import { version } from '../package.json';
import Cheat from './cheat';
import { QuizletWindow } from './interfaces';

(window as unknown as QuizletWindow).qlc = new Cheat();

console.log(`Quizlet Live Cheat v${version} loaded!`)