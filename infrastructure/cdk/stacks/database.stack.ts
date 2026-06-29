import * as cdk from 'aws-cdk-lib';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

interface DatabaseStackProps extends cdk.StackProps {
  envName: string;
  vpc: ec2.Vpc;
}

export class DatabaseStack extends cdk.Stack {
  public readonly cluster: rds.DatabaseCluster;
  public readonly secret: secretsmanager.ISecret;

  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);

    const dbSecurityGroup = new ec2.SecurityGroup(this, 'DBSecurityGroup', {
      vpc: props.vpc,
      description: 'My-Cura PostgreSQL security group',
      allowAllOutbound: false,
    });

    // Allow inbound from ECS tasks only (added by ComputeStack)
    this.exportValue(dbSecurityGroup.securityGroupId, { name: 'DBSecurityGroupId' });

    this.cluster = new rds.DatabaseCluster(this, 'AuroraCluster', {
      clusterIdentifier: `mycura-${props.envName}`,
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_15_4,
      }),
      credentials: rds.Credentials.fromGeneratedSecret('mycura_admin', {
        secretName: `mycura/${props.envName}/db-credentials`,
      }),
      serverlessV2MinCapacity: 0.5,
      serverlessV2MaxCapacity: props.envName === 'production' ? 64 : 8,
      writer: rds.ClusterInstance.serverlessV2('writer'),
      readers: props.envName === 'production'
        ? [rds.ClusterInstance.serverlessV2('reader1', { scaleWithWriter: true })]
        : [],
      vpc: props.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [dbSecurityGroup],
      defaultDatabaseName: 'mycura',
      storageEncrypted: true,
      backup: {
        retention: props.envName === 'production' ? cdk.Duration.days(35) : cdk.Duration.days(7),
        preferredWindow: '03:00-04:00',
      },
      deletionProtection: props.envName === 'production',
      removalPolicy: props.envName === 'production' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      enableDataApi: true,
    });

    this.secret = this.cluster.secret!;

    new cdk.CfnOutput(this, 'ClusterEndpoint', {
      value: this.cluster.clusterEndpoint.hostname,
    });
  }
}
