# Shea POS releases

The POS uses Electron Builder's signed NSIS installer and Electron's generic update provider.

## Release checklist

1. Bump `shea-pos/package.json` to a new semantic version.
2. Configure Windows code signing in the release environment with `CSC_LINK` and `CSC_KEY_PASSWORD`.
3. Run `yarn dist:win` from `shea-pos` and upload the generated `.exe` from `shea-pos/release` in Admin -> POS Updates.
4. Keep `latest.yml` and every versioned installer in `releases/pos`. Caddy serves them at `/downloads/pos`.
5. Test the installed build on a clean Windows machine before publishing the next version.

The installed POS checks after startup and every six hours. Operators can also start a check from the header. Downloads are explicit, and installation happens only after the operator chooses `Restart to update`, so a sale is not interrupted.

The admin upload endpoint rejects non-EXE files, invalid versions, oversized installers, and duplicate filenames. It calculates the SHA-512 checksum and writes the `latest.yml` manifest used by the updater.
