# faasd cdk

This project contains CDK constructs to deploy the [faasd](https://github.com/openfaas/faasd) on AWS. Currently, there is only a single construct to deploy faasd to an EC2 instance. Be warned, this construct is very much in its prototyping phase.

## Installation
Install this package with the following command.
```
npm install @strongishllama/faasd-cdk
```

Add the construct to your CDK stack, filling out the properties. Both the account and region property are required.
```ts
new faasd.Instance(this, 'faasd-instance', {
  env: {
    account: '0123456789',
    region: 'ap-southeast-2'
  },
  baseDomainName: 'example.com',
  fullDomainName: 'faasd.example.com',
  emailAddress: 'webmaster@example.com',
  vpc: ec2.Vpc.fromLookup(this, 'vpc', {
    vpcId: 'vpc-123456'
  })
});
```

## Testing
There are two types of tests in this project, CDK tests and deployment tests.

CDK tests test the CloudFormation output by the constructs, these are not yet written and will be once the constructs become more well defined.

Deployment tests import the constructs so they can be manually tested before making a package release. The plan is to automate these in the future.
