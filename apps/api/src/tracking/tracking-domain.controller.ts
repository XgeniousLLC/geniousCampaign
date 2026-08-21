import { BadRequestException, Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { resolveCname } from 'node:dns/promises';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { AuditLogService } from '../auth/audit-log.service';
import { SettingsService } from '../settings/settings.service';
import { VerifyTrackingDomainDto } from './dto/verify-tracking-domain.dto';

const DOMAIN_PATTERN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i;

// A custom domain is never saved from a bare text field — a real DNS record
// pointing it at this API is checked first (same shape as how Mailgun/
// SendGrid verify sending domains), so a typo or unowned domain can't
// silently become the open/click tracking host.
@Controller('settings/tracking-domain')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('owner')
export class TrackingDomainController {
  constructor(
    private readonly settings: SettingsService,
    private readonly auditLog: AuditLogService,
  ) {}

  @Post('verify')
  async verify(@Body() dto: VerifyTrackingDomainDto, @Req() req: Request, @CurrentUser() user: AuthenticatedUser) {
    const domain = dto.domain.trim().toLowerCase().replace(/\.$/, '');
    if (!DOMAIN_PATTERN.test(domain)) {
      throw new BadRequestException('Enter a valid domain, e.g. track.yourdomain.com');
    }

    const apiHost = (req.hostname || '').toLowerCase();

    // Using the API's own domain directly (e.g. campaign-api.xgenious.com)
    // needs no DNS proof — the request reaching this endpoint on that exact
    // Host header already establishes it routes here with a valid TLS cert,
    // which is all the CNAME check below exists to prove for a *separate*
    // custom tracking subdomain. Excludes localhost/IP literals so the
    // "show the DNS record" flow stays exercisable in local dev, same as
    // before — a local-dev host can still never self-verify.
    const isLocalHost = apiHost === 'localhost' || apiHost === '::1' || /^\d{1,3}(\.\d{1,3}){3}$/.test(apiHost);
    if (domain === apiHost && !isLocalHost) {
      await this.settings.setMany({ TRACKING_DOMAIN: domain });
      await this.auditLog.record(user, 'settings.tracking_domain.save', 'settings', 'TRACKING_DOMAIN', { domain, verified: true, selfHost: true });
      return { verified: true, domain };
    }

    const record = { type: 'CNAME', host: domain, value: apiHost };

    let targets: string[] = [];
    try {
      targets = await resolveCname(domain);
    } catch {
      // No CNAME yet (NXDOMAIN, no record, etc.) — falls through to the
      // "not verified" response below with instructions.
    }
    const verified = targets.some((t) => t.toLowerCase().replace(/\.$/, '') === apiHost);

    if (!verified) {
      return { verified: false, record };
    }

    await this.settings.setMany({ TRACKING_DOMAIN: domain });
    await this.auditLog.record(user, 'settings.tracking_domain.save', 'settings', 'TRACKING_DOMAIN', { domain, verified: true });
    return { verified: true, domain };
  }
}
