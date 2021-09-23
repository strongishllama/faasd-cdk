import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';

export interface FaasdProps {
  readonly vpc: ec2.IVpc;
  readonly securityGroup: ec2.ISecurityGroup;
  readonly instanceClass?: ec2.InstanceClass;
  readonly instanceSize?: ec2.InstanceSize;
}

export class Faasd extends cdk.Construct {
  constructor(scope: cdk.Construct, id: string, props: FaasdProps) {
    super(scope, id);

    new ec2.Instance(this, 'instance', {
      vpc: props.vpc,
      securityGroup: props.securityGroup,
      instanceType: ec2.InstanceType.of(props.instanceClass ?? ec2.InstanceClass.T3A, props.instanceSize ?? ec2.InstanceSize.NANO),
      machineImage: ec2.MachineImage.genericLinux({ 'ap-southeast-2': 'ami-0567f647e75c7bc05' })
    });
  }
}
