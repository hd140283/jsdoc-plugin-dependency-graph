import path from 'node:path';
import missing from 'missingpackage';
import { local } from './local.js';

export const main = () => path.join(local, String(missing));
