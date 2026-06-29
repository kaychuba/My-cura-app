import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cloudwatch_actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as sns_subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import { Construct } from 'constructs';

interface MonitoringStackProps extends cdk.StackProps {
  envName: string;
  apiService: ecs.FargateService;
}

export class MonitoringStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: MonitoringStackProps) {
    super(scope, id, props);

    // Alerting topic
    const alertTopic = new sns.Topic(this, 'AlertTopic', {
      topicName: `mycura-${props.envName}-alerts`,
    });

    alertTopic.addSubscription(
      new sns_subscriptions.EmailSubscription('ops@mycura.io'),
    );

    // ECS service alarms
    const cpuAlarm = new cloudwatch.Alarm(this, 'CpuAlarm', {
      alarmName: `mycura-${props.envName}-high-cpu`,
      metric: props.apiService.metricCpuUtilization(),
      threshold: 85,
      evaluationPeriods: 3,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    cpuAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(alertTopic));

    const memAlarm = new cloudwatch.Alarm(this, 'MemAlarm', {
      alarmName: `mycura-${props.envName}-high-memory`,
      metric: props.apiService.metricMemoryUtilization(),
      threshold: 90,
      evaluationPeriods: 3,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    memAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(alertTopic));

    // Operational dashboard
    new cloudwatch.Dashboard(this, 'Dashboard', {
      dashboardName: `MyCura-${props.envName}`,
      widgets: [
        [
          new cloudwatch.GraphWidget({
            title: 'API CPU Utilisation',
            left: [props.apiService.metricCpuUtilization()],
            width: 12,
          }),
          new cloudwatch.GraphWidget({
            title: 'API Memory Utilisation',
            left: [props.apiService.metricMemoryUtilization()],
            width: 12,
          }),
        ],
        [
          new cloudwatch.GraphWidget({
            title: 'Running Tasks',
            left: [props.apiService.metric('RunningTaskCount')],
            width: 12,
          }),
        ],
      ],
    });
  }
}
