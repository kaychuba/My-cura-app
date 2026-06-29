import * as cdk from 'aws-cdk-lib';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

interface CacheStackProps extends cdk.StackProps {
  envName: string;
  vpc: ec2.Vpc;
}

export class CacheStack extends cdk.Stack {
  public readonly cluster: elasticache.CfnReplicationGroup;
  public readonly primaryEndpoint: string;

  constructor(scope: Construct, id: string, props: CacheStackProps) {
    super(scope, id, props);

    const securityGroup = new ec2.SecurityGroup(this, 'RedisSecurityGroup', {
      vpc: props.vpc,
      description: 'My-Cura Redis security group',
    });

    const isolatedSubnets = props.vpc.selectSubnets({
      subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
    });

    const subnetGroup = new elasticache.CfnSubnetGroup(this, 'RedisSubnetGroup', {
      description: 'My-Cura Redis subnet group',
      subnetIds: isolatedSubnets.subnetIds,
      cacheSubnetGroupName: `mycura-${props.envName}-redis`,
    });

    this.cluster = new elasticache.CfnReplicationGroup(this, 'RedisCluster', {
      replicationGroupDescription: `My-Cura ${props.envName} Redis cluster`,
      replicationGroupId: `mycura-${props.envName}`,
      cacheNodeType: props.envName === 'production' ? 'cache.r7g.large' : 'cache.t4g.small',
      engine: 'redis',
      engineVersion: '7.1',
      numCacheClusters: props.envName === 'production' ? 2 : 1,
      automaticFailoverEnabled: props.envName === 'production',
      atRestEncryptionEnabled: true,
      transitEncryptionEnabled: true,
      cacheSubnetGroupName: subnetGroup.ref,
      securityGroupIds: [securityGroup.securityGroupId],
    });

    this.primaryEndpoint = `${this.cluster.attrPrimaryEndPointAddress}:${this.cluster.attrPrimaryEndPointPort}`;

    new cdk.CfnOutput(this, 'RedisEndpoint', { value: this.primaryEndpoint });
  }
}
