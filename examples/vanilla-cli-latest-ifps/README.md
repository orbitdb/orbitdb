# Vanilla Cli Latest IFPS

This project uses the latest version of IFPS, which has a different way to initiate the IFPS instance. You can compare both versions([IFPS old version](https://github.com/orbitdb/orbit-db/blob/master/examples/vanilla-cli)) and see how to configure each one and compare their differences.


## Installation
```bash
$ yarn install
# or
$ npm install
```

## Usage
The project is already configured with a basic webpack bundler config. It generates a build folder where you can test any of the following commands:

### **Eventlog:** Starts a orbitdb instance log with a local database, logging active users as logs
```
$ yarn eventlog
```

### **Keyvalue:** Starts a orbitdb instance keyvalue which shows logs as key value based data
```
$ yarn keyvalue
```

### **Browser Commands:** Opens the browser with UI to read database updates
```
$ yarn macos
$ yarn linux
$ yarn windows
```
