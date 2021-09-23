import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import { Faasd } from '../../../lib';

export interface DeployStackProps extends cdk.StackProps {
  readonly vpcId: string;
}

export class DeployStack extends cdk.Stack {
  constructor(scope: cdk.Stack, id: string, props: DeployStackProps) {
    super(scope, id, props);

    const vpc = ec2.Vpc.fromLookup(this, 'vpc', {
      vpcId: props.vpcId
    });

    const securityGroup = new ec2.SecurityGroup(this, 'security-group', {
      vpc
    });
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22));
    securityGroup.addIngressRule(ec2.Peer.anyIpv6(), ec2.Port.tcp(22));

    new Faasd(this, 'faasd', {
      vpc: vpc,
      securityGroup: securityGroup
    })
  }
}
