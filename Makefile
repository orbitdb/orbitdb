all: build

deps:
	@npm install

test: deps
	@npm run test
	
build: deps
	@npm run build
	@echo "Build success!"
	@echo "Output: 'dist/', 'examples/browser/'"

clean:
	rm -rf orbit-db/
	rm -rf ipfs/
	rm -rf node_modules/

.PHONY: all deps test clean
