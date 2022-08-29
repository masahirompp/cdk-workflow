/* eslint-disable no-new */
import * as cdk from 'aws-cdk-lib';
import type {Construct} from 'constructs';

class TestStack extends cdk.Stack {
  constructor(scope?: Construct, id?: string, props?: cdk.StackProps) {
    super(scope, id, props);
    new cdk.aws_s3.Bucket(this, 'TestBucket');
  }
}

const app = new cdk.App();
new TestStack(app, 'TestStack');

// App.synth();
