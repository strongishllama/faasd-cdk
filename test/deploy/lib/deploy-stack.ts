import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as faasd from '../../../lib';

export interface DeployStackProps extends cdk.StackProps {
  readonly vpcId: string;
}

export class DeployStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: DeployStackProps) {
    super(scope, id, props);

    new faasd.Instance(this, 'faasd', {
      env: props.env,
      baseDomainName: 'millhouse.dev',
      fullDomainName: 'faasd.millhouse.dev',
      emailAddress: 'taliesinwrmillhouse@gmail.com',
      vpc: ec2.Vpc.fromLookup(this, 'vpc', {
        vpcId: props.vpcId
      })
    });
  }
}
