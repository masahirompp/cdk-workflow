/* eslint-disable no-new */
import * as cdk from 'aws-cdk-lib';

class DummyStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    new cdk.aws_s3.Bucket(this, 'DummyBucket');
  }
}

const app = new cdk.App();
new DummyStack(app, 'DummyStack');
app.synth();
