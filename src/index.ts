import os from 'node:os';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';
import inquirer from 'inquirer';
import chalk from 'chalk';
import {execa} from 'execa';
import {file} from 'tmp-promise';
import stripAnsi from 'strip-ansi';

type StackName = string;
type OutputName = string;
type OutputValue = string;
export type StackOutputs = Record<StackName, Record<OutputName, OutputValue>>;
type StackDiff = {
  stackName: string;
  differences: boolean;
  replacement: boolean;
};

type WorkflowStep =
| 'diff -> deploy'
| 'diff'
| 'deploy'
| 'deploy --all --require-approval never'
| 'ls(list)'
| 'synth'
// | 'DESTROY'
| 'doctor'
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
  const subProcess = execa(
    'cdk',
    ['diff', ...cdkCliOptions],
    {
      stdout: 'inherit',
      /**
       * Point1. AWS CDKのdiffの結果は、stdoutではなくstderrとして出力される
       * Point2. stderrをstreamに渡すには、stderrに直接streamを設定することはできない。以下のissue参照。
       * https://github.com/sindresorhus/execa/issues/81
       */
      stderr: 'pipe',
      stdin: 'ignore',
    },
  );

  /**
   * Diff結果をstderrに出力しつつ、メモリ上でも取得する。
   */
  subProcess.stderr?.pipe(process.stderr);
  const {stderr: diffResultText} = await subProcess;
  /** Ex.
Stack TestStack
There were no differences
Stack TestStack2
There were no differences
   */
  const diffList = stripAnsi(diffResultText) // ターミナル向け色指定のエスケープを排除
    .split(/^Stack /gm)
    .map(text => {
      const lines = text.split(os.EOL);
      return {
        stackName: lines[0],
        differences: !lines.includes('There were no differences'),
        replacement: lines.some(line => line.includes('requires replacement')),
      };
    })
    .filter((r): r is StackDiff => Boolean(r.stackName));

  // リソースの置き換えが発生する場合、警告を表示する
  const replacements = diffList
    .filter(d => d.replacement)
    .map(d => d.stackName);
  if (replacements.length > 0) {
    console.log(chalk.bgRedBright.bold(
      `Caution: Resource replacement occurs in ${replacements.join(', ')}.`,
    ));
  }

  return diffList;
};

const runCdkDeploy = async (
  stackNames: string[],
  cdkCliOptions: string[],
  diffList: StackDiff[] = [],
) => {
  // Select deploy stacks
  const {targetStacks} = await inquirer.prompt<{targetStacks: string[]}>({
    type: 'checkbox',
    loop: false,
    name: 'targetStacks',
    message: 'please select deploy stacks:',
    choices: stackNames,
    default: diffList.filter(d => d.differences).map(d => d.stackName),
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

const runDoctor = async (cdkCliOptions: string[]) => {
  await execa(
    'cdk',
    ['doctor', ...cdkCliOptions],
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
    loop: false,
    name: 'workflow',
    message: 'please select the task you want to run:',
    choices: [
      'diff -> deploy',
      'diff',
      'deploy',
      'deploy --all --require-approval never',
      'ls(list)',
      'synth',
      'doctor',
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
      const diffList = await runCdkDiff(cdkCliOptions);
      _outputs = await runCdkDeploy(stackNames, cdkCliOptions, diffList);
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

    case 'doctor': {
      await runDoctor(cdkCliOptions);
      break;
    }

    // No default
  }

  console.log(chalk.green('aws-cdk workflow end.'));
  return _outputs;
};

