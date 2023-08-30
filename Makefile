all: build

deps:
	npm install

test: deps
	npm run test -- --exit

build: test
	mkdir -p examples/browser/lib/
	npm run build
	@echo "Build success!"

clean:
	rm -rf node_modules/
	rm -rf coverage/
	rm -rf docs/api/
	rm -f test/browser/bundle.js*

clean-dependencies: clean
	rm -f package-lock.json

rebuild: | clean-dependencies build

.PHONY: test build
