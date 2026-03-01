FROM node:24

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates git openssl ripgrep jq yq bash curl less openssh-client sudo

RUN corepack enable
RUN npm install -g @openai/codex

ENV PNPM_HOME=/tmp/pnpm
ENV PATH="$PATH:/tmp/pnpm"

RUN userdel node && \
    groupadd --gid 1000 --system me && \
    useradd --uid 1000 --system --create-home --gid 1000 me && \
    echo "me ALL=NOPASSWD: ALL" >> /etc/sudoers


USER 1000:1000
WORKDIR /app

ENTRYPOINT ["codex"]
