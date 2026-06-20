# Pull Deploy

The production deploy path no longer lets GitHub-hosted runners SSH into the ta server.

## Flow

```text
blog push
  -> repository_dispatch
  -> astro-blog GitHub Actions build
  -> upload dist artifact
  -> force-push deploy-artifacts branch
  -> ta systemd timer pulls deploy-artifacts
  -> rsync release into /home/ubuntu/nginx-blog/html/
```

## Server Files

- `/usr/local/bin/astro-blog-pull-deploy`
- `/etc/astro-blog-pull-deploy.env`
- `/etc/systemd/system/astro-blog-pull-deploy.service`
- `/etc/systemd/system/astro-blog-pull-deploy.timer`
- `/home/ubuntu/.ssh/astro_blog_deploy_key`
- `/home/ubuntu/nginx-blog/deploy-source`
- `/home/ubuntu/nginx-blog/releases`
- `/home/ubuntu/nginx-blog/.deployed-artifact-commit`

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
