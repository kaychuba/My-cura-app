import { SetMetadata } from '@nestjs/common';

export const ALLOW_PRE_MFA = 'allowPreMfa';

/**
 * Marks an endpoint as reachable by staff accounts that have not yet enrolled
 * in MFA. Only the endpoints needed to *complete* enrollment (2FA setup and
 * confirm), inspect the session, or leave it should carry this.
 */
export const AllowPreMfa = () => SetMetadata(ALLOW_PRE_MFA, true);
