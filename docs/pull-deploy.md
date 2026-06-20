# Pull Deploy

The production deploy path no longer lets GitHub-hosted runners SSH into the ta server.

## Flow

```text
blog push
  -> repository_dispatch
  -> astro-blog GitHub Actions build validation
  -> ta systemd timer fetches astro-blog and blog source repos
  -> ta builds Astro locally
  -> rsync release into /home/ubuntu/nginx-blog/html/
```

## Server Files

- `/usr/local/bin/astro-blog-pull-deploy`
- `/home/ubuntu/astro-blog-src/.env`
- `/etc/systemd/system/astro-blog-pull-deploy.service`
- `/etc/systemd/system/astro-blog-pull-deploy.timer`
- `/home/ubuntu/astro-blog-src`
- `/home/ubuntu/blog-src`
- `/home/ubuntu/nginx-blog/releases`
- `/home/ubuntu/nginx-blog/.deployed-source-state`

The ta server uses read-only GitHub deploy keys over `ssh.github.com:443` for both private repositories. GitHub-hosted runners no longer SSH into ta.

Use `.env.example` as the source of truth for the server environment variables. The production `.env` should live beside the checked-out Astro project at `/home/ubuntu/astro-blog-src/.env`, not under `/etc`.

## Operations

Check the timer:

```bash
systemctl status astro-blog-pull-deploy.timer
```

Run one deployment immediately:

```bash
sudo systemctl start astro-blog-pull-deploy.service
```

Read logs:

```bash
journalctl -u astro-blog-pull-deploy.service -n 100 --no-pager
```

The service is idempotent. If the latest `deploy-artifacts` commit is already deployed, it only runs the healthcheck.
