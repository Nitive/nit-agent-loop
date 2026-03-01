.PHONY: *

container_name=agent$(shell pwd | tr '/' '-' | tr '[:upper:]' '[:lower:]')

agent:
	docker build ./agent/ -t agent
	docker run --rm -it \
	  --name $(container_name) \
	  -v "$(PWD):/app" \
	  -v ./agent/tmp/:/tmp/ \
	  -v ./agent/.codex/:/home/me/.codex/ \
	  -v ./agent/.agents/:/app/.codex/ \
	  -v "$(HOME)/.codex/auth.json:/home/me/.codex/auth.json:ro" \
	  agent

attach:
	docker exec -it $(container_name) bash

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
