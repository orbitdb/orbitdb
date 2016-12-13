all: build

deps:
	npm install

test: deps
	npm run test
	
build: test
	npm run build
	@echo "Build success!"
	@echo "Output: 'dist/', 'examples/browser/'"

clean:
	rm -rf orbit-db/
	rm -rf ipfs/
	rm -rf node_modules/

.PHONY: test build
