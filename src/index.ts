import os from 'node:os';
import inquirer from 'inquirer';
import chalk from 'chalk';
import {execa} from 'execa';

export const runWorkflow = async (options?: {cdkCliOptions?: string[]}) => {
  console.log(chalk.green('aws-cdk workflow start.'));

  const cdkCliOptions = options?.cdkCliOptions ?? [];
  // List
  console.log(chalk.blue('load stacks...'));
  const cdkList = await execa('cdk', ['list', ...cdkCliOptions], {stdout: 'pipe', stderr: 'inherit', stdin: 'ignore'});
  const stackNames = cdkList.stdout.split(os.EOL);

  // Diff
  console.log(chalk.blue('diff stacks...'));
  await execa('cdk', ['diff', ...cdkCliOptions], {stdout: 'inherit', stderr: 'inherit', stdin: 'ignore'});

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
  console.log(chalk.blue('deploy stacks...'));
  await execa('cdk', ['deploy', ...cdkCliOptions, ...targetStacks], {stdout: 'inherit', stderr: 'inherit', stdin: 'inherit'});

  console.log(chalk.green('aws-cdk workflow end.'));
};
