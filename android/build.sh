#!/usr/bin/env bash
# Builds a signed, installable APK without Gradle (aapt2 + javac + d8 + apksigner).
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
cd "$HERE"

SDK="${ANDROID_HOME:-/opt/android-sdk}"
BT="$SDK/build-tools/35.0.0"
# aapt2 2.19 (Debian, native ARM64) cannot read the android-35 resource table,
# so resources are linked against API 31 (splash screen attrs) while Java code
# compiles against API 35 (POST_NOTIFICATIONS, etc.). targetSdk tetap 35.
ANDROID_JAR="$SDK/platforms/android-31/android.jar"
CODE_JAR="$SDK/platforms/android-35/android.jar"
MIN_SDK=24
TARGET_SDK=35
KS="$HERE/debug.keystore"
OUT="$HERE/build"
VERSION_NAME="$(sed -n 's/.*android:versionName="\([^"]*\)".*/\1/p' AndroidManifest.xml | head -1)"
APK_NAME="OjolTarget-Pro-${VERSION_NAME:-dev}.apk"

# aapt2: prefer the Android build-tools binary (x86-64 hosts such as CI), then
# the system one (Debian ships a native ARM64 build), then the Debian path.
pick_aapt2() {
  if [ -n "${AAPT2:-}" ] && [ -x "${AAPT2}" ]; then return; fi
  if [ -x "$BT/aapt2" ] && "$BT/aapt2" version >/dev/null 2>&1; then
    AAPT2="$BT/aapt2"; return
  fi
  if command -v aapt2 >/dev/null 2>&1 && aapt2 version >/dev/null 2>&1; then
    AAPT2="$(command -v aapt2)"; return
  fi
  AAPT2=/usr/lib/android-sdk/build-tools/debian/aapt2
}
AAPT2=""
pick_aapt2
D8_JAR="$BT/lib/d8.jar"
APKSIGNER_JAR="$BT/lib/apksigner.jar"

[ -x "$AAPT2" ] || { echo "aapt2 tidak ditemukan: $AAPT2"; exit 1; }
[ -f "$ANDROID_JAR" ] || { echo "android.jar tidak ditemukan: $ANDROID_JAR"; exit 1; }
[ -f "$CODE_JAR" ] || { echo "android.jar (kode) tidak ditemukan: $CODE_JAR"; exit 1; }
[ -d assets/www ] || { echo "assets belum disiapkan (jalankan ./prepare-assets.sh)"; exit 1; }

if [ ! -f "$KS" ]; then
  keytool -genkeypair -v -keystore "$KS" -storepass android -keypass android \
    -alias ojoltarget -keyalg RSA -keysize 2048 -validity 10950 \
    -dname "CN=OjolTarget Pro, OU=Mobile, O=OjolTarget, L=Jakarta, ST=DKI Jakarta, C=ID" >/dev/null 2>&1
  echo "keystore dibuat: $KS"
fi

rm -rf "$OUT"
mkdir -p "$OUT/compiled" "$OUT/classes" "$OUT/dex" "$OUT/gen"

echo "==> 1/6 aapt2 compile"
"$AAPT2" compile --dir res -o "$OUT/compiled/res.zip"

echo "==> 2/6 aapt2 link"
"$AAPT2" link \
  -o "$OUT/base.apk" \
  -I "$ANDROID_JAR" \
  --manifest AndroidManifest.xml \
  -A assets \
  --java "$OUT/gen" \
  --min-sdk-version "$MIN_SDK" \
  --target-sdk-version "$TARGET_SDK" \
  "$OUT/compiled/res.zip"

echo "==> 3/6 javac"
find java "$OUT/gen" -name '*.java' > "$OUT/sources.txt"
javac -encoding UTF-8 -nowarn -source 17 -target 17 -Xlint:-options \
  -classpath "$CODE_JAR" -d "$OUT/classes" @"$OUT/sources.txt"

echo "==> 4/6 d8 (dex)"
find "$OUT/classes" -name '*.class' > "$OUT/classes.txt"
java -cp "$D8_JAR" com.android.tools.r8.D8 --release --min-api "$MIN_SDK" \
  --lib "$CODE_JAR" --output "$OUT/dex" @"$OUT/classes.txt"

echo "==> 5/6 package + align"
python3 pack_apk.py "$OUT/base.apk" "$OUT/dex/classes.dex" "$OUT/aligned.apk"

echo "==> 6/6 apksigner"
java -jar "$APKSIGNER_JAR" sign \
  --ks "$KS" --ks-pass pass:android --key-pass pass:android --ks-key-alias ojoltarget \
  --min-sdk-version "$MIN_SDK" \
  --out "$HERE/$APK_NAME" "$OUT/aligned.apk"

java -jar "$APKSIGNER_JAR" verify --print-certs "$HERE/$APK_NAME" | head -6
echo
echo "APK: $HERE/$APK_NAME ($(du -h "$HERE/$APK_NAME" | cut -f1))"
