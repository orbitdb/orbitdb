all: build

deps:
	npm install

test: deps
	npm run test
	
build: test
	npm run build
	mkdir -p examples/browser/lib/
	cp dist/orbitdb.min.js examples/browser/lib/orbitdb.min.js
	cp node_modules/ipfs/dist/index.min.js examples/browser/lib/ipfs.min.js
	@echo "Build success!"
	@echo "Output: 'dist/', 'examples/browser/'"

clean:
	rm -rf orbitdb/
	rm -rf node_modules/
	rm package-lock.json

.PHONY: test build
