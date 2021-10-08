#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { DeployStack } from '../lib/deploy-stack';

const app = new cdk.App();

new DeployStack(app, 'faasd-test-deploy-stack', {
  env: {
    account: '320045747480',
    region: 'ap-southeast-2'
  },
  vpcId: 'vpc-1e217c79'
});
