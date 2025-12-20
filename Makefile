COMPOSE_DIR := ops/docker

.PHONY: status-up status-down status-restart status-logs

status-up:
	sudo docker compose -f $(COMPOSE_DIR)/docker-compose.yml up -d

status-down:
	sudo docker compose -f $(COMPOSE_DIR)/docker-compose.yml down

status-restart:
	sudo docker compose -f $(COMPOSE_DIR)/docker-compose.yml down
	sudo docker compose -f $(COMPOSE_DIR)/docker-compose.yml up -d

status-logs:
	sudo docker compose -f $(COMPOSE_DIR)/docker-compose.yml logs -f --tail=100
