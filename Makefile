token=
team=
name=

npm=$(shell which npm)
mocha=./node_modules/.bin/mocha
lint=./node_modules/.bin/coffeelint
gulp=./node_modules/.bin/gulp
monitoring-code=local
credential=./credentials/development

.PHONY:test

all: install

install:
	$(npm) install
	test -f settings/poems.json || cp settings/poems.json.sample settings/poems.json
	test -f settings/relayblog.json || cp settings/relayblog.json.sample settings/relayblog.json

start:
	. $(credential); \
		export HUBOT_SLACK_TOKEN; \
		export HUBOT_SLACK_TEAM; \
		export HUBOT_SLACK_BOTNAME; \
		./bin/hubot --adapter slack monitoring-code=$(monitoring-code);

start-local:
	./bin/hubot

test-watch:
	$(gulp) watch

test: lint config-check
	$(mocha) --compilers coffee:coffee-script/register --recursive -R spec
	test -f settings/hello.json
	test -f settings/poems.json
	test -f settings/relayblog.json

lint:
	$(lint) scripts -f lintconfig.json

config-check:
	./bin/hubot --config-check

run-new-channels:
	./bin/start-new-channels $(credential)
