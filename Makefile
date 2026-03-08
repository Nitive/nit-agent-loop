.PHONY: *

container_name ?= agent$(shell pwd | tr '/' '-' | tr '[:upper:]' '[:lower:]')

agent-start-in-docker:
	@ echo Building docker image for agent...
	@ docker build ./agent/ -t agent \
	  --build-arg USER_ID=$$(id -u) \
	  --build-arg GROUP_ID=$$(id -g) \

	@ echo Running and configuring container with agent environment...
	@ docker rm -f $(container_name) || echo -n
	@ docker run --rm -it \
	  --name $(container_name) \
	  -v "$(PWD):/app" \
	  -v $(container_name)-tmp:/tmp/ \
	  -v $(container_name)-home:/home/ubuntu \
	  -v ./agent/.ssh:/home/ubuntu/.ssh \
	  -v ./agent/.codex/config.toml:/home/ubuntu/.codex/config.toml \
	  -v ./agent/.agents/:/home/ubuntu/.agents \
	  -v "$(HOME)/.codex/auth.json:/home/ubuntu/.codex/auth.json:ro" \
	  -p 127.0.0.1:2255:22 \
	  --cpu-quota=400000 \
	  --memory=5368709120 \
	  --detach \
	  agent

	@ docker logs $(container_name) -f | ./agent/wait-for-start.sh

check-agent:
ifneq ($(shell docker inspect $(container_name) | jq -r '.[].State.Status'), running)
	make agent-start-in-docker
endif

agent: check-agent
	docker exec -it $(container_name) bash -ic 'codex resume'

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
