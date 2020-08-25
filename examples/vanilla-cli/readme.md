# Vanilla Cli
This project uses old version of IFPS (0.40), which have a different way to initiate the IFPS instance, you can compare both versions([IFPS latest version](https://github.com/orbitdb/orbit-db/blob/master/examples/vanilla-cli-ifps-latest)) and see how to configure each one and their differences.

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
