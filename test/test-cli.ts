import {runWorkflow} from '../src/index.js';

const result = await runWorkflow({
  cdkCliOptions: ['--app', 'ts-node-esm -r dotenv/config ./test/test-cdk.ts'],
});

console.log(result);
