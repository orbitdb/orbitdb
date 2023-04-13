all: build

deps:
	npm install

test: deps
	npm run test -- --exit

build: test
	mkdir -p examples/browser/lib/
	npm run build
	cp dist/orbitdb.min.js examples/browser/lib/orbitdb.min.js
	cp dist/orbitdb.js examples/browser/lib/orbitdb.js
	cp dist/orbitdb.js.map examples/browser/lib/orbitdb.js.map
	cp node_modules/ipfs/dist/index.min.js examples/browser/lib/ipfs.min.js
	cp node_modules/ipfs/dist/index.min.js examples/browser/lib/ipfs.js
	@echo "Build success!"
	@echo "Output: 'dist/', 'examples/browser/'"

clean:
	rm -rf node_modules/
	rm -rf coverage/
	rm -rf out/
	rm -f test/browser/bundle.js*

clean-dependencies: clean
	rm -f package-lock.json

rebuild: | clean-dependencies build

.PHONY: test build
