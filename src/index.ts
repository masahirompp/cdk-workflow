import os from 'node:os';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import inquirer from 'inquirer';
import chalk from 'chalk';
import {execa} from 'execa';
import {file} from 'tmp-promise';

type StackName = string;
type OutputName = string;
type OutputValue = string;
export type StackOutputs = Record<StackName, Record<OutputName, OutputValue>>;

type WorkflowStep =
| 'diff -> deploy'
| 'diff'
| 'deploy'
| 'deploy --all --require-approval never'
| 'ls(list)'
| 'synth'
// | 'DESTROY'
| 'bootstrap';

const runCdkList = async (stdoutInherit: boolean, cdkCliOptions: string[]) => {
  const cdkList = await execa(
    'cdk',
    ['list', ...cdkCliOptions],
    {
      stdout: stdoutInherit ? 'inherit' : 'pipe',
      stderr: 'inherit',
      stdin: 'ignore',
    },
  );
  const stackNames = cdkList.stdout?.split(os.EOL);
  return stackNames;
};

const runCdkDiff = async (cdkCliOptions: string[]) => {
  await execa(
    'cdk',
    ['diff', ...cdkCliOptions],
    {stdout: 'inherit', stderr: 'inherit', stdin: 'ignore'},
  );
};

const runCdkDeploy = async (stackNames: string[], cdkCliOptions: string[]) => {
  // Select deploy stacks
  const {targetStacks} = await inquirer.prompt<{targetStacks: string[]}>({
    type: 'checkbox',
    name: 'targetStacks',
    message: 'please select deploy stacks:',
    choices: stackNames,
    validate(input: string[]) {
      if (input.length === 0) {
        return 'stack is not selected.';
      }

      return true;
    },
  });

  // Deploy
  console.log(chalk.cyan('deploy stacks...'));
  let outputs: StackOutputs = {};
  const {path, cleanup} = await file({postfix: '.json'});
  try {
    await execa(
      'cdk',
      ['deploy', ...cdkCliOptions, '--outputs-file', path, ...targetStacks],
      {stdout: 'inherit', stderr: 'inherit', stdin: 'inherit'},
    );
    outputs = JSON.parse(
      await readFile(path, {encoding: 'utf8'}),
    ) as StackOutputs;
  } finally {
    await cleanup();
  }

  return outputs;
};

const runCdkDeployAllRequireApprovalNever = async (cdkCliOptions: string[]) => {
  let outputs: StackOutputs = {};
  const {path, cleanup} = await file({postfix: '.json'});
  try {
    await execa(
      'cdk',
      [
        'deploy',
        ...cdkCliOptions,
        '--outputs-file',
        path,
        '--all',
        '--require-approval',
        'never',
      ],
      {stdout: 'inherit', stderr: 'inherit', stdin: 'inherit'},
    );
    outputs = JSON.parse(
      await readFile(path, {encoding: 'utf8'}),
    ) as StackOutputs;
  } finally {
    await cleanup();
  }

  return outputs;
};

const runCdkBootstrap = async (cdkCliOptions: string[]) => {
  const dummyStackFile = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    'dummy-stack.js',
  );
  await execa(
    'cdk',
    ['bootstrap', ...cdkCliOptions, '--app', dummyStackFile],
    {stdout: 'inherit', stderr: 'inherit', stdin: 'inherit'},
  );
};

const runCdkSynth = async (cdkCliOptions: string[]) => {
  await execa(
    'cdk',
    ['synth', ...cdkCliOptions],
    {stdout: 'inherit', stderr: 'inherit', stdin: 'inherit'},
  );
};

export const runWorkflow = async (options?: {cdkCliOptions?: string[]}) => {
  console.log(chalk.green('aws-cdk workflow start.'));

  const {workflow} = await inquirer.prompt<{workflow: WorkflowStep}>({
    type: 'list',
    name: 'workflow',
    message: 'please select deploy stacks:',
    choices: [
      'diff -> deploy',
      'diff',
      'deploy',
      'deploy --all --require-approval never',
      'ls(list)',
      'synth',
      'bootstrap',
    ],
  });

  const cdkCliOptions = options?.cdkCliOptions ?? [];
  let _outputs: StackOutputs | undefined;
  switch (workflow) {
    case 'diff -> deploy': {
      console.log(chalk.cyan('load stacks...'));
      const stackNames = await runCdkList(false, cdkCliOptions);
      console.log(chalk.cyan('diff stacks...'));
      await runCdkDiff(cdkCliOptions);
      _outputs = await runCdkDeploy(stackNames, cdkCliOptions);
      break;
    }

    case 'diff': {
      await runCdkDiff(cdkCliOptions);
      break;
    }

    case 'deploy': {
      console.log(chalk.cyan('load stacks...'));
      const stackNames = await runCdkList(false, cdkCliOptions);
      _outputs = await runCdkDeploy(stackNames, cdkCliOptions);
      break;
    }

    case 'deploy --all --require-approval never': {
      _outputs = await runCdkDeployAllRequireApprovalNever(cdkCliOptions);
      break;
    }

    case 'ls(list)': {
      await runCdkList(true, cdkCliOptions);
      break;
    }

    case 'synth': {
      await runCdkSynth(cdkCliOptions);
      break;
    }

    case 'bootstrap': {
      await runCdkBootstrap(cdkCliOptions);
      break;
    }

    // No default
  }

  console.log(chalk.green('aws-cdk workflow end.'));
  return _outputs;
};

