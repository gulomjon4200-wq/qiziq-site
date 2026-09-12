#!/usr/bin/env python3
"""Qiziq faktlar uchun qisqa (TikTok/Reels/Shorts) videolarni avtomatik yaratish.

Har bir fakt uchun: ovoz (TTS) generatsiya qilinadi, so'zlarga sinxron
subtitr tayyorlanadi, animatsion fon video yaratiladi va hammasi bitta
vertikal (1080x1920) mp4 faylga birlashtiriladi.
"""

import argparse
import asyncio
import json
import subprocess
import sys
import tempfile
from pathlib import Path

try:
    import edge_tts
except ImportError:
    print("Xato: 'edge-tts' o'rnatilmagan. Avval: pip install -r requirements.txt", file=sys.stderr)
    sys.exit(1)

BASE_DIR = Path(__file__).resolve().parent
FACTS_PATH = BASE_DIR / "facts.json"
FONT_DIR = BASE_DIR / "fonts"
OUTPUT_DIR = BASE_DIR / "output"

DEFAULT_VOICE = "uz-UZ-MadinaNeural"
WORDS_PER_CAPTION = 3
VIDEO_W, VIDEO_H = 1080, 1920

CATEGORY_COLORS = {
    "fan": ("0x1e3a8a", "0x7c3aed"),
    "tarix": ("0x78350f", "0xb45309"),
    "hayvonot": ("0x14532d", "0x15803d"),
    "kosmos": ("0x000000", "0x312e81"),
    "inson_tanasi": ("0x7f1d1d", "0xdc2626"),
    "dunyo": ("0x0c4a6e", "0x0891b2"),
}
DEFAULT_COLORS = ("0x1e3a8a", "0x7c3aed")


def ffmpeg_path() -> str:
    try:
        import imageio_ffmpeg

        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        return "ffmpeg"


async def synthesize(text: str, voice: str, out_path: Path) -> list[dict]:
    """Matnni ovozga aylantiradi va har bir so'zning vaqt belgisini qaytaradi."""
    communicate = edge_tts.Communicate(text, voice)
    word_boundaries: list[dict] = []
    with open(out_path, "wb") as f:
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                f.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                word_boundaries.append(
                    {
                        "text": chunk["text"],
                        "start": chunk["offset"] / 10_000_000,
                        "end": (chunk["offset"] + chunk["duration"]) / 10_000_000,
                    }
                )
    return word_boundaries


def group_words(word_boundaries: list[dict], group_size: int = WORDS_PER_CAPTION) -> list[dict]:
    groups = []
    for i in range(0, len(word_boundaries), group_size):
        chunk = word_boundaries[i : i + group_size]
        groups.append(
            {
                "text": " ".join(w["text"] for w in chunk),
                "start": chunk[0]["start"],
                "end": chunk[-1]["end"],
            }
        )
    return groups


def format_ass_time(seconds: float) -> str:
    centiseconds = int(round(seconds * 100))
    hours, rem = divmod(centiseconds, 360000)
    minutes, rem = divmod(rem, 6000)
    secs, cs = divmod(rem, 100)
    return f"{hours:d}:{minutes:02d}:{secs:02d}.{cs:02d}"


def build_ass(groups: list[dict], out_path: Path) -> None:
    header = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {VIDEO_W}
PlayResY: {VIDEO_H}
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, OutlineColour, BackColour, Bold, Italic, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Caption,DejaVu Sans,58,&H00FFFFFF,&H00101010,&H00000000,-1,0,1,5,0,2,90,90,260,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    lines = [header]
    for g in groups:
        text = g["text"].replace("\n", " ").strip()
        if not text:
            continue
        lines.append(
            f"Dialogue: 0,{format_ass_time(g['start'])},{format_ass_time(g['end'])},Caption,,0,0,0,,{text}\n"
        )
    out_path.write_text("".join(lines), encoding="utf-8")


def make_background(duration: float, category: str, out_path: Path, ffmpeg: str) -> None:
    c0, c1 = CATEGORY_COLORS.get(category, DEFAULT_COLORS)
    cmd = [
        ffmpeg,
        "-y",
        "-f",
        "lavfi",
        "-i",
        f"gradients=s={VIDEO_W}x{VIDEO_H}:d={duration:.2f}:r=30:c0={c0}:c1={c1}:type=circular:speed=0.03",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        str(out_path),
    ]
    subprocess.run(cmd, check=True, capture_output=True)


def assemble_video(background: Path, audio: Path, ass_path: Path, out_path: Path, ffmpeg: str) -> None:
    vf = f"ass={ass_path.as_posix()}:fontsdir={FONT_DIR.as_posix()}"
    cmd = [
        ffmpeg,
        "-y",
        "-i",
        str(background),
        "-i",
        str(audio),
        "-vf",
        vf,
        "-c:v",
        "libx264",
        "-crf",
        "20",
        "-preset",
        "veryfast",
        "-c:a",
        "aac",
        "-b:a",
        "160k",
        "-shortest",
        str(out_path),
    ]
    subprocess.run(cmd, check=True, capture_output=True)


async def generate_one(fact: dict, voice: str, ffmpeg: str, tmp_dir: Path) -> Path:
    audio_path = tmp_dir / f"{fact['id']}.mp3"
    word_boundaries = await synthesize(fact["text"], voice, audio_path)
    if not word_boundaries:
        raise RuntimeError("ovoz generatsiyasidan so'z vaqtlari olinmadi (internet yoki ovoz nomini tekshiring)")

    groups = group_words(word_boundaries)
    duration = word_boundaries[-1]["end"] + 0.6

    ass_path = tmp_dir / f"{fact['id']}.ass"
    build_ass(groups, ass_path)

    bg_path = tmp_dir / f"{fact['id']}_bg.mp4"
    make_background(duration, fact.get("category", ""), bg_path, ffmpeg)

    OUTPUT_DIR.mkdir(exist_ok=True)
    out_path = OUTPUT_DIR / f"qiziq_{fact['id']:03d}.mp4"
    assemble_video(bg_path, audio_path, ass_path, out_path, ffmpeg)
    return out_path


async def main_async(args: argparse.Namespace) -> None:
    facts = json.loads(FACTS_PATH.read_text(encoding="utf-8"))
    if args.id is not None:
        facts = [f for f in facts if f["id"] == args.id]
        if not facts:
            print(f"ID {args.id} topilmadi")
            return

    ffmpeg = ffmpeg_path()
    with tempfile.TemporaryDirectory() as tmp:
        tmp_dir = Path(tmp)
        for fact in facts:
            preview = fact["text"][:60] + ("..." if len(fact["text"]) > 60 else "")
            print(f"-> [{fact['id']}] {preview}")
            try:
                out_path = await generate_one(fact, args.voice, ffmpeg, tmp_dir)
                print(f"   tayyor: {out_path}")
            except subprocess.CalledProcessError as e:
                stderr = e.stderr.decode("utf-8", errors="ignore") if e.stderr else ""
                print(f"   XATO (ffmpeg): {stderr[-500:]}", file=sys.stderr)
            except Exception as e:  # noqa: BLE001
                print(f"   XATO: {e}", file=sys.stderr)


def main() -> None:
    parser = argparse.ArgumentParser(description="Qiziq faktlar videolarini avtomatik yaratish")
    parser.add_argument("--id", type=int, help="Faqat shu ID'dagi faktdan video yasash (bo'sh qoldirsa - hammasi)")
    parser.add_argument("--voice", default=DEFAULT_VOICE, help="Edge-TTS ovoz nomi (masalan uz-UZ-SardorNeural)")
    args = parser.parse_args()
    asyncio.run(main_async(args))


if __name__ == "__main__":
    main()
