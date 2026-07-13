import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { appSettings } from '../db/schema';
import { encryptToken, decryptToken, appEncryptionSecret } from '../sending/token-encryption.util';
import { SETTING_CATEGORIES, ALL_SETTING_KEYS } from './known-settings';

export interface SettingFieldStatus {
  key: string;
  label: string;
  secret: boolean;
  configured: boolean;
  source: 'db' | 'env' | 'unset';
  // Non-secret values are shown in full so the form can be edited in place;
  // secret values are never sent to the browser in plaintext.
  value: string | null;
  // Static option list for fields that should render as a <select> on the
  // frontend (e.g. LLM_PROVIDER) — undefined for plain text/secret fields.
  options?: string[];
}

export interface SettingCategoryStatus {
  key: string;
  label: string;
  description: string;
  fields: SettingFieldStatus[];
  instructions?: string[];
}

@Injectable()
export class SettingsService implements OnModuleInit {
  private readonly logger = new Logger(SettingsService.name);
  private cache = new Map<string, string>();

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    await this.reload();
  }

  async reload() {
    const rows = await this.drizzle.db.select().from(appSettings);
    const secret = this.encryptionSecret();
    this.cache.clear();
    for (const row of rows) {
      try {
        this.cache.set(row.key, decryptToken(row.value, secret));
      } catch {
        this.logger.warn(`Failed to decrypt stored setting "${row.key}" — ignoring (JWT_SECRET changed since it was saved?)`);
      }
    }
  }

  private encryptionSecret(): string {
    return appEncryptionSecret(this.config);
  }

  /** The single source of truth every credential-consuming provider should
   * call instead of ConfigService.get() for keys in known-settings.ts — a
   * DB-stored override (set via the UI) always wins over process.env. */
  get(key: string): string | undefined {
    return this.cache.get(key) ?? this.config.get<string>(key) ?? undefined;
  }

  async setMany(values: Record<string, string>) {
    const secret = this.encryptionSecret();
    for (const [key, value] of Object.entries(values)) {
      if (!ALL_SETTING_KEYS.has(key)) continue;
      if (value === '') continue; // empty = "leave unchanged", use clear() to actually unset
      const encrypted = encryptToken(value, secret);
      await this.drizzle.db
        .insert(appSettings)
        .values({ key, value: encrypted })
        .onConflictDoUpdate({ target: appSettings.key, set: { value: encrypted, updatedAt: new Date() } });
      this.cache.set(key, value);
      // Belt-and-suspenders: the AWS SDK's default credential provider chain
      // reads AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY directly from
      // process.env, bypassing ConfigService/SettingsService entirely —
      // mutating it here is what actually lets a newly-saved AWS key work
      // without a server restart.
      process.env[key] = value;
    }
  }

  async clear(key: string) {
    if (!ALL_SETTING_KEYS.has(key)) return;
    await this.drizzle.db.delete(appSettings).where(eq(appSettings.key, key));
    this.cache.delete(key);
    delete process.env[key];
  }

  getAllForDisplay(): SettingCategoryStatus[] {
    return SETTING_CATEGORIES.map((category) => ({
      key: category.key,
      label: category.label,
      description: category.description,
      instructions: category.instructions,
      fields: category.fields.map((field) => {
        const dbValue = this.cache.get(field.key);
        const envValue = this.config.get<string>(field.key);
        const effective = dbValue ?? envValue;
        const source: SettingFieldStatus['source'] = dbValue ? 'db' : envValue ? 'env' : 'unset';
        return {
          key: field.key,
          label: field.label,
          secret: field.secret,
          configured: !!effective,
          source,
          value: field.secret ? null : (effective ?? null),
          options: field.options,
        };
      }),
    }));
  }
}
