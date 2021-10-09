import * as fs from 'fs';
import * as path from 'path';
import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as iam from '@aws-cdk/aws-iam';
import * as route53 from '@aws-cdk/aws-route53';
import * as secretsmanager from '@aws-cdk/aws-secretsmanager';
import * as handlebars from 'handlebars';

export interface InstanceProps extends cdk.StackProps {
  /**
   * The base domain to use. This domain must have a hosted zone in Route53.
   */
  readonly baseDomainName: string;
  /**
   * The full domain name to use. If left undefined the base domain name
   * will be used.
   *
   * @default baseDomainName
   */
  readonly fullDomainName?: string;
  /**
   * The email to register with LetsEncrypt.
   */
  readonly emailAddress: string;
  /**
   * The VPC for the instance to be deploy into.
   */
  readonly vpc: ec2.IVpc;
  /**
   * The class of the EC2 instance being deployed.
   *
   * @default ec2.InstanceClass.T3A
   */
  readonly instanceClass?: ec2.InstanceClass;
  /**
   * The size of the EC2 instance being deployed.
   *
   * @default ec2.InstanceSize.NANO
   */
  readonly instanceSize?: ec2.InstanceSize;
}

export class Instance extends cdk.Construct {
  constructor(scope: cdk.Construct, id: string, props: InstanceProps) {
    super(scope, id);

    // Check that the correct props have been set.
    if (props.env === undefined || props.env.account === undefined || props.env.region === undefined) {
      throw new Error('FaasdProps.env property must be fully defined');
    }

    // Create the security group.
    const securityGroup = new ec2.SecurityGroup(this, 'security-group', {
      vpc: props.vpc
    });
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80));
    securityGroup.addIngressRule(ec2.Peer.anyIpv6(), ec2.Port.tcp(80));
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443));
    securityGroup.addIngressRule(ec2.Peer.anyIpv6(), ec2.Port.tcp(443));

    // Create the instance.
    const instance = new ec2.Instance(this, 'instance', {
      vpc: props.vpc,
      securityGroup: securityGroup,
      instanceType: ec2.InstanceType.of(props.instanceClass ?? ec2.InstanceClass.T3A, props.instanceSize ?? ec2.InstanceSize.NANO),
      machineImage: ec2.MachineImage.genericLinux({ 'ap-southeast-2': 'ami-0567f647e75c7bc05' }),
      role: new iam.Role(this, 'role', {
        assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
        managedPolicies: [
          iam.ManagedPolicy.fromManagedPolicyArn(this, 'ssm-policy', 'arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore')
        ]
      })
    });

    // Create an elastic IP and associate it with the instance.
    const eip = new ec2.CfnEIP(this, 'eip');
    new ec2.CfnEIPAssociation(this, 'eip-association', {
      eip: eip.ref,
      instanceId: instance.instanceId
    });

    // Fetch the hosted zone.
    const hostedZone = route53.HostedZone.fromLookup(this, 'hosted-zone', {
      domainName: props.baseDomainName
    });

    // Create an A record for the full domain name.
    new route53.ARecord(this, 'a-record', {
      zone: hostedZone,
      recordName: props.fullDomainName,
      target: route53.RecordTarget.fromIpAddresses(eip.ref)
    });

    // Create the generated password and give the instance permission to read it.
    const passwordSecret = new secretsmanager.Secret(this, 'secret', {
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });
    passwordSecret.grantRead(instance);
    new cdk.CfnOutput(this, 'password-secret-name', {
      value: `https://${props.env.region}.console.aws.amazon.com/secretsmanager/home?region=${props.env.region}#!/secret?name=${passwordSecret.secretName}`,
      exportName: 'password-secret'
    });

    // Add the instance user data.
    instance.addUserData(...[
      '#!/bin/bash',
      // Piping logs.
      'exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1',
      // Installing updates.
      'apt update',
      'apt upgrade -y',
      'apt autoclean',
      'apt autoremove -y',
      // Installing dependencies.
      'apt install runc bridge-utils make unzip debian-keyring debian-archive-keyring apt-transport-https -y',
      // Installing the AWS CLI.
      'curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "aws-cli-v2.zip"',
      'unzip aws-cli-v2.zip',
      './aws/install',
      'rm aws-cli-v2.zip',
      'rm -rf aws',
      // Installing Containerd.
      'sudo apt install containerd -y',
    //   'curl -sLSf https://github.com/containerd/containerd/releases/download/v1.5.4/containerd-1.5.4-linux-amd64.tar.gz > /tmp/containerd.tar.gz && tar -xvf /tmp/containerd.tar.gz -C /usr/local/bin/ --strip-components=1',
    //   'curl -SLfs https://raw.githubusercontent.com/containerd/containerd/v1.5.4/containerd.service | tee /etc/systemd/system/containerd.service',
    //   'systemctl daemon-reload && systemctl start containerd',
      '/sbin/sysctl -w net.ipv4.conf.all.forwarding=1',
      // Installing CNI.
      'mkdir -p /opt/cni/bin',
      'curl -sSL https://github.com/containernetworking/plugins/releases/download/v0.8.5/cni-plugins-linux-amd64-v0.8.5.tgz | tar -xz -C /opt/cni/bin',
      // Installing OpenFaas.
      'mkdir -p /go/src/github.com/openfaas',
      'mkdir -p /var/lib/faasd/secrets',
      `echo $(aws secretsmanager get-secret-value --secret-id ${passwordSecret.secretName} --query SecretString --output text) > /var/lib/faasd/secrets/basic-auth-password`,
      'echo admin > /var/lib/faasd/secrets/basic-auth-user',
      // Installing Faasd.
      'cd /go/src/github.com/openfaas',
      'git clone --depth 1 --branch 0.13.0 https://github.com/openfaas/faasd',
      'curl -fSLs "https://github.com/openfaas/faasd/releases/download/0.13.0/faasd" --output "/usr/local/bin/faasd"',
      'chmod a+x "/usr/local/bin/faasd"',
      'cd /go/src/github.com/openfaas/faasd',
      '/usr/local/bin/faasd install',
      // Checking status'
    //   'systemctl status -l containerd --no-pager',
    //   'journalctl -u faasd-provider --no-pager',
    //   'systemctl status -l faasd-provider --no-pager',
    //   'systemctl status -l faasd --no-pager',
      // Installing OpenFaas CLI.
    //   'curl -sSLf https://cli.openfaas.com | sh',
    //   'sleep 5 && journalctl -u faasd --no-pager',
      // Installing Caddy.
      'mkdir -p /etc/caddy',
      `curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo tee /etc/apt/trusted.gpg.d/caddy-stable.asc`,
      `curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list`,
      'apt update',
      'apt install caddy -y',
      `echo "${handlebars.compile(fs.readFileSync(path.join(__dirname, 'assets/Caddyfile')).toString())(props)}" > /etc/caddy/Caddyfile`,
      'cd /etc/caddy',
      'caddy reload'
    //   // 'wget https://github.com/caddyserver/caddy/releases/download/v2.1.1/caddy_2.1.1_linux_amd64.tar.gz -O /tmp/caddy.tar.gz && tar -zxvf /tmp/caddy.tar.gz -C /usr/bin/ caddy',
    //   // 'wget https://raw.githubusercontent.com/caddyserver/dist/master/init/caddy.service -O /etc/systemd/system/caddy.service',
    //   // 'systemctl daemon-reload',
    //   // 'systemctl enable caddy',
    //   // 'systemctl start caddy'
    ]);
  }
}
