.PHONY: up down shell claude restart clean logs status

claude-data/.claude.json:
	mkdir -p claude-data
	echo '{}' > claude-data/.claude.json

up: claude-data/.claude.json
	docker compose up -d --build
	@echo "Containers started. Use 'make shell' or 'make claude' to access dev environment"

down:
	docker compose down

shell:
	docker compose exec dev bash

claude:
	docker compose exec dev c

restart: down up

clean: down
	docker compose down --rmi all --volumes

logs:
	docker compose logs -f

ps:
	docker compose ps
