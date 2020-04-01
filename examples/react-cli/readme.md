# React Cli

This project runs the same basic version of the vanilla-cli, With the difference that runs with React - to Archieve this we use 2 aditional frameworks:
 - [Ink](https://github.com/vadimdemedes/ink)
 - [Pastel](https://github.com/vadimdemedes/pastel)

 They help handle basic CLI configs such as receive params and other things, you can check they docs and see all options they provide.

## Configure

```bash
$ yarn install
```
or
```bash
$ npm install
```

## CLI
Our project already configured with the basic packages, so yo just need to run the process, first we need to start the process which builds the JS and parse it, once running don't close it

```
$ yarn dev
```

It gonna be waching file changes, so you don't need to rebuild every time. In order to run the our orbit-db code we need to execute our `users` command, each file inside `commands` folder refeers to a CLI command, understaing this we can run our command:

```
$ yarn react-cli users
```
The first process create an internal build so you can access as a normal daemon as long the first process still running. 
If we had other files, each one would refeer to an command, you can check other details checking into [Pastel documentation](https://github.com/vadimdemedes/pastel) 

After all you should be able to see something like this into your terminal
![CLI Running our users table](cli.png)