#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { NetworkStack } from '../stacks/network.stack';
import { DatabaseStack } from '../stacks/database.stack';
import { CacheStack } from '../stacks/cache.stack';
import { StorageStack } from '../stacks/storage.stack';
import { ComputeStack } from '../stacks/compute.stack';
import { CDNStack } from '../stacks/cdn.stack';
import { MonitoringStack } from '../stacks/monitoring.stack';

const app = new cdk.App();
const env = app.node.tryGetContext('env') ?? 'staging';

const account = process.env.CDK_DEFAULT_ACCOUNT!;
const region = process.env.CDK_DEFAULT_REGION ?? 'eu-west-2';

const awsEnv = { account, region };
const prefix = `MyCura-${env.charAt(0).toUpperCase() + env.slice(1)}`;

const network = new NetworkStack(app, `${prefix}-Network`, { env: awsEnv, envName: env });
const database = new DatabaseStack(app, `${prefix}-Database`, { env: awsEnv, envName: env, vpc: network.vpc });
const cache = new CacheStack(app, `${prefix}-Cache`, { env: awsEnv, envName: env, vpc: network.vpc });
const storage = new StorageStack(app, `${prefix}-Storage`, { env: awsEnv, envName: env });

const compute = new ComputeStack(app, `${prefix}-Compute`, {
  env: awsEnv,
  envName: env,
  vpc: network.vpc,
  database: database.cluster,
  cache: cache.cluster,
  storageBucket: storage.docsBucket,
});

const cdn = new CDNStack(app, `${prefix}-CDN`, {
  env: awsEnv,
  envName: env,
  apiOrigin: compute.apiService,
});

new MonitoringStack(app, `${prefix}-Monitoring`, {
  env: awsEnv,
  envName: env,
  apiService: compute.apiService,
});

app.synth();
