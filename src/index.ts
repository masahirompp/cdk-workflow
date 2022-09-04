import os from 'node:os';
import {readFile} from 'node:fs/promises';
import inquirer from 'inquirer';
import chalk from 'chalk';
import {execa} from 'execa';
import {file} from 'tmp-promise';

type StackName = string;
type OutputName = string;
type OutputValue = string;
export type StackOutputs = Record<StackName, Record<OutputName, OutputValue>>;

export const runWorkflow = async (options?: {cdkCliOptions?: string[]}) => {
  console.log(chalk.green('aws-cdk workflow start.'));

  const cdkCliOptions = options?.cdkCliOptions ?? [];
  // List
  console.log(chalk.cyan('load stacks...'));
  const cdkList = await execa(
    'cdk',
    ['list', ...cdkCliOptions],
    {stdout: 'pipe', stderr: 'inherit', stdin: 'ignore'},
  );
  const stackNames = cdkList.stdout.split(os.EOL);

  // Diff
  console.log(chalk.cyan('diff stacks...'));
  await execa(
    'cdk',
    ['diff', ...cdkCliOptions],
    {stdout: 'inherit', stderr: 'inherit', stdin: 'ignore'},
  );

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
      {stdout: 'pipe', stderr: 'pipe', stdin: 'inherit'},
    );
    outputs = JSON.parse(
      await readFile(path, {encoding: 'utf8'}),
    ) as StackOutputs;
  } finally {
    await cleanup();
  }

  console.log(chalk.green('aws-cdk workflow end.'));
  return outputs;
};

