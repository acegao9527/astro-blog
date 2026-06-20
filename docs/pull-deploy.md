# Pull Deploy

This server-side pull deploy path is retired for routine publishing. The current routine path is driven by the blog repository's `blog-website-publish` skill:

```text
blog-website-publish skill
  -> local Astro build with BLOG_SOURCE=directory and BLOG_DIR=/Users/acelee/workspace/blog
  -> DEPLOY_ENABLE_DIRECT=1 npm run deploy
```

Keep the notes below only for operating the old server-side pull-deploy script manually.

## Flow

```text
blog push
  -> ta Hermes cron fetches astro-blog and blog source repos
  -> ta builds Astro locally
  -> rsync release into /home/ubuntu/nginx-blog/html/
```

## Server Files

- `/usr/local/bin/astro-blog-pull-deploy`
- `/home/ubuntu/astro-blog-src/.env`
- `/etc/systemd/system/astro-blog-pull-deploy.service`
- `/home/ubuntu/.hermes/scripts/astro_blog_deploy_check.py`
- `/home/ubuntu/.hermes/cron/jobs.json`
- `/home/ubuntu/astro-blog-src`
- `/home/ubuntu/blog-src`
- `/home/ubuntu/nginx-blog/releases`
- `/home/ubuntu/nginx-blog/.deployed-source-state`
- `/home/ubuntu/nginx-blog/.deployed-posts.json`

The ta server uses read-only GitHub deploy keys over `ssh.github.com:443` for both private repositories. GitHub Actions is disabled for this deploy path.

Use `.env.example` as the source of truth for the server environment variables. The production `.env` should live beside the checked-out Astro project at `/home/ubuntu/astro-blog-src/.env`, not under `/etc`.

## Operations

Check the Hermes cron job:

```bash
hermes cron list
hermes cron status
```

Run one deployment immediately:

```bash
hermes cron run b8c998d627b1
hermes cron tick
```

Read logs:

```bash
journalctl -u astro-blog-pull-deploy.service -n 100 --no-pager
```

The service is idempotent. If the latest `astro-blog` and `blog` commits are already deployed, it only runs the healthcheck.

The Hermes cron job is named `astro-blog deploy watcher`. Its pre-run script uses Hermes' wake-gate convention: no-change runs end with `{"wakeAgent": false}`, so Hermes skips the agent and sends no notification.

Notification rules:

- Deployment failures always wake Hermes and deliver a Feishu notification.
- Successful deployments only wake Hermes when the deployed post slug set changes.
- Source-only changes, style changes, script changes, and edits to existing posts deploy silently when the article set is unchanged.
- The post snapshot is read from the generated `dist/post/*/index.html` output and persisted in `/home/ubuntu/nginx-blog/.deployed-posts.json`.
- A slug change is reported as one removed post and one added post.
