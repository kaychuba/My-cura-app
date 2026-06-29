import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

interface StorageStackProps extends cdk.StackProps {
  envName: string;
}

export class StorageStack extends cdk.Stack {
  public readonly docsBucket: s3.Bucket;
  public readonly avatarsBucket: s3.Bucket;
  public readonly reportsBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: StorageStackProps) {
    super(scope, id, props);

    const commonProps: s3.BucketProps = {
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      versioned: props.envName === 'production',
      removalPolicy: props.envName === 'production' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: props.envName !== 'production',
    };

    this.docsBucket = new s3.Bucket(this, 'DocsBucket', {
      ...commonProps,
      bucketName: `mycura-docs-${props.envName}-${this.account}`,
      lifecycleRules: [
        {
          id: 'archive-old-docs',
          enabled: true,
          transitions: [
            {
              storageClass: s3.StorageClass.INFREQUENT_ACCESS,
              transitionAfter: cdk.Duration.days(90),
            },
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: cdk.Duration.days(365),
            },
          ],
        },
      ],
    });

    this.avatarsBucket = new s3.Bucket(this, 'AvatarsBucket', {
      ...commonProps,
      bucketName: `mycura-avatars-${props.envName}-${this.account}`,
    });

    this.reportsBucket = new s3.Bucket(this, 'ReportsBucket', {
      ...commonProps,
      bucketName: `mycura-reports-${props.envName}-${this.account}`,
      lifecycleRules: [
        {
          id: 'expire-old-reports',
          enabled: true,
          expiration: cdk.Duration.days(180),
        },
      ],
    });

    // CORS for direct browser uploads to avatars
    this.avatarsBucket.addCorsRule({
      allowedMethods: [s3.HttpMethods.PUT, s3.HttpMethods.POST],
      allowedOrigins: ['*'],
      allowedHeaders: ['*'],
      maxAge: 3000,
    });

    new cdk.CfnOutput(this, 'DocsBucketName', { value: this.docsBucket.bucketName });
    new cdk.CfnOutput(this, 'AvatarsBucketName', { value: this.avatarsBucket.bucketName });
    new cdk.CfnOutput(this, 'ReportsBucketName', { value: this.reportsBucket.bucketName });
  }
}
