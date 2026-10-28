# SSH to the origin via Cloudflare Tunnel

Status: manual runbook. `scripts/cloudflare-tunnel-setup.js` only publishes HTTP ingress and does not create an SSH route. Nothing here is automated yet.

Goal: reach the origin over SSH from Termux (Android) without exposing port 22 or the origin IP. The connection goes through Cloudflare Access, which requires an identity check before the TCP stream reaches sshd.

## Preconditions

- `scripts/cloudflare-tunnel-setup.js --apply` has run, and the tunnel connector (`cloudflared`) is running on the origin.
- sshd is running on the origin and listens on `localhost:22`.
- The origin's firewall does not allow public inbound 22 (verify in step 6).

## Hostnames

| Hostname | Purpose | Record |
|---|---|---|
| `origin.djjessejay.ch` | HTTP ingress for the Worker (service token) | Proxied CNAME to the tunnel, created by the setup script |
| `ssh.djjessejay.ch` | SSH ingress for Termux (human identity) | Proxied CNAME to the same tunnel, created in step 2 |

Do not use the apex or `www` for SSH. Do not create an A record for the origin IP.

## Step 1: Origin prerequisites

On the origin:

    sudo systemctl status ssh || sudo systemctl status sshd
    sudo sshd -T | grep -E '^(passwordauthentication|pubkeyauthentication|permitrootlogin) '

Expected: `pubkeyauthentication yes`, `passwordauthentication no`, `permitrootlogin no`. If password login is still enabled, disable it before exposing SSH through the tunnel.

## Step 2: Public hostname for SSH

Cloudflare dashboard, Zero Trust, Networks, Tunnels, the tunnel `djjessejay-origin`, Public Hostname, Add:

- Subdomain: `ssh`, Domain: `djjessejay.ch`
- Service type: `SSH`
- URL: `localhost:22`

This creates the proxied CNAME `ssh.djjessejay.ch` to the tunnel. The existing HTTP ingress for `origin.djjessejay.ch` is not changed.

## Step 3: Access application with an identity policy

Zero Trust, Access, Applications, Add, Self-hosted:

- Application domain: `ssh.djjessejay.ch`
- Session duration: 8h or shorter
- Policy: Action `Allow`, Include `Emails` = the single operator address. No service token on this app.

Do not reuse the service-token-only app created for `origin.djjessejay.ch`. That app admits only the Worker.

## Step 4: Termux client

In Termux:

    pkg install openssh cloudflared
    ssh -o ProxyCommand="cloudflared access ssh --hostname ssh.djjessejay.ch" <origin-user>@ssh.djjessejay.ch

The first run opens a browser login for Access. The token is cached locally by cloudflared.

Replace `<origin-user>` with the Linux account on the origin. This is not the Termux username `termux`, unless an account with that name exists on the origin.

Optional `~/.ssh/config` entry:

    Host origin-ssh
        HostName ssh.djjessejay.ch
        User <origin-user>
        IdentityFile ~/.ssh/id_ed25519
        ProxyCommand cloudflared access ssh --hostname %h

## Step 5: Install the Termux public key on the origin

Run on the origin as the target user, pasting the public key from Termux (`cat ~/.ssh/id_ed25519.pub`):

    mkdir -p ~/.ssh && chmod 700 ~/.ssh
    echo 'ssh-ed25519 <PUBLIC KEY> termux@djjessejay.ch' >> ~/.ssh/authorized_keys
    chmod 600 ~/.ssh/authorized_keys

The public key is not secret. The private key never leaves Termux. The Termux key is passphrase-protected.

## Step 6: Verify and close the direct path

From Termux:

    ssh -o ProxyCommand="cloudflared access ssh --hostname ssh.djjessejay.ch" <origin-user>@ssh.djjessejay.ch 'echo ok && hostname'

Expected: `ok` and the origin hostname. Then from a network outside the origin's LAN, confirm that the direct path is closed:

    nc -zv -w 5 <origin-ip> 22

Expected: connection refused or timed out. If it connects, restrict 22 at the host and cloud firewall to localhost or remove the rule. The IP path is only a temporary fallback during the bootstrap, and it should be closed once step 6 passes.

## Troubleshooting

- `Could not resolve hostname ssh.djjessejay.ch`: step 2 is missing, or the tunnel is not applied.
- `cloudflared access ssh` loops on login: the Access policy does not include the operator email, or the identity provider is not enabled for the app.
- `channel 0: open failed: connect failed`: cloudflared on the origin cannot reach `localhost:22`. Check sshd and the service value `localhost:22`.
- `Permission denied (publickey)`: the public key is not in `authorized_keys` of `<origin-user>`, or permissions on `~/.ssh` are too open.

## Not covered

- Automating step 2 and step 3 in `cloudflare-tunnel-setup.js` (would need an SSH ingress type and an email-based Access app option).
- Key rotation and a second operator key.
