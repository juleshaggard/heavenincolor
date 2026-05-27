from __future__ import annotations

import argparse
import json
import tempfile
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from PIL import Image, ImageOps


DEFAULT_TILE_SIZE = 64
DEFAULT_COLUMNS = 16
DEFAULT_QUALITY = 72


def parse_captured_at(value: str) -> datetime:
    raw = value.strip()
    if raw.endswith("Z"):
        dt = datetime.fromisoformat(raw[:-1] + "+00:00")
    else:
        dt = datetime.fromisoformat(raw)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def sprite_key(captured_at: datetime) -> str:
    iso_year, iso_week, _ = captured_at.isocalendar()
    return f"{iso_year}-W{iso_week:02d}"


def write_json(path: Path, payload: dict[str, Any]) -> None:
    with tempfile.NamedTemporaryFile("w", prefix=path.name, suffix=".tmp", dir=path.parent, delete=False) as tmp:
        json.dump(payload, tmp, indent=2)
        tmp.write("\n")
        tmp_path = Path(tmp.name)
    tmp_path.replace(path)


def comparable_manifest(manifest: dict[str, Any]) -> dict[str, Any]:
    return {key: value for key, value in manifest.items() if key != "generatedAt"}


def build_sprite_sheet(
    sky_dir: Path,
    key: str,
    entries: list[dict[str, Any]],
    tile_size: int,
    columns: int,
    quality: int,
) -> dict[str, Any]:
    rows = (len(entries) + columns - 1) // columns
    width = columns * tile_size
    height = rows * tile_size
    year = key.split("-", 1)[0]
    rel_path = f"sprites/{year}/{key}.jpg"
    dest = sky_dir / rel_path
    dest.parent.mkdir(parents=True, exist_ok=True)

    for index, entry in enumerate(entries):
        entry["sprite"] = {"key": key, "index": index}

    sheet = Image.new("RGB", (width, height), (0, 0, 0))
    for index, entry in enumerate(entries):
        source_path = sky_dir / entry["imageUrl"]
        with Image.open(source_path) as image:
            image = ImageOps.exif_transpose(image).convert("RGB")
            frame = ImageOps.fit(
                image,
                (tile_size, tile_size),
                method=Image.Resampling.LANCZOS,
                centering=(0.5, 0.5),
            )
        col = index % columns
        row = index // columns
        sheet.paste(frame, (col * tile_size, row * tile_size))

    with tempfile.NamedTemporaryFile(prefix=dest.name, suffix=".tmp", dir=dest.parent, delete=False) as tmp:
        tmp_path = Path(tmp.name)
    try:
        sheet.save(tmp_path, format="JPEG", quality=quality, optimize=True, progressive=True)
        tmp_path.replace(dest)
    finally:
        if tmp_path.exists():
            tmp_path.unlink()

    return {
        "key": key,
        "url": rel_path,
        "tileSize": tile_size,
        "columns": columns,
        "rows": rows,
        "width": width,
        "height": height,
        "count": len(entries),
        "bytes": dest.stat().st_size,
    }


def remove_empty_dirs(root: Path) -> None:
    for child in sorted(root.rglob("*"), reverse=True):
        if child.is_dir():
            try:
                child.rmdir()
            except OSError:
                pass


def prune_stale_sprites(sky_dir: Path, retained: set[Path]) -> int:
    sprite_root = sky_dir / "sprites"
    if not sprite_root.exists():
        return 0
    removed = 0
    for path in sprite_root.rglob("*.jpg"):
        if path not in retained:
            path.unlink()
            removed += 1
    remove_empty_dirs(sprite_root)
    return removed


def build_sprites(sky_dir: Path, tile_size: int, columns: int, quality: int) -> dict[str, Any]:
    manifest_path = sky_dir / "manifest.json"
    manifest = json.loads(manifest_path.read_text())
    if manifest.get("version") != 1 or not isinstance(manifest.get("images"), list):
        raise RuntimeError(f"Unsupported manifest shape at {manifest_path}")

    entries = manifest["images"]
    for entry in entries:
        entry.pop("sprite", None)

    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for entry in entries:
        grouped[sprite_key(parse_captured_at(entry["capturedAt"]))].append(entry)

    weeks: list[dict[str, Any]] = []
    sprite_paths: set[Path] = set()
    sprite_bytes = 0
    for key in sorted(grouped):
        week = build_sprite_sheet(sky_dir, key, grouped[key], tile_size, columns, quality)
        weeks.append(week)
        sprite_paths.add(sky_dir / week["url"])
        sprite_bytes += week["bytes"]

    manifest["sprites"] = {
        "tileSize": tile_size,
        "columns": columns,
        "weeks": weeks,
    }
    retention = manifest.setdefault("retention", {})
    derivative_bytes = sum(int(entry.get("bytes") or 0) + int(entry.get("thumbBytes") or 0) for entry in entries)
    retention["derivativeBytes"] = derivative_bytes
    retention["spriteBytes"] = sprite_bytes
    retention["retainedBytes"] = derivative_bytes + sprite_bytes
    retention["retainedCount"] = len(entries)

    existing = json.loads(manifest_path.read_text())
    if comparable_manifest(existing) == comparable_manifest(manifest):
        manifest["generatedAt"] = existing.get("generatedAt", manifest.get("generatedAt"))
    else:
        manifest["generatedAt"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    removed = prune_stale_sprites(sky_dir, sprite_paths)
    write_json(manifest_path, manifest)

    return {
        "images": len(entries),
        "weeks": len(weeks),
        "spriteBytes": sprite_bytes,
        "removedStaleSprites": removed,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build weekly archive sprite sheets for public/sky.")
    parser.add_argument("sky_dir", nargs="?", type=Path, default=Path("public/sky"))
    parser.add_argument("--tile-size", type=int, default=DEFAULT_TILE_SIZE)
    parser.add_argument("--columns", type=int, default=DEFAULT_COLUMNS)
    parser.add_argument("--quality", type=int, default=DEFAULT_QUALITY)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.tile_size <= 0:
        raise RuntimeError("--tile-size must be positive")
    if args.columns <= 0:
        raise RuntimeError("--columns must be positive")
    result = build_sprites(args.sky_dir, args.tile_size, args.columns, args.quality)
    print(
        "images={images} sprite_weeks={weeks} sprite_bytes={spriteBytes} removed_stale_sprites={removedStaleSprites}".format(
            **result
        )
    )


if __name__ == "__main__":
    main()
