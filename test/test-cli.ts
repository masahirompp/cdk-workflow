import {runWorkflow} from '../src/index.js';

await runWorkflow({cdkCliOptions: ['--app', 'ts-node-esm -r dotenv/config ./test/test-cdk.ts']});
