.PHONY: *

container_name ?= agent$(shell pwd | tr '/' '-' | tr '[:upper:]' '[:lower:]')
compose := USER_ID=$$(id -u) GROUP_ID=$$(id -g) CONTAINER_NAME=$(container_name) HOST_CODEX_AUTH="$(HOME)/.codex/auth.json" docker compose -f docker-compose.yaml

agent-start-in-docker:
	@ echo Building docker image for agent...
	@ $(compose) build agent

	@ echo Running and configuring container with agent environment...
	@ $(compose) up -d --force-recreate --remove-orphans agent
	@ $(compose) logs -f agent | ./agent/wait-for-start.sh

check-agent:
	@ if [ "$$(docker inspect $(container_name) 2>/dev/null | jq -r '.[].State.Status')" != "running" ]; then \
	  $(MAKE) agent-start-in-docker; \
	fi

agent: check-agent
	$(compose) exec -it agent bash -ic 'codex resume'

bash:
	kitten ssh -i "$(PWD)/agent/.ssh/id" ubuntu@127.0.0.1 -p 2255 \
	  -o UserKnownHostsFile=$(PWD)/agent/.ssh/container-known-hosts -o IdentitiesOnly=yes

install:
	pnpm install

start:
	pnpm exec tsx src/index.tsx

build:
	pnpm exec tsc -p .

lint:
	pnpm exec eslint .

lint-fix:
	pnpm exec eslint . --fix

format:
	pnpm exec prettier . --write

format-check:
	pnpm exec prettier . --check

test:
	pnpm exec vitest run

test-watch:
	pnpm exec vitest
