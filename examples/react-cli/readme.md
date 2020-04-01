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
Our project already configured with the basic packages, so yo just need to run the proccess, first we need to start the proccess wich builds the JS and parses it


```
$ yarn dev
```

After run this command your code will start waching file changes, don't close this process and start a new one and run following command:


```
$ yarn react-cli
```

The first process create an internal build so you can access as a normal daemon as long the firs proccess still rnning, you can check details of all this things into [Pastel documentation](https://github.com/vadimdemedes/pastel) 
