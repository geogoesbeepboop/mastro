import {config} from 'dotenv';
import {resolve} from 'path';

// Load environment variables from .env file
config({path: resolve(process.cwd(), '.env'), quiet: true});

export {run} from '@oclif/core'