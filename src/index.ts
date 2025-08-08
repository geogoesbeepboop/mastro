import {config} from 'dotenv';
import {resolve} from 'path';

// Load environment variables from .env file
config({path: resolve(process.cwd(), '.env')});

export {run} from '@oclif/core'