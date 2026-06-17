#!/usr/bin/env bash
# storage.sh — interview-feedback storage layer (pmos-managerkit)
# bash-3.2-safe; no associative arrays, no ${var^^}.
set -euo pipefail

SELF="${BASH_SOURCE[0]:-$0}"
# Resolve script dir with a fallback (BASH_SOURCE may be empty when sourced
# from a non-canonical path).
if [ -n "${SELF}" ] && [ -e "${SELF}" ]; then
  SCRIPT_DIR="$(cd "$(dirname "${SELF}")" >/dev/null 2>&1 && pwd)"
  SELF_ABS="${SCRIPT_DIR}/$(basename "${SELF}")"
else
  SCRIPT_DIR="$(pwd)"
  SELF_ABS="${SELF}"
fi
export SCRIPT_DIR SELF_ABS

DEFAULT_ROOT="./interviews/"
SETTINGS_FILE=".pmos/settings.yaml"
SETTINGS_KEY="managerkit.interview_root"

die() {
  printf 'FAIL: %s\n' "$*" >&2
  exit 1
}

# Convert a possibly-relative path to absolute. Creates nothing.
abspath() {
  _ap_in="$1"
  case "${_ap_in}" in
    /*) printf '%s\n' "${_ap_in}" ;;
    *)  printf '%s/%s\n' "$(pwd)" "${_ap_in}" ;;
  esac
}

# Grep-parse `managerkit.interview_root` from .pmos/settings.yaml.
# Tolerates a flat `managerkit.interview_root: <val>` line OR a nested
# `interview_root: <val>` under a `managerkit:` block. Prints value or nothing.
parse_settings_root() {
  _ps_file="$1"
  [ -f "${_ps_file}" ] || return 0

  # 1) Flat dotted key.
  _ps_val="$(grep -E "^[[:space:]]*${SETTINGS_KEY}[[:space:]]*:" "${_ps_file}" 2>/dev/null \
    | head -n 1 \
    | sed -E "s/^[[:space:]]*${SETTINGS_KEY}[[:space:]]*:[[:space:]]*//" \
    | sed -E 's/[[:space:]]*$//' \
    | sed -E "s/^['\"]//; s/['\"]$//")"
  if [ -n "${_ps_val}" ]; then
    printf '%s\n' "${_ps_val}"
    return 0
  fi

  # 2) Nested: interview_root under managerkit:.
  _ps_val="$(awk '
    /^[[:space:]]*managerkit[[:space:]]*:/ { inblk=1; next }
    /^[^[:space:]]/ { inblk=0 }
    inblk && /^[[:space:]]*interview_root[[:space:]]*:/ {
      sub(/^[[:space:]]*interview_root[[:space:]]*:[[:space:]]*/, "")
      sub(/[[:space:]]*$/, "")
      gsub(/^['\''"]|['\''"]$/, "")
      print
      exit
    }
  ' "${_ps_file}" 2>/dev/null)"
  if [ -n "${_ps_val}" ]; then
    printf '%s\n' "${_ps_val}"
    return 0
  fi

  return 0
}

# Install/refresh a .gitignore guard for the storage root, if inside a git repo.
# Best-effort: warn + continue if .gitignore is unwritable.
install_gitignore_guard() {
  _ig_root_abs="$1"

  git rev-parse --is-inside-work-tree >/dev/null 2>&1 || return 0

  _ig_toplevel="$(git rev-parse --show-toplevel 2>/dev/null || true)"
  [ -n "${_ig_toplevel}" ] || return 0

  # Compute the guard line: prefer a path relative to repo top, else basename/.
  case "${_ig_root_abs}" in
    "${_ig_toplevel}/"*)
      _ig_rel="${_ig_root_abs#${_ig_toplevel}/}"
      ;;
    *)
      _ig_rel="$(basename "${_ig_root_abs}")"
      ;;
  esac
  # Normalize: strip trailing slash, then re-add one (dir ignore).
  _ig_rel="${_ig_rel%/}"
  _ig_line="${_ig_rel}/"

  _ig_file="${_ig_toplevel}/.gitignore"

  # Already present? (exact line match)
  if [ -f "${_ig_file}" ] && grep -qxF "${_ig_line}" "${_ig_file}" 2>/dev/null; then
    return 0
  fi

  # Try to append. Guard writability.
  if [ -e "${_ig_file}" ] && [ ! -w "${_ig_file}" ]; then
    printf 'WARN: could not install gitignore guard\n' >&2
    return 0
  fi
  if [ ! -e "${_ig_file}" ]; then
    # Need to be able to create in the dir.
    if [ ! -w "${_ig_toplevel}" ]; then
      printf 'WARN: could not install gitignore guard\n' >&2
      return 0
    fi
  fi

  if printf '%s\n' "${_ig_line}" >> "${_ig_file}" 2>/dev/null; then
    return 0
  else
    printf 'WARN: could not install gitignore guard\n' >&2
    return 0
  fi
}

# ---- subcommands -----------------------------------------------------------

cmd_resolve_root() {
  _rr_root=""
  # Parse --root <path>.
  while [ "$#" -gt 0 ]; do
    case "$1" in
      --root)
        shift
        [ "$#" -gt 0 ] || die "resolve-root: --root requires a path"
        _rr_root="$1"
        ;;
      --root=*)
        _rr_root="${1#--root=}"
        ;;
      *)
        die "resolve-root: unknown arg '$1'"
        ;;
    esac
    shift
  done

  # Precedence: --root → IFB_ROOT → settings → default.
  if [ -z "${_rr_root}" ]; then
    if [ -n "${IFB_ROOT:-}" ]; then
      _rr_root="${IFB_ROOT}"
    fi
  fi
  if [ -z "${_rr_root}" ]; then
    _rr_root="$(parse_settings_root "${SETTINGS_FILE}")"
  fi
  if [ -z "${_rr_root}" ]; then
    _rr_root="${DEFAULT_ROOT}"
  fi

  _rr_abs="$(abspath "${_rr_root}")"
  mkdir -p "${_rr_abs}"
  # Re-resolve through the now-existing dir to canonicalize.
  _rr_abs="$(cd "${_rr_abs}" && pwd)"

  install_gitignore_guard "${_rr_abs}"

  printf '%s\n' "${_rr_abs}"
}

cmd_new_candidate() {
  [ "$#" -ge 3 ] || die "new-candidate: usage: new-candidate <role-dir> <round> <candidate>"
  _nc_role_dir="$1"
  _nc_round="$2"
  _nc_candidate="$3"

  [ -n "${_nc_role_dir}" ] || die "new-candidate: role-dir is empty"
  [ -n "${_nc_round}" ]    || die "new-candidate: round is empty"
  [ -n "${_nc_candidate}" ] || die "new-candidate: candidate is empty"

  _nc_cand_dir="${_nc_role_dir}/${_nc_round}-${_nc_candidate}"
  mkdir -p "${_nc_cand_dir}/inputs"
  printf '%s\n' "${_nc_cand_dir}"
}

cmd_write_role_json() {
  [ "$#" -ge 1 ] || die "write-role-json: usage: write-role-json <role-dir>"
  _wr_role_dir="$1"
  [ -n "${_wr_role_dir}" ] || die "write-role-json: role-dir is empty"

  _wr_payload="$(cat)"
  if [ -z "${_wr_payload}" ]; then
    die "write-role-json: empty payload on stdin"
  fi

  mkdir -p "${_wr_role_dir}/role"
  _wr_path="${_wr_role_dir}/role/role.json"
  printf '%s\n' "${_wr_payload}" > "${_wr_path}"
  printf '%s\n' "${_wr_path}"
}

# ---- selftest --------------------------------------------------------------

cmd_selftest() {
  _st_pass=0
  _st_total=0
  _st_tmp="$(mktemp -d 2>/dev/null)" || die "selftest: mktemp failed"
  trap 'rm -rf "${_st_tmp}"' EXIT

  check() {
    _st_total=$((_st_total + 1))
    if [ "$1" = "ok" ]; then
      _st_pass=$((_st_pass + 1))
    else
      printf 'FAIL: selftest case %d: %s\n' "${_st_total}" "$2" >&2
      rm -rf "${_st_tmp}"
      trap - EXIT
      exit 1
    fi
  }

  # Run subtests in a NON-git subdir so default-root + gitignore behave cleanly.
  _st_base="${_st_tmp}/work"
  mkdir -p "${_st_base}"

  # (1) resolve-root default is ./interviews/ absolute and exists.
  (
    cd "${_st_base}"
    unset IFB_ROOT
    "${SELF_ABS}" resolve-root
  ) > "${_st_tmp}/out1" 2>/dev/null || check fail "resolve-root default exited non-zero"
  _st_r1="$(cat "${_st_tmp}/out1")"
  case "${_st_r1}" in
    /*) : ;;
    *) check fail "default root not absolute: ${_st_r1}" ;;
  esac
  [ "${_st_r1}" = "${_st_base}/interviews" ] || check fail "default root unexpected: ${_st_r1}"
  [ -d "${_st_r1}" ] || check fail "default root dir not created: ${_st_r1}"
  check ok "resolve-root default"

  # (2) --root override wins (over IFB_ROOT env).
  _st_override="${_st_tmp}/override-root"
  (
    cd "${_st_base}"
    IFB_ROOT="${_st_tmp}/env-root" "${SELF_ABS}" resolve-root --root "${_st_override}"
  ) > "${_st_tmp}/out2" 2>/dev/null || check fail "resolve-root --root exited non-zero"
  _st_r2="$(cat "${_st_tmp}/out2")"
  [ "${_st_r2}" = "${_st_override}" ] || check fail "--root override did not win: ${_st_r2}"
  [ -d "${_st_override}" ] || check fail "--root dir not created"
  [ ! -d "${_st_tmp}/env-root" ] || check fail "IFB_ROOT should have been ignored"
  check ok "--root override wins"

  # (3) gitignore guard present after resolve-root inside a git repo.
  _st_repo="${_st_tmp}/repo"
  mkdir -p "${_st_repo}"
  (
    cd "${_st_repo}"
    git init -q . >/dev/null 2>&1
    unset IFB_ROOT
    "${SELF_ABS}" resolve-root --root "${_st_repo}/interviews"
  ) > "${_st_tmp}/out3" 2>/dev/null || check fail "resolve-root in git repo exited non-zero"
  if [ -f "${_st_repo}/.gitignore" ] && grep -qxF "interviews/" "${_st_repo}/.gitignore"; then
    check ok "gitignore guard present"
  else
    check fail "gitignore guard line 'interviews/' not found"
  fi

  # (4) new-candidate creates inputs/.
  _st_role="${_st_tmp}/2026-06-17-staff-pm"
  _st_cand="$("${SELF_ABS}" new-candidate "${_st_role}" "r1" "jane-doe")" \
    || check fail "new-candidate exited non-zero"
  [ "${_st_cand}" = "${_st_role}/r1-jane-doe" ] || check fail "new-candidate path unexpected: ${_st_cand}"
  [ -d "${_st_cand}/inputs" ] || check fail "new-candidate inputs/ not created"
  check ok "new-candidate creates inputs/"

  # (5) write-role-json round-trips {"role":"x"}.
  _st_rolj="$(printf '%s' '{"role":"x"}' | "${SELF_ABS}" write-role-json "${_st_role}")" \
    || check fail "write-role-json exited non-zero"
  [ "${_st_rolj}" = "${_st_role}/role/role.json" ] || check fail "write-role-json path unexpected: ${_st_rolj}"
  [ -f "${_st_rolj}" ] || check fail "role.json not written"
  _st_rj_content="$(cat "${_st_rolj}")"
  case "${_st_rj_content}" in
    *'{"role":"x"}'*) : ;;
    *) check fail "role.json content mismatch: ${_st_rj_content}" ;;
  esac
  check ok "write-role-json round-trip"

  rm -rf "${_st_tmp}"
  trap - EXIT
  printf 'storage.sh selftest: %d/%d PASS\n' "${_st_pass}" "${_st_total}"
  exit 0
}

# ---- dispatch --------------------------------------------------------------

main() {
  [ "$#" -ge 1 ] || die "usage: storage.sh <resolve-root|new-candidate|write-role-json|--selftest> [args]"
  _cmd="$1"
  shift
  case "${_cmd}" in
    resolve-root)    cmd_resolve_root "$@" ;;
    new-candidate)   cmd_new_candidate "$@" ;;
    write-role-json) cmd_write_role_json "$@" ;;
    --selftest|selftest) cmd_selftest ;;
    *) die "unknown subcommand: ${_cmd}" ;;
  esac
}

main "$@"
