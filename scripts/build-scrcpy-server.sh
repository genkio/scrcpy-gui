#!/bin/bash

set -euo pipefail

server_version=3.3.3
project_root="$(cd "$(dirname "$0")/.." && pwd)"
build_root="$(mktemp -d "${TMPDIR:-/tmp}/scrcpy-gui-server.XXXXXX")"

cleanup() {
	rm -r "$build_root"
}
trap cleanup EXIT

git clone --depth 1 --branch "v$server_version" \
	https://github.com/Genymobile/scrcpy.git "$build_root/scrcpy"
git -C "$build_root/scrcpy" apply --unidiff-zero \
	"$project_root/patches/scrcpy-server-current-user.patch"

android_studio_jdk='/Applications/Android Studio.app/Contents/jbr/Contents/Home'
if [[ -z "${JAVA_HOME:-}" && -d "$android_studio_jdk" ]]; then
	export JAVA_HOME="$android_studio_jdk"
fi

android_sdk="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$HOME/Library/Android/sdk}}"
export ANDROID_HOME="$android_sdk"

(
	cd "$build_root/scrcpy"
	./gradlew :server:assembleRelease
)

cp \
	"$build_root/scrcpy/server/build/outputs/apk/release/server-release-unsigned.apk" \
	"$project_root/resources/scrcpy-server"

shasum -a 256 "$project_root/resources/scrcpy-server"
