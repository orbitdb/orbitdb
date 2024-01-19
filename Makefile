all: build

deps:
	npm install

test: deps
	npm run test -- --exit

build: test
	npm run build
	@echo "Build success!"

clean:
	rm -rf node_modules/
	rm -rf docs/api/
	rm -rf dist/
	rm -f test/browser/bundle.js*

clean-dependencies: clean
	rm -f package-lock.json

rebuild: | clean-dependencies build

.PHONY: test build
