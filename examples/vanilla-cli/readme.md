# Vanilla Cli

This project uses the IFPS version 0.37, 
## Configure

```bash
$ yarn install
```
or
```bash
$ npm install
```

## Usage
The project already configured with a basic webpack bundler, which generates a build folder, you can test the events running one of the following commands

### Eventlog
Starts a orbitdb instance log with a local database, logging active users as logs
```
$ yarn eventlog
```

### Keyvalue
Starts a orbitdb instance keyvalue which shows logs as key value based data
```
$ yarn keyvalue
```

### Browser Cmds
Opens the browser with UI to read database updates
```
$ yarn macos
$ yarn linux
$ yarn windows
```
