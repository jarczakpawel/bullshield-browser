#!/usr/bin/make

.DEFAULT_GOAL := build
.MAIN := build

NODE_IMAGE = node:24-alpine
RUN_ARGS = --rm -v "$(shell pwd):/src:rw" \
	-t --workdir "/src" \
	-u "$(shell id -u):$(shell id -g)" \
	-e "NPM_CONFIG_UPDATE_NOTIFIER=false" \
	-e PATH="$$PATH:/src/node_modules/.bin" $(NODE_IMAGE)

.PHONY: install
install:
	docker run $(RUN_ARGS) npm ci

.PHONY: shell
shell:
	docker run -e "PS1=\[\033[1;34m\]\w\[\033[0;35m\] \[\033[1;36m\]# \[\033[0m\]" -i $(RUN_ARGS) sh

.PHONY: build
build: install
	docker run $(RUN_ARGS) npm run build

.PHONY: fmt
fmt:
	docker run $(RUN_ARGS) npm run fmt

.PHONY: test
test:
	docker run $(RUN_ARGS) npm run lint
	docker run $(RUN_ARGS) npm run test

.PHONY: watch
watch:
	docker run $(RUN_ARGS) npm run watch
