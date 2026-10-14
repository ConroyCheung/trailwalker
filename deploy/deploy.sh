# 毅行者 PWA → https://trailwalker.conroycheung.com
#
# Prod: root@103.11.101.209（Caddy fragment + /var/www/trailwalker）
# DNS: Cloudflare A `trailwalker` → 103.11.101.209，建議 DNS only（灰雲），同其他 conroycheung.com 子域一致。

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOST="${DEPLOY_HOST:-root@103.11.101.209}"
KEY="${DEPLOY_KEY:-$HOME/.ssh/id_ed25519}"
WEBROOT="/var/www/trailwalker"
CADDY_FRAG="/etc/caddy/trailwalker.caddyfile"

cd "$ROOT"
npm run build

ssh -i "$KEY" "$HOST" "mkdir -p $WEBROOT"
scp -i "$KEY" -r "$ROOT/dist/"* "$HOST:$WEBROOT/"
scp -i "$KEY" "$ROOT/deploy/Caddyfile.trailwalker" "$HOST:$CADDY_FRAG"

ssh -i "$KEY" "$HOST" "bash /var/www/upscalphk/prod/deploy/assemble-caddyfile.sh && caddy validate --config /etc/caddy/Caddyfile && systemctl reload caddy"

echo "Deployed: https://trailwalker.conroycheung.com"
