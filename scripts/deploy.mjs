import { spawnSync } from "node:child_process";
import os from "node:os";

const DEFAULT_TARGET = "ta:/home/ubuntu/nginx-blog/html/";
const DEFAULT_DEPLOY_PATH = "/home/ubuntu/nginx-blog/html/";

function resolveDeployTarget() {
  const host = process.env.DEPLOY_HOST?.trim();
  if (!host) {
    return {
      target: DEFAULT_TARGET,
      sshCommand: "ssh",
    };
  }

  const user = process.env.DEPLOY_USER?.trim() || "ubuntu";
  const port = process.env.DEPLOY_PORT?.trim() || "22";
  const deployPath = process.env.DEPLOY_PATH?.trim() || DEFAULT_DEPLOY_PATH;
  const rawKeyPath = process.env.DEPLOY_SSH_KEY_PATH?.trim();
  const keyPath = rawKeyPath?.startsWith("~/")
    ? `${os.homedir()}/${rawKeyPath.slice(2)}`
    : rawKeyPath;
  const sshArgs = [
    "ssh",
    "-p",
    port,
    "-o",
    "StrictHostKeyChecking=accept-new",
  ];

  if (keyPath) {
    sshArgs.push("-i", keyPath);
  }

  return {
    target: `${user}@${host}:${deployPath}`,
    sshCommand: sshArgs.join(" "),
  };
}

const { target, sshCommand } = resolveDeployTarget();
const result = spawnSync(
  "rsync",
  [
    "-avz",
    "--delete",
    "--chmod=Du=rwx,Dgo=rx,Fu=rw,Fgo=r",
    "-e",
    sshCommand,
    "dist/",
    target,
  ],
  {
    stdio: "inherit",
  },
);

process.exit(typeof result.status === "number" ? result.status : 1);
