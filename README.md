# faasd CDK

![NPN version](https://img.shields.io/npm/v/@strongishllama/faasd-cdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://raw.githubusercontent.com/strongishllama/faasd-cdk/main/LICENSE)
![GitHub Workflow Status](https://img.shields.io/github/workflow/status/strongishllama/faasd-cdk/Release)

This project contains CDK constructs to deploy the [faasd](https://github.com/openfaas/faasd) on AWS. Currently, there is only a single construct to deploy faasd to an EC2 instance. Be warned, this construct is very much in its prototyping phase.

## Installation
Install this package with the following command.
```
npm install @strongishllama/faasd-cdk
```

Add the construct to your CDK stack, filling out the properties.
```ts
new faasd.Instance(this, 'faasd-instance', {
  account: '0123456789',
  region: 'ap-southeast-2',
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

CDK tests test the CloudFormation output by the constructs, these can be run with the following command.
```
npm run test
```

Deployment tests import the constructs so they can be manually tested before making a package release. The plan is to automate these in the future.
