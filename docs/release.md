# Release Workflow

This repository uses tag-driven GitHub Releases.

## Trigger

Push a tag like `v1.0.6` to `origin`. The release workflow will:

1. install dependencies
2. run lint
3. sync the Android project
4. inject Android signing secrets
5. build APK and AAB
6. create a GitHub Release and attach the artifacts

## Required GitHub secrets

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

Store the keystore as base64 so it can be written back to a file during CI.

## Local Android signing file

For local release builds, create `android/keystore.properties` with:

```properties
storeFile=release-keystore.jks
storePassword=...
keyAlias=...
keyPassword=...
```

Place the matching `android/release-keystore.jks` beside it. Both files are ignored by Git.

## Android key strategy

- For GitHub Releases or direct distribution, keep one release keystore and use it to sign APK/AAB.
- For Google Play, prefer Play App Signing. Your local keystore becomes the upload key, while Google holds the app signing key.
- For F-Droid, the build is done from source on the F-Droid side, so you do not hand over your keystore.
