# cdk-workflow

[![npm package][npm-img]][npm-url]
[![Build Status][build-img]][build-url]
[![Downloads][downloads-img]][downloads-url]
[![Issues][issues-img]][issues-url]
[![Commitizen Friendly][commitizen-img]][commitizen-url]
[![Semantic Release][semantic-release-img]][semantic-release-url]

> cdk workflow

## DEMO

TODO

## Install

```bash
npm i cdk-workflow
```

## Setup

```ts
// cli.ts
import { runWorkflow } from "cdk-workflow";

// your pre-process here.
// set context, set environment environments, etc...

await runWorkflow({
  cdkCliOptions: ["--context", "KEY=VALUE"],
});
```

## Usage

```sh
node --loader ts-node/esm cli.ts
```

[build-img]: https://github.com/masahirompp/cdk-workflow/actions/workflows/release.yml/badge.svg
[build-url]: https://github.com/masahirompp/cdk-workflow/actions/workflows/release.yml
[downloads-img]: https://img.shields.io/npm/dt/cdk-workflow
[downloads-url]: https://www.npmtrends.com/cdk-workflow
[npm-img]: https://img.shields.io/npm/v/cdk-workflow
[npm-url]: https://www.npmjs.com/package/cdk-workflow
[issues-img]: https://img.shields.io/github/issues/masahirompp/cdk-workflow
[issues-url]: https://github.com/masahirompp/cdk-workflow/issues
[codecov-img]: https://codecov.io/gh/masahirompp/cdk-workflow/branch/main/graph/badge.svg
[codecov-url]: https://codecov.io/gh/masahirompp/cdk-workflow
[semantic-release-img]: https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg
[semantic-release-url]: https://github.com/semantic-release/semantic-release
[commitizen-img]: https://img.shields.io/badge/commitizen-friendly-brightgreen.svg
[commitizen-url]: http://commitizen.github.io/cz-cli/
