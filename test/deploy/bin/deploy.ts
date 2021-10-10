#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import * as dotenv from 'dotenv';
import { DeployStack } from '../lib/deploy-stack';

dotenv.config();

const app = new cdk.App();

new DeployStack(app, 'faasd-test-deploy-stack', {
  env: {
    account: checkEnv('AWS_ACCOUNT'),
    region: checkEnv('AWS_REGION')
  },
  baseDomainName: checkEnv('BASE_DOMAIN_NAME'),
  fullDomainName: checkEnv('FULL_DOMAIN_NAME'),
  emailAddress: checkEnv('EMAIL_ADDRESS'),
  vpcId: checkEnv('VPC_ID')
});

function checkEnv(key: string): string {
  const value = process.env[key];

  if (value === undefined || value === '') {
    throw new Error(`Error: environment variable for key: ${key} is required`);
  }

  return value;
}
