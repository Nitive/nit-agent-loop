FROM ubuntu:24.04

ARG DELTA_VERSION=0.18.2

# Install common dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    ca-certificates git openssl ripgrep jq yq bash curl less openssh-client \
    openssh-server sudo bat kitty kitty-terminfo vim socat

ARG USER_ID=1000
ARG GROUP_ID=1000

RUN (groupdel "$(id -ng $GROUP_ID)" || echo -n) && \
    (userdel "$(id -nu $USER_ID)" || echo -n) && \
    groupadd --gid $GROUP_ID --system ubuntu && \
    useradd --uid $USER_ID -s /bin/bash --system --create-home --gid $GROUP_ID ubuntu && \
    echo "ubuntu ALL=NOPASSWD: ALL" >> /etc/sudoers

USER $USER_ID:$GROUP_ID
WORKDIR /app

# Install delta
RUN arch="$(dpkg --print-architecture)" && \
    case "$arch" in amd64|arm64) ;; *) echo "Unsupported architecture for git-delta: $arch" >&2; exit 1 ;; esac && \
    curl -fsSL -o /tmp/git-delta.deb \
      "https://github.com/dandavison/delta/releases/download/${DELTA_VERSION}/git-delta_${DELTA_VERSION}_${arch}.deb" && \
    sudo apt-get install -y /tmp/git-delta.deb && \
    rm -f /tmp/git-delta.deb

# Install mise
RUN sudo install -dm 755 /etc/apt/keyrings && \
    curl -fSs https://mise.jdx.dev/gpg-key.pub | sudo tee /etc/apt/keyrings/mise-archive-keyring.asc 1> /dev/null && \
    echo "deb [signed-by=/etc/apt/keyrings/mise-archive-keyring.asc] https://mise.jdx.dev/deb stable main" | sudo tee /etc/apt/sources.list.d/mise.list && \
    sudo apt update -y && \
    sudo apt install -y mise

ENV HOME="/home/ubuntu"
ENV PNPM_HOME="$HOME/.local/pnpm/bin"
ENV LOCAL_BIN="$HOME/.local/bin"
ENV PATH="$PATH:$LOCAL_BIN:$PNPM_HOME"
ENV TERM=xterm-kitty

HEALTHCHECK --start-interval=1s CMD ["cat", "/ctmp/started"]

ENTRYPOINT ["/app/agent/start.sh"]
