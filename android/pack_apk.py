#!/usr/bin/env python3
"""Pack the APK: copy aapt2 output, add classes.dex, keep stored entries
aligned to 4 bytes (resources.arsc + classes.dex must be aligned on API 30+).

This replaces the x86-only `zipalign` binary on this ARM64 host. All writes
are sequential so the on-disk offset of every entry is known exactly.
"""
import struct
import sys
import zipfile

STORED = zipfile.ZIP_STORED
DEFLATED = zipfile.ZIP_DEFLATED
ALIGN = 4

src, dex_path, dst = sys.argv[1:4]


def alignment_for(name: str) -> int:
    # Native libraries need page alignment; dex/arsc need 4 bytes.
    return 4096 if name.endswith(".so") else ALIGN


with open(dex_path, "rb") as fh:
    dex_bytes = fh.read()

with zipfile.ZipFile(src) as zin:
    entries = [(i, zin.read(i.filename)) for i in zin.infolist()]
entries.append((None, dex_bytes))  # classes.dex

with zipfile.ZipFile(dst, "w") as zout:
    for info, data in entries:
        name = "classes.dex" if info is None else info.filename
        compress_type = STORED if info is None else (
            STORED if info.compress_type == STORED else DEFLATED)

        zi = zipfile.ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
        zi.compress_type = compress_type
        zi.external_attr = info.external_attr if info is not None else 0o644 << 16
        zi.create_system = 0

        if compress_type == STORED:
            align = alignment_for(name)
            base = zout.fp.tell() + 30 + len(name.encode("utf-8"))
            pad = (-base) % align
            if pad:
                # Extra field = id(2) + size(2) + payload(pad).
                zi.extra = struct.pack("<HH", 0xD935, pad) + b"\x00" * pad

        zout.writestr(zi, data)

with zipfile.ZipFile(dst) as z:
    bad = z.testzip()
    if bad is not None:
        sys.exit(f"corrupt entry: {bad}")
    with open(dst, "rb") as raw:
        for name in ("classes.dex", "resources.arsc"):
            if name not in z.namelist():
                continue
            info = z.getinfo(name)
            align = alignment_for(name)
            if info.compress_type != STORED:
                print(f"{name}: deflated (no alignment required)")
                continue
            raw.seek(info.header_offset)
            header = raw.read(30)
            if header[:4] != b"PK\x03\x04":
                sys.exit(f"{name}: bad local header")
            name_len = int.from_bytes(header[26:28], "little")
            extra_len = int.from_bytes(header[28:30], "little")
            offset = info.header_offset + 30 + name_len + extra_len
            if offset % align != 0:
                sys.exit(f"{name}: misaligned at {offset} (need {align})")
            print(f"{name}: offset {offset}, stored, aligned to {align}")

print("APK packing OK")
