import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { eq } from 'drizzle-orm';
import { db, pool } from '../db/client.js';
import { env } from '../env.js';
import { sourceRecords, visualAssets } from '../db/schema.js';

const visualReferences = [
  ['dj Jesse Jay Logo.svg', 'https://drive.google.com/file/d/1ZZM0k-QwVW4tq358QenJ0atgWwGMz3dz/view', 'logo'],
  ['Dj JesseJay.png', 'https://drive.google.com/file/d/1scybBquoSKEck0yP0Ya6FYWW-KvaKg0A/view', 'image'],
  ['neon dj jj.png', 'https://drive.google.com/file/d/1k4FQ88mFTrG-rbiKnMa0Vc4wJzOUsfXM/view', 'image'],
  ['dj Jesse Jay.gif', 'https://drive.google.com/file/d/1lSud5Z7kGHxnMQFjtutAh57oogzbvYCD/view', 'animation']
] as const;

async function main() {
  const rawProfile = await fs.readFile(env.CANONICAL_PROFILE_PATH, 'utf8');
  JSON.parse(rawProfile);
  const sha256 = crypto.createHash('sha256').update(rawProfile).digest('hex');

  const [profileSource] = await db.insert(sourceRecords).values({
    sourceType: 'git-repository',
    sourceUri: 'https://github.com/MarcelRaschke/djjessejay.ch/blob/main/artist-profile.json',
    sourceRevision: process.env.SOURCE_REVISION ?? 'main',
    evidenceClass: 'P1',
    verificationStatus: 'verified',
    contentSha256: sha256,
    verifiedAt: new Date(),
    metadata: { path: 'artist-profile.json', importMode: 'explicit-bootstrap' }
  }).onConflictDoNothing().returning();

  console.log(profileSource ? 'Imported canonical profile source.' : 'Canonical profile source already present.');

  for (const [name, externalUri, kind] of visualReferences) {
    let [source] = await db.select().from(sourceRecords).where(eq(sourceRecords.sourceUri, externalUri)).limit(1);
    if (!source) {
      [source] = await db.insert(sourceRecords).values({
        sourceType: 'google-drive', sourceUri: externalUri, evidenceClass: 'P1', verificationStatus: 'qualified',
        metadata: { accessMode: 'external-reference', kind }
      }).returning();
    }
    if (!source) throw new Error(`Unable to resolve source record for ${name}`);

    const existing = await db.select({ id: visualAssets.id }).from(visualAssets).where(eq(visualAssets.externalUri, externalUri)).limit(1);
    if (existing.length === 0) {
      await db.insert(visualAssets).values({ name, externalUri, metadata: { kind }, sourceRecordId: source.id });
      console.log(`Imported visual reference: ${name}`);
    }
  }
}

main()
  .then(() => pool.end())
  .catch(async (error) => {
    console.error(error);
    await pool.end();
    process.exit(1);
  });
