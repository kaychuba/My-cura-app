import * as cdk from 'aws-cdk-lib';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

interface ComputeStackProps extends cdk.StackProps {
  envName: string;
  vpc: ec2.Vpc;
  database: rds.DatabaseCluster;
  cache: elasticache.CfnReplicationGroup;
  storageBucket: s3.Bucket;
}

export class ComputeStack extends cdk.Stack {
  public readonly apiService: ecs.FargateService;
  public readonly alb: elbv2.ApplicationLoadBalancer;

  constructor(scope: Construct, id: string, props: ComputeStackProps) {
    super(scope, id, props);

    // ECR Repository
    const ecrRepo = new ecr.Repository(this, 'ApiRepository', {
      repositoryName: `mycura-api-${props.envName}`,
      lifecycleRules: [{ maxImageCount: 10 }],
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // ECS Cluster
    const cluster = new ecs.Cluster(this, 'Cluster', {
      clusterName: `mycura-${props.envName}`,
      vpc: props.vpc,
      containerInsights: true,
    });

    // Task execution role
    const executionRole = new iam.Role(this, 'TaskExecutionRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy'),
      ],
    });

    // Task role (app permissions)
    const taskRole = new iam.Role(this, 'TaskRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    });

    // Grant S3 access
    props.storageBucket.grantReadWrite(taskRole);

    // Grant Secrets Manager access
    taskRole.addToPolicy(new iam.PolicyStatement({
      actions: ['secretsmanager:GetSecretValue'],
      resources: [`arn:aws:secretsmanager:${this.region}:${this.account}:secret:mycura/${props.envName}/*`],
    }));

    // Grant SES access
    taskRole.addToPolicy(new iam.PolicyStatement({
      actions: ['ses:SendEmail', 'ses:SendRawEmail'],
      resources: ['*'],
    }));

    // CloudWatch log group
    const logGroup = new logs.LogGroup(this, 'ApiLogGroup', {
      logGroupName: `/mycura/${props.envName}/api`,
      retention: props.envName === 'production' ? logs.RetentionDays.ONE_YEAR : logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Task definition
    const taskDef = new ecs.FargateTaskDefinition(this, 'ApiTaskDef', {
      cpu: props.envName === 'production' ? 1024 : 512,
      memoryLimitMiB: props.envName === 'production' ? 2048 : 1024,
      executionRole,
      taskRole,
    });

    taskDef.addContainer('api', {
      image: ecs.ContainerImage.fromEcrRepository(ecrRepo, 'latest'),
      portMappings: [{ containerPort: 3000 }],
      environment: {
        NODE_ENV: props.envName === 'production' ? 'production' : 'staging',
        PORT: '3000',
        AWS_REGION: this.region,
        S3_DOCS_BUCKET: props.storageBucket.bucketName,
      },
      secrets: {
        DATABASE_URL: ecs.Secret.fromSecretsManager(props.database.secret!, 'DATABASE_URL'),
      },
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'api',
        logGroup,
      }),
      healthCheck: {
        command: ['CMD-SHELL', 'curl -f http://localhost:3000/api/v1/health || exit 1'],
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(10),
        retries: 3,
        startPeriod: cdk.Duration.seconds(60),
      },
    });

    // ALB
    this.alb = new elbv2.ApplicationLoadBalancer(this, 'ALB', {
      vpc: props.vpc,
      internetFacing: true,
      loadBalancerName: `mycura-${props.envName}`,
    });

    const listener = this.alb.addListener('HttpsListener', {
      port: 443,
      protocol: elbv2.ApplicationProtocol.HTTPS,
      defaultAction: elbv2.ListenerAction.fixedResponse(503),
    });

    // Fargate service
    this.apiService = new ecs.FargateService(this, 'ApiService', {
      serviceName: `mycura-api-${props.envName}`,
      cluster,
      taskDefinition: taskDef,
      desiredCount: props.envName === 'production' ? 2 : 1,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      assignPublicIp: false,
      healthCheckGracePeriod: cdk.Duration.seconds(90),
    });

    // Auto-scaling
    const scaling = this.apiService.autoScaleTaskCount({
      minCapacity: props.envName === 'production' ? 2 : 1,
      maxCapacity: props.envName === 'production' ? 20 : 4,
    });

    scaling.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 70,
      scaleInCooldown: cdk.Duration.seconds(60),
      scaleOutCooldown: cdk.Duration.seconds(30),
    });

    scaling.scaleOnRequestCount('RequestScaling', {
      requestsPerTarget: 1000,
      targetGroup: listener.addTargets('ApiTargets', {
        port: 3000,
        targets: [this.apiService],
        healthCheck: {
          path: '/api/v1/health',
          healthyHttpCodes: '200',
        },
        deregistrationDelay: cdk.Duration.seconds(30),
      }),
    });

    new cdk.CfnOutput(this, 'ALBDnsName', { value: this.alb.loadBalancerDnsName });
    new cdk.CfnOutput(this, 'EcrRepoUri', { value: ecrRepo.repositoryUri });
  }
}
