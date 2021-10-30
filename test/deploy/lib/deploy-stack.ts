import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as faasd from '../../../lib';

export interface DeployStackProps extends cdk.StackProps {
  readonly baseDomainName: string;
  readonly fullDomainName?: string;
  readonly emailAddress: string;
  readonly vpcId: string;
}

export class DeployStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: DeployStackProps) {
    super(scope, id, props);

    if (props.env === undefined || props.env.account === undefined || props.env.region === undefined) {
      throw new Error('DeployStackProps.env property must be fully defined');
    }

    new faasd.Instance(this, 'faasd', {
      region: props.env.region,
      baseDomainName: props.baseDomainName,
      fullDomainName: props.fullDomainName,
      emailAddress: props.emailAddress,
      vpc: new ec2.Vpc(this, 'vpc', {
        cidr: '10.0.0.0/16',
        subnetConfiguration: [
          {
            cidrMask: 24,
            name: 'ingress',
            subnetType: ec2.SubnetType.PUBLIC
          }
        ]
      }),
      amiId: 'ami-0567f647e75c7bc05'
    });
  }
}
