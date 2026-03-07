FROM node:24

ARG DELTA_VERSION=0.18.2

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates git openssl ripgrep jq yq bash curl less openssh-client sudo bat && \
    arch="$(dpkg --print-architecture)" && \
    case "$arch" in amd64|arm64) ;; *) echo "Unsupported architecture for git-delta: $arch" >&2; exit 1 ;; esac && \
    curl -fsSL -o /tmp/git-delta.deb \
      "https://github.com/dandavison/delta/releases/download/${DELTA_VERSION}/git-delta_${DELTA_VERSION}_${arch}.deb" && \
    apt-get install -y --no-install-recommends /tmp/git-delta.deb && \
    rm -f /tmp/git-delta.deb

RUN corepack enable

ARG CODEX_VERSION=^0.111.0
RUN npm install -g @openai/codex@$CODEX_VERSION

ENV PNPM_HOME=/tmp/pnpm
ENV PATH="$PATH:/tmp/pnpm"

RUN userdel node && \
    groupadd --gid 1000 --system me && \
    useradd --uid 1000 --system --create-home --gid 1000 me && \
    echo "me ALL=NOPASSWD: ALL" >> /etc/sudoers


USER 1000:1000
WORKDIR /app

ENTRYPOINT ["/app/agent/start.sh"]
