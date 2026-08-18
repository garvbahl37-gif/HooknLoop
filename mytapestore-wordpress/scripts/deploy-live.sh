#!/usr/bin/env bash
#
# Put the theme on mytapestore.com.au. THEME ONLY.
#
#   scripts/deploy-live.sh --dry-run     show exactly what would change
#   scripts/deploy-live.sh               do it
#   scripts/deploy-live.sh --rollback    restore the previous theme
#
# WHAT THIS DOES NOT TOUCH, AND WHY THAT IS THE WHOLE DESIGN
#
#   the database   orders, customers, passwords, prices, every WooCommerce
#                  setting. Untouched. The live catalogue stays the source of
#                  truth for pricing, which is what retires the price-parity
#                  risk entirely.
#   plugins        Stripe and PayPal are already installed and credentialled on
#                  live. Not touching them is precisely how payments keep
#                  working through the cutover — there is nothing to reconnect.
#   uploads        media stays where it is.
#
# So the blast radius is one directory: wp-content/themes/mytapestore. If the
# result is wrong, --rollback puts the previous copy back and the store is as it
# was. Nothing here can lose an order.
#
# THE BACKUP IS TAKEN BEFORE ANYTHING IS WRITTEN, and the deploy aborts if it
# fails. A deploy you cannot undo is not a deploy, it is a gamble.

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
THEME="$HERE/theme"
ENV_FILE="$HERE/.env"

MODE="deploy"
[ "${1:-}" = "--dry-run" ] && MODE="dry"
[ "${1:-}" = "--rollback" ] && MODE="rollback"

say()  { printf '\n\033[1m%s\033[0m\n' "$*"; }
die()  { printf '\033[31m%s\033[0m\n' "$*" >&2; exit 1; }
ok()   { printf '\033[32m  %s\033[0m\n' "$*"; }

# --- credentials -------------------------------------------------------------
# Read from .env, which is git-ignored. Never passed on the command line, where
# they would land in shell history.
[ -f "$ENV_FILE" ] || die "no .env at $ENV_FILE"
set -a; . "$ENV_FILE"; set +a

: "${SFTP_HOST:=}" ; : "${SFTP_USER:=}" ; : "${SFTP_PORT:=22}"
: "${SFTP_PATH:=}"

if [ -z "$SFTP_HOST" ] || [ -z "$SFTP_USER" ] || [ -z "$SFTP_PATH" ]; then
  cat >&2 <<'MSG'
Deployment is not configured yet. Add these to mytapestore-wordpress/.env:

  SFTP_HOST=your-server.example.com
  SFTP_PORT=22
  SFTP_USER=your-ssh-user
  SFTP_PATH=/home/USER/public_html          # the WordPress root on the server

AUTHENTICATION IS BY SSH KEY, not password. rsync cannot take a password
non-interactively without sshpass, and a password in a script is worse than the
inconvenience of a key. Set one up once:

  ssh-keygen -t ed25519 -C "mytapestore-deploy"
  ssh-copy-id -p 22 your-ssh-user@your-server.example.com

Then re-run this script.
MSG
  exit 1
fi

SSH="ssh -p $SFTP_PORT -o BatchMode=yes"
REMOTE="$SFTP_USER@$SFTP_HOST"
REMOTE_THEME="$SFTP_PATH/wp-content/themes/mytapestore"
BACKUP_ROOT="$SFTP_PATH/wp-content/mts-theme-backups"

# --- rollback ----------------------------------------------------------------
if [ "$MODE" = "rollback" ]; then
  say "rolling back"
  LATEST=$($SSH "$REMOTE" "ls -1t '$BACKUP_ROOT' 2>/dev/null | head -1") || die "cannot reach $REMOTE"
  [ -n "$LATEST" ] || die "no backups found in $BACKUP_ROOT"
  echo "  restoring $LATEST"
  $SSH "$REMOTE" "rm -rf '$REMOTE_THEME' && cp -a '$BACKUP_ROOT/$LATEST' '$REMOTE_THEME'"
  ok "restored — the store is on the previous theme"
  exit 0
fi

# --- gate --------------------------------------------------------------------
# The pre-flight is not advisory. It knows about the gateway guard and the
# stylesheet allowlist, and those are the two ways this theme could hurt a live
# store.
say "1/5  pre-flight"
"$HERE/scripts/preflight-live.sh" >/tmp/mts-preflight.log 2>&1 || {
  cat /tmp/mts-preflight.log
  die "pre-flight failed — nothing was sent"
}
ok "$(grep -E 'SAFE TO DEPLOY|NOT READY' /tmp/mts-preflight.log | tail -1)"

say "2/5  reaching the server"
$SSH "$REMOTE" "test -d '$SFTP_PATH/wp-content/themes'" \
  || die "cannot reach $REMOTE or $SFTP_PATH is not a WordPress root"
ok "connected, WordPress root confirmed"

# --- backup ------------------------------------------------------------------
STAMP="$(date +%Y%m%d-%H%M%S)"
if [ "$MODE" = "deploy" ]; then
  say "3/5  backing up the current theme"
  $SSH "$REMOTE" "mkdir -p '$BACKUP_ROOT' && { [ -d '$REMOTE_THEME' ] && cp -a '$REMOTE_THEME' '$BACKUP_ROOT/$STAMP' || true; }" \
    || die "backup failed — refusing to deploy without one"
  ok "backed up to mts-theme-backups/$STAMP"
else
  say "3/5  backup (skipped — dry run)"
fi

# --- send --------------------------------------------------------------------
say "4/5  sending the theme"
RSYNC_FLAGS=(-az --delete --human-readable
  --exclude '.DS_Store' --exclude '.git' --exclude 'node_modules')
[ "$MODE" = "dry" ] && RSYNC_FLAGS+=(--dry-run --itemize-changes)

# --delete is deliberate: a file removed here must be removed there, or an old
# template keeps rendering. The backup above is what makes that safe.
rsync "${RSYNC_FLAGS[@]}" -e "$SSH" "$THEME/" "$REMOTE:$REMOTE_THEME/"

if [ "$MODE" = "dry" ]; then
  say "dry run only — nothing was changed"
  echo "  run again without --dry-run to deploy"
  exit 0
fi
ok "theme uploaded"

# --- verify ------------------------------------------------------------------
say "5/5  verifying"
for path in "" "foam-tape/" "checkout/"; do
  CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 30 "https://mytapestore.com.au/$path" || echo 000)
  printf '  /%-14s %s\n' "$path" "$CODE"
  case "$CODE" in
    200|301|302) ;;
    *) printf '\033[31m  %s\033[0m\n' "UNEXPECTED — consider: scripts/deploy-live.sh --rollback" ;;
  esac
done

# The single most important post-deploy question: is the real Stripe gateway
# still the one serving checkout, or did a placeholder displace it?
say "checkout gateway check"
echo "  Open https://mytapestore.com.au/checkout/ with something in the cart and confirm"
echo "  the card fields render. If they do not, roll back immediately:"
echo "      scripts/deploy-live.sh --rollback"

say "done"
echo "  rollback at any time:  scripts/deploy-live.sh --rollback"
