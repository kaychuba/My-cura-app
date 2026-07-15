import { Global, Module } from '@nestjs/common';
import { EncryptionService } from './encryption.service';
import { SecurityMonitorService } from './security-monitor.service';
import { ReplicationMonitorService } from './replication-monitor.service';

@Global()
@Module({
  providers: [EncryptionService, SecurityMonitorService, ReplicationMonitorService],
  exports: [EncryptionService, SecurityMonitorService],
})
export class SecurityModule {}
