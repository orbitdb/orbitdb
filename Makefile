all: build

deps:
	npm install

test: deps
	npm run test
	
build: test
	npm run build
	mkdir -p examples/browser/lib/
	cp dist/orbitdb.min.js examples/browser/lib/orbitdb.min.js
	cp node_modules/ipfs-daemon/dist/ipfs-browser-daemon.min.js examples/browser/lib/ipfs-browser-daemon.min.js
	@echo "Build success!"
	@echo "Output: 'dist/', 'examples/browser/'"

clean:
	rm -rf orbit-db/
	rm -rf ipfs/
	rm -rf node_modules/

.PHONY: test build
