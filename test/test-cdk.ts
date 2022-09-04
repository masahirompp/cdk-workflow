/* eslint-disable no-new */
import * as cdk from 'aws-cdk-lib';
import type {Construct} from 'constructs';

class TestStack1 extends cdk.Stack {
  constructor(scope?: Construct, id?: string, props?: cdk.StackProps) {
    super(scope, id, props);
    const bucket = new cdk.aws_s3.Bucket(this, 'TestBucket');
    const sqs = new cdk.aws_sqs.Queue(this, 'TestQueue');

    new cdk.CfnOutput(this, 'BucketArn', {value: bucket.bucketArn});
    new cdk.CfnOutput(this, 'QueueArn', {value: sqs.queueArn});
  }
}

class TestStack2 extends cdk.Stack {
  constructor(scope?: Construct, id?: string, props?: cdk.StackProps) {
    super(scope, id, props);
    const table = new cdk.aws_dynamodb.Table(this, 'TestTable', {
      partitionKey: {name: 'pk', type: cdk.aws_dynamodb.AttributeType.NUMBER,
      }});

    new cdk.CfnOutput(this, 'TableArn', {value: table.tableArn});
  }
}

const app = new cdk.App();
new TestStack1(app, 'TestStack');
new TestStack2(app, 'TestStack2');
