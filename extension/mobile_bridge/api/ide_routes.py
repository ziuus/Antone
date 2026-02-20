"""
IDE management routes: file browser, terminal execution, git status, system info.
"""
import os
import subprocess
import asyncio
from pathlib import Path
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from ..services.auth import get_current_user
from ..models.agent_model import ApiResponse

router = APIRouter(prefix="/ide", tags=["ide"])

# ─── Helpers ─────────────────────────────────────────────────────────────────

def _safe_path(base: str, rel: str) -> Path:
    """Resolve a relative path safely within a base directory."""
    base_p = Path(base).resolve()
    target = (base_p / rel.lstrip("/")).resolve()
    if not str(target).startswith(str(base_p)):
        raise HTTPException(status_code=403, detail="Path traversal denied")
    return target

def _get_workspace() -> str:
    """Return the workspace root. Defaults to HOME."""
    return os.environ.get("ANTONE_WORKSPACE", os.path.expanduser("~"))

# ─── Workspaces ───────────────────────────────────────────────────────────────

@router.get("/workspaces", response_model=ApiResponse, dependencies=[Depends(get_current_user)])
async def list_workspaces():
    """List available workspaces (subdirectories of ~/Projects or current parent)."""
    current_ws = Path(_get_workspace()).resolve()
    
    # Try ~/Projects first, fallback to parent of current workspace
    projects_root = Path(os.path.expanduser("~/Projects")).resolve()
    if not projects_root.exists():
        projects_root = current_ws.parent

    workspaces = []
    if projects_root.exists() and projects_root.is_dir():
        for item in sorted(projects_root.iterdir()):
             if item.is_dir() and not item.name.startswith("."):
                 workspaces.append({
                     "name": item.name,
                     "path": str(item.resolve()),
                     "is_current": str(item.resolve()) == str(current_ws)
                 })
    
    return ApiResponse(status="success", data={"workspaces": workspaces, "root": str(projects_root)})

@router.post("/workspaces/switch", response_model=ApiResponse, dependencies=[Depends(get_current_user)])
async def switch_workspace(payload: dict):
    """Switch active workspace."""
    path = payload.get("path")
    if not path or not os.path.exists(path):
        raise HTTPException(status_code=400, detail="Invalid workspace path")
    
    os.environ["ANTONE_WORKSPACE"] = path
    return ApiResponse(status="success", message=f"Switched to workspace: {path}", data={"workspace": path})

# ─── File Browser ─────────────────────────────────────────────────────────────

IGNORED = {".git", "__pycache__", "node_modules", ".venv", "venv", ".DS_Store", "dist", "build", ".next"}

@router.get("/files", response_model=ApiResponse, dependencies=[Depends(get_current_user)])
async def list_files(path: str = Query(default="", description="Relative path from workspace root")):
    """List directory contents."""
    workspace = _get_workspace()
    target = _safe_path(workspace, path)

    if not target.exists():
        raise HTTPException(status_code=404, detail="Path not found")
    if not target.is_dir():
        raise HTTPException(status_code=400, detail="Path is not a directory")

    entries = []
    try:
        for item in sorted(target.iterdir(), key=lambda x: (not x.is_dir(), x.name.lower())):
            if item.name in IGNORED or item.name.startswith("."):
                continue
            stat = item.stat()
            entries.append({
                "name": item.name,
                "path": str(item.relative_to(Path(workspace).resolve())),
                "type": "directory" if item.is_dir() else "file",
                "size": stat.st_size if item.is_file() else None,
                "modified": stat.st_mtime,
                "extension": item.suffix.lstrip(".") if item.is_file() else None,
            })
    except PermissionError:
        raise HTTPException(status_code=403, detail="Permission denied")

    return ApiResponse(status="success", data={
        "path": str(target.relative_to(Path(workspace).resolve())) if str(target) != str(Path(workspace).resolve()) else "",
        "workspace": workspace,
        "entries": entries,
    })

@router.get("/files/read", response_model=ApiResponse, dependencies=[Depends(get_current_user)])
async def read_file(path: str = Query(..., description="Relative path from workspace root")):
    """Read a file's contents."""
    workspace = _get_workspace()
    target = _safe_path(workspace, path)

    if not target.exists():
        raise HTTPException(status_code=404, detail="File not found")
    if not target.is_file():
        raise HTTPException(status_code=400, detail="Path is not a file")

    # Size limit: 512KB
    if target.stat().st_size > 512 * 1024:
        raise HTTPException(status_code=413, detail="File too large (max 512KB)")

    try:
        content = target.read_text(encoding="utf-8", errors="replace")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return ApiResponse(status="success", data={
        "path": path,
        "name": target.name,
        "content": content,
        "lines": content.count("\n") + 1,
        "size": target.stat().st_size,
        "extension": target.suffix.lstrip("."),
    })

@router.post("/files/write", response_model=ApiResponse, dependencies=[Depends(get_current_user)])
async def write_file(payload: dict):
    """Write content to a file."""
    path = payload.get("path", "")
    content = payload.get("content", "")
    workspace = _get_workspace()
    target = _safe_path(workspace, path)

    if target.stat().st_size > 2 * 1024 * 1024 if target.exists() else False:
        raise HTTPException(status_code=413, detail="File too large to edit")

    try:
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding="utf-8")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return ApiResponse(status="success", message=f"Saved {path}")

# ─── Terminal ─────────────────────────────────────────────────────────────────

BLOCKED_COMMANDS = {"rm -rf /", "mkfs", "dd if=/dev/zero", ":(){ :|:& };:"}

@router.post("/terminal/run", response_model=ApiResponse, dependencies=[Depends(get_current_user)])
async def run_command(payload: dict):
    """Execute a shell command and return output."""
    command = payload.get("command", "").strip()
    cwd = payload.get("cwd", _get_workspace())

    if not command:
        raise HTTPException(status_code=400, detail="No command provided")

    # Basic safety check
    for blocked in BLOCKED_COMMANDS:
        if blocked in command:
            raise HTTPException(status_code=403, detail="Command blocked for safety")

    # Validate cwd
    cwd_path = _safe_path(_get_workspace(), cwd if not os.path.isabs(cwd) else "")
    if os.path.isabs(cwd):
        cwd_path = Path(cwd)

    try:
        proc = await asyncio.create_subprocess_shell(
            command,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=str(cwd_path),
            env={**os.environ, "TERM": "xterm-256color"},
        )
        try:
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=30.0)
        except asyncio.TimeoutError:
            proc.kill()
            return ApiResponse(status="error", message="Command timed out (30s limit)")

        return ApiResponse(status="success", data={
            "stdout": stdout.decode("utf-8", errors="replace"),
            "stderr": stderr.decode("utf-8", errors="replace"),
            "exit_code": proc.returncode,
            "command": command,
            "cwd": str(cwd_path),
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ─── Git ──────────────────────────────────────────────────────────────────────

async def _git(args: List[str], cwd: str) -> str:
    proc = await asyncio.create_subprocess_exec(
        "git", *args,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        cwd=cwd,
    )
    stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=10.0)
    return stdout.decode("utf-8", errors="replace").strip()

@router.get("/git/status", response_model=ApiResponse, dependencies=[Depends(get_current_user)])
async def git_status(path: str = Query(default="")):
    """Get git status for a directory."""
    workspace = _get_workspace()
    target = str(_safe_path(workspace, path))

    try:
        branch = await _git(["rev-parse", "--abbrev-ref", "HEAD"], target)
        status_raw = await _git(["status", "--porcelain"], target)
        log = await _git(["log", "--oneline", "-8"], target)
        remote = await _git(["remote", "get-url", "origin"], target)
        ahead_behind = await _git(["rev-list", "--left-right", "--count", "HEAD...@{u}"], target)
    except asyncio.TimeoutError:
        raise HTTPException(status_code=408, detail="Git command timed out")
    except Exception as e:
        return ApiResponse(status="error", message=f"Not a git repo or git error: {e}")

    # Parse status
    changed, staged, untracked = [], [], []
    for line in status_raw.splitlines():
        if not line.strip():
            continue
        xy, fname = line[:2], line[3:]
        if xy[0] in "MADRC":
            staged.append(fname)
        if xy[1] in "MD":
            changed.append(fname)
        if xy == "??":
            untracked.append(fname)

    # Parse ahead/behind
    ahead, behind = 0, 0
    if ahead_behind and "\t" in ahead_behind:
        parts = ahead_behind.split("\t")
        ahead, behind = int(parts[0]), int(parts[1])

    commits = []
    for line in log.splitlines():
        if line.strip():
            parts = line.split(" ", 1)
            commits.append({"hash": parts[0], "message": parts[1] if len(parts) > 1 else ""})

    return ApiResponse(status="success", data={
        "branch": branch,
        "remote": remote,
        "ahead": ahead,
        "behind": behind,
        "staged": staged,
        "changed": changed,
        "untracked": untracked,
        "is_clean": not (staged or changed or untracked),
        "recent_commits": commits,
    })

@router.post("/git/run", response_model=ApiResponse, dependencies=[Depends(get_current_user)])
async def git_run(payload: dict):
    """Run a safe git command."""
    command = payload.get("command", "").strip()
    path = payload.get("path", "")
    workspace = _get_workspace()
    target = str(_safe_path(workspace, path))

    # Only allow safe git subcommands
    ALLOWED = {"pull", "push", "add", "commit", "checkout", "stash", "fetch", "diff", "log", "status"}
    parts = command.split()
    if not parts or parts[0] not in ALLOWED:
        raise HTTPException(status_code=403, detail=f"Git command not allowed. Allowed: {', '.join(ALLOWED)}")

    try:
        proc = await asyncio.create_subprocess_exec(
            "git", *parts,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=target,
        )
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=30.0)
        return ApiResponse(status="success", data={
            "output": stdout.decode("utf-8", errors="replace"),
            "stderr": stderr.decode("utf-8", errors="replace"),
            "exit_code": proc.returncode,
        })
    except asyncio.TimeoutError:
        raise HTTPException(status_code=408, detail="Git command timed out")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ─── System Info ──────────────────────────────────────────────────────────────

@router.get("/system", response_model=ApiResponse, dependencies=[Depends(get_current_user)])
async def system_info():
    """Get system resource info."""
    try:
        import psutil
        cpu = psutil.cpu_percent(interval=0.5)
        mem = psutil.virtual_memory()
        disk = psutil.disk_usage(_get_workspace())
        return ApiResponse(status="success", data={
            "cpu_percent": cpu,
            "memory": {"total": mem.total, "used": mem.used, "percent": mem.percent},
            "disk": {"total": disk.total, "used": disk.used, "free": disk.free, "percent": disk.percent},
            "workspace": _get_workspace(),
        })
    except ImportError:
        # psutil not available, use basic info
        result = subprocess.run(["df", "-h", _get_workspace()], capture_output=True, text=True)
        return ApiResponse(status="success", data={
            "cpu_percent": None,
            "memory": None,
            "disk_raw": result.stdout,
            "workspace": _get_workspace(),
        })
