// Rounds' three sections, in the order of the section bar: which screen each
// draws (into the page, or beside it while sliding over: components/spread.js).
import { todayScreen } from './today.js';
import { peopleScreen } from './people.js';
import { promisesScreen } from './promises.js';

const SCREENS = [todayScreen, peopleScreen, promisesScreen];
export const drawSection = (i, el, opts) => SCREENS[i](el, opts);
