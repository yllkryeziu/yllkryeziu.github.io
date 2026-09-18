#!/usr/bin/env python3
"""Capture intermediate speed policies using the existing mario-blj tools, then render them."""
import argparse
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
import os
from pathlib import Path
import shlex
import shutil
import subprocess
import sys


HERE = Path(__file__).resolve().parent


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def run(command, repo, environment):
    print(shlex.join(map(str, command)), flush=True)
    subprocess.run(list(map(str, command)), cwd=repo, env=environment, check=True)


def write_json(path, value):
    path.write_text(json.dumps(value, indent=2) + "\n")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", type=Path, default=Path.home() / "Desktop/mario-blj")
    parser.add_argument("--checkpoints", type=Path, default=HERE / "checkpoints")
    parser.add_argument("--out", type=Path, help="New output directory; existing directories are refused.")
    parser.add_argument("--work-dir", type=Path, help="New scratch directory for frame dumps, preferably on node-local storage.")
    parser.add_argument("--render-workers", type=int, choices=range(1, 5), default=1,
                        help="Independent render processes; reserve four CPUs per worker.")
    parser.add_argument("--python", type=Path, help="Python with mario-blj dependencies installed.")
    parser.add_argument("--seed", type=int, default=20250916, help="Same capture seed for every policy.")
    parser.add_argument("--check", action="store_true", help="Verify local prerequisites without rendering.")
    parser.add_argument("--dry-run", action="store_true", help="Verify checkpoints and print commands only.")
    parser.add_argument("--no-label", action="store_true", help="Use HTML captions rather than burned-in labels; avoids ffmpeg drawtext.")
    args = parser.parse_args()
    repo = args.repo.expanduser().resolve()
    checkpoints = args.checkpoints.expanduser().resolve()
    out = (args.out or repo / "data/renders" / f"speed-evolution-{args.seed}").expanduser().resolve()
    python = args.python or (repo / ".venv/bin/python")
    if not args.python and not python.exists():
        python = Path(sys.executable)
    # Preserve the venv executable path: resolving its symlink would bypass that venv.
    python = python.expanduser().absolute()
    study = json.loads((HERE / "study.json").read_text())
    for checkpoint in study["checkpoints"]:
        path = checkpoints / checkpoint["file"]
        if not path.is_file() or digest(path) != checkpoint["sha256"]:
            raise SystemExit(f"Missing or mismatched checkpoint: {path}")
    print(f"Verified {len(study['checkpoints'])} seed-4 checkpoints.")

    capture = repo / "tools/export_swarm_render.py"
    renderer = repo / "tools/render_swarm_shots.py"
    game = repo / "third_party/sm64-port/build/us_pc/sm64.us"
    tas = repo / "data/tas/tas_validation/sm64-0star-2016M.m64"
    library = repo / "third_party/libsm64/dist" / ("libsm64.dylib" if sys.platform == "darwin" else "libsm64.so")
    environment = dict(os.environ, PYTHONPATH=str(repo))
    source_hashes = {}
    if not args.dry_run:
        required = [python, capture, renderer, game, tas, library,
                    repo / "roms/baserom.us.z64",
                    repo / "third_party/sm64-port/levels/castle_inside/areas/2/collision.inc.c",
                    repo / "third_party/libsm64/src/decomp/include/surface_terrains.h"]
        missing = [str(path) for path in required if not path.is_file()]
        if missing:
            raise SystemExit("Missing local prerequisites:\n" + "\n".join(missing))
        if not os.access(game, os.X_OK):
            raise SystemExit(f"Renderer is not executable: {game}")
        game_bytes = game.read_bytes()
        if any(flag not in game_bytes for flag in [b"SM64_SWARM_FILE", b"SM64_CAM", b"SM64_HIDE_DOORS", b"SM64_DUMP_FIRST"]):
            raise SystemExit("The game binary is missing the required swarm/camera/frame-dump patches.")
        ffmpeg = shutil.which("ffmpeg")
        if not ffmpeg:
            raise SystemExit("ffmpeg must be on PATH.")
        features = [("-encoders", "libx264")]
        if not args.no_label:
            features.append(("-filters", "drawtext"))
        for flag, feature in features:
            available = subprocess.check_output([ffmpeg, "-hide_banner", flag], text=True,
                                                stderr=subprocess.STDOUT)
            if feature not in available:
                raise SystemExit(f"ffmpeg is missing {feature}.")
        run([python, "-c", "import sys, numpy, torch, stable_baselines3; "
             "assert sys.version_info >= (3, 11), 'Python 3.11+ required'"], repo, environment)
        for name, expected in study["sourceHashes"].items():
            path = repo / name
            if not path.is_file() or digest(path) != expected:
                raise SystemExit(f"{name} differs from the inspected source at "
                                 f"{study['measurementCommit']}. See README.md before rendering.")
            source_hashes[name] = expected
        print("Local prerequisites and capture source verified.")
        if args.check:
            return

    commands = []
    specs = [("untrained-speed-seed-4", ["--untrained", "--untrained_seed", "4",
                                      "--untrained_name", "untrained-speed-seed-4"])]
    specs += [(row["name"], ["--rung", f"speed={checkpoints}", "--steps", str(row["steps"])])
              for row in study["checkpoints"]]
    for name, flags in specs:
        # One process per shot keeps the upstream tool's order-dependent seed offset at zero.
        command = [python, capture, *flags, "--seed", str(args.seed), "--population", "64",
                   "--frames", "450", "--warmup", "0", "--episode_frames", "1200",
                   "--spawn_spread", "150", "--out_dir", out / "captures" / name]
        commands.append((name, command))
    render_command = [python, renderer, "--manifest", out / "captures/manifest.json",
                      "--out_dir", out / "videos", "--game", game,
                      "--replay_dir", out / "replay", "--tas", tas,
                      "--width", "960", "--height", "720", "--crf", "23",
                      "--audio_bitrate", "96k", "--no_poster", "--prefix", "speed-evolution-"]
    if args.no_label:
        render_command.append("--no_label")
    if args.work_dir:
        scratch = args.work_dir.expanduser().resolve()
        if scratch.exists():
            raise SystemExit(f"Scratch directory already exists: {scratch}. Choose a new directory.")
        render_command.extend(["--work_dir", scratch])
    render_commands = [render_command]
    if args.render_workers > 1:
        render_commands = []
        for name, _ in specs:
            command = list(render_command)
            command[command.index("--out_dir") + 1] = out / "videos/.parts" / name
            command[command.index("--replay_dir") + 1] = out / "replay" / name
            if "--work_dir" in command:
                command[command.index("--work_dir") + 1] = scratch / name
            command.extend(["--only", name])
            render_commands.append(command)
    if args.dry_run:
        for _, command in commands:
            print(shlex.join(map(str, command)))
        for command in render_commands:
            print(shlex.join(map(str, command)))
        return
    if out.exists():
        raise SystemExit(f"Output already exists: {out}. Choose a new --out directory.")
    out.mkdir(parents=True)
    (out / "replay").mkdir()
    # Use a separate replay folder so an older cont.m64 cannot silently change the render.
    shutil.copyfile(tas, out / "replay/cont.m64")
    runtime = subprocess.check_output([str(python), "-m", "pip", "freeze"], cwd=repo, text=True)
    (out / "python-packages.txt").write_text(runtime)
    write_json(out / "study.json", study)
    write_json(out / "run.json", {"captureSeed": args.seed, "warmup": 0,
               "seedPolicy": "Each checkpoint starts with the same RNG seed; no shot offset.",
               "sourceHashes": source_hashes, "librarySha256": digest(library),
               "rendererSha256": digest(game), "tasSha256": digest(tas),
               "renderWorkers": args.render_workers,
               "commands": [list(map(str, cmd)) for _, cmd in commands]
                           + [list(map(str, cmd)) for cmd in render_commands]})
    shots = []
    manifest = None
    for name, command in commands:
        run(command, repo, environment)
        captured = json.loads((out / "captures" / name / "manifest.json").read_text())
        if len(captured["shots"]) != 1:
            raise RuntimeError(f"Expected exactly one captured shot for {name}")
        row = captured["shots"][0]
        if row["name"] != name:
            raise RuntimeError(f"Unexpected shot name: {row['name']}")
        expected = next((c for c in study["checkpoints"] if c["name"] == name), None)
        if expected and row["steps"] != expected["steps"]:
            raise RuntimeError(f"The capture picked the wrong checkpoint for {name}")
        row["container"] = f"{name}/{row['container']}"
        if row.get("audio"):
            row["audio"] = f"{name}/{row['audio']}"
        row["captureSeed"] = args.seed
        if expected:
            row["checkpointSha256"] = expected["sha256"]
        shots.append(row)
        manifest = {**captured, "shots": shots, "seedPolicy": "identical seed per shot"}
        # Persist the combined inventory after each capture, including partial runs.
        write_json(out / "captures/manifest.json", manifest)
    if args.render_workers == 1:
        run(render_command, repo, environment)
    else:
        for name, _ in specs:
            (out / "replay" / name).mkdir()
        with ThreadPoolExecutor(max_workers=args.render_workers) as pool:
            # Every process has a separate replay folder, frame directory and output inventory.
            list(pool.map(lambda command: run(command, repo, environment), render_commands))
        combined = None
        rendered_shots = []
        for name, _ in specs:
            part = out / "videos/.parts" / name
            inventory = json.loads((part / "rendered.json").read_text())
            if len(inventory["shots"]) != 1 or inventory["shots"][0]["shot"] != name:
                raise RuntimeError(f"Unexpected rendered inventory for {name}")
            row = inventory["shots"][0]
            shutil.move(part / row["video"], out / "videos" / row["video"])
            rendered_shots.append(row)
            combined = {**inventory, "shots": rendered_shots}
        write_json(out / "videos/rendered.json", combined)
        shutil.rmtree(out / "videos/.parts")
    rendered = json.loads((out / "videos/rendered.json").read_text())
    gallery_data = [{**shot, "video": "videos/" + video["video"]}
                    for shot, video in zip(shots, rendered["shots"])]
    if len(gallery_data) != len(specs) or any(s["name"] != v["shot"] for s, v in zip(shots, rendered["shots"])):
        raise RuntimeError("Rendered inventory does not match the capture inventory")
    gallery = (HERE / "gallery.html").read_text().replace("/* STUDY_DATA */[]", json.dumps(gallery_data))
    (out / "index.html").write_text(gallery)
    website = {"trainingSeed": 4, "firstTrainingSuccess": study["firstTrainingSuccess"],
               "captureSeedMode": "shared", "warmupFrames": 0, "checkpoints": [
                   {"steps": shot["steps"] or 0,
                    "label": "Untrained" if shot["steps"] is None else shot["stepsLabel"],
                    "file": video["video"], "escapes": shot["successes"], "seconds": shot["seconds"]}
                   for shot, video in zip(shots, rendered["shots"])]}
    write_json(out / "speed-evolution.json", website)
    write_json(out / "media-files.json", [{"name": v["video"],
               "bytes": (out / "videos" / v["video"]).stat().st_size,
               "sha256": digest(out / "videos" / v["video"])} for v in rendered["shots"]])
    print(f"Finished. Open {out / 'index.html'} to compare the checkpoints.")


if __name__ == "__main__":
    main()
