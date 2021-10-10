import * as assert from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as faasd from '../../lib/index';

test('Instance', () => {
  const app = new cdk.App();
  const env = {
    account: '0123456789',
    region: 'ap-southeast-2'
  }
  const stack = new cdk.Stack(app, 'test-stack', {
    env: env
  });

  // WHEN
  const props: faasd.InstanceProps = {
    account: env.account,
    region: env.region,
    baseDomainName: 'example.com',
    fullDomainName: 'faasd.example.com',
    emailAddress: 'webmaster@example.com',
    vpc: ec2.Vpc.fromLookup(stack, 'vpc', {
      vpcId: 'vpc-123456'
    })
  };
  new faasd.Instance(stack, 'instance', props);

  // THEN
  // Security group.
  assert.expect(stack).to(assert.countResourcesLike('AWS::EC2::SecurityGroup', 1, {
    'SecurityGroupEgress': [
      {
        'CidrIp': '0.0.0.0/0',
        'IpProtocol': '-1'
      }
    ],
    'SecurityGroupIngress': [
      {
        'CidrIp': '0.0.0.0/0',
        'FromPort': 80,
        'IpProtocol': 'tcp',
        'ToPort': 80
      },
      {
        'CidrIpv6': '::/0',
        'FromPort': 80,
        'IpProtocol': 'tcp',
        'ToPort': 80
      },
      {
        'CidrIp': '0.0.0.0/0',
        'FromPort': 443,
        'IpProtocol': 'tcp',
        'ToPort': 443
      },
      {
        'CidrIpv6': '::/0',
        'FromPort': 443,
        'IpProtocol': 'tcp',
        'ToPort': 443
      }
    ],
    'VpcId': props.vpc.vpcId
  }));
  // Role.
  assert.expect(stack).to(assert.countResourcesLike('AWS::IAM::Role', 1, {
    'AssumeRolePolicyDocument': {
      'Statement': [
        {
          'Action': 'sts:AssumeRole',
          'Effect': 'Allow',
          'Principal': {
            'Service': 'ec2.amazonaws.com'
          }
        }
      ]
    },
    'ManagedPolicyArns': [
      'arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore'
    ]
  }));
  // Policy.
  assert.expect(stack).to(assert.countResourcesLike('AWS::IAM::Policy', 1, {
    'PolicyDocument': {
      'Statement': [
        {
          'Action': [
            'secretsmanager:GetSecretValue',
            'secretsmanager:DescribeSecret'
          ],
          'Effect': 'Allow',
          'Resource': {
            'Ref': assert.anything()
          }
        }
      ],
      'Version': '2012-10-17'
    },
    'Roles': [
      {
        'Ref': assert.anything()
      }
    ]
  }));
  // Instance.
  assert.expect(stack).to(assert.countResourcesLike('AWS::EC2::Instance', 1, {
    'ImageId': 'ami-0567f647e75c7bc05',
    'InstanceType': `${props.instanceClass ?? 't3a'}.${props.instanceSize ?? 'micro'}`,
    'SecurityGroupIds': [
      {
        'Fn::GetAtt': [
          assert.anything(),
          'GroupId'
        ]
      }
    ],
  }));
  // Elastic IP.
  assert.expect(stack).to(assert.countResources('AWS::EC2::EIP', 1));
  assert.expect(stack).to(assert.countResources('AWS::EC2::EIPAssociation', 1));
  // Record set.
  assert.expect(stack).to(assert.countResourcesLike('AWS::Route53::RecordSet', 1, {
    'Name': `${props.fullDomainName ?? props.baseDomainName}.`,
    'Type': 'A',
    'HostedZoneId': assert.anything(),
    'ResourceRecords': [
      {
        'Ref': assert.anything()
      }
    ],
    'TTL': '1800'
  }));
  assert.expect(stack).to(assert.countResources('AWS::EC2::EIPAssociation', 1));
  // Record set.
  assert.expect(stack).to(assert.countResourcesLike('AWS::Route53::RecordSet', 1, {
    'Name': `${props.fullDomainName ?? props.baseDomainName}.`,
    'Type': 'A',
    'HostedZoneId': assert.anything(),
    'ResourceRecords': [
      {
        'Ref': assert.anything()
      }
    ],
    'TTL': '1800'
  }));
  // Secret.
  assert.expect(stack).to(assert.countResourcesLike('AWS::SecretsManager::Secret', 1, {
    'GenerateSecretString': {}
  }));
});
