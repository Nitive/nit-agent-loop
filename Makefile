.PHONY: agent
agent:
	docker build ./agent/ -t agent
	docker run --rm -it \
	  -v ./agent/tmp/:/tmp/ \
	  -v ./agent/.codex/:/home/me/.codex/ \
	  -v "$$HOME/.codex/auth.json:/home/me/.codex/auth.json:ro" \
	  agent
