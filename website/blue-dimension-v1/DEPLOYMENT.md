# Blue Dimension static release

This directory is the generated, static Plesk/GitHub Pages companion to the
reviewed DJ Jesse Jay — Blue Dimension Sites deployment.

## Plesk Git

1. In Plesk open **Domain → Git → Repository hinzufügen → Remote-Repository**.
2. Use `https://github.com/MarcelRaschke/djjessejay.ch.git`.
3. Select the reviewed feature branch or merge commit.
4. Choose **Manuell** for deployment.
5. Deploy this directory into a dedicated release path first.
6. Verify `index.html`, `/assets/`, `og.jpg`, navigation and the 97.5 tuner.
7. Switch the document root only after validation.

Do not store the Plesk SSH password, Cloudflare token or any private key in Git.

## Provenance

The public copy follows `DJ_JESSE_JAY_CANONICAL_PROFILE.md`. Generated artwork
is branding, not historical evidence. A current Radio LoRa schedule is
deliberately not asserted without a current station source.

## Rollback

Redeploy the last known-good Git commit or restore the previous document root.
