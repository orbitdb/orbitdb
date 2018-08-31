# Running OrbitDB code in containers

[Docker](https://github.com/docker/docker-ce) is a tool for running software in containers ie. OS-level virtualization. This directory contains the needed configuration files to:

- Build base Docker images for OrbitDB


## Base Docker image

[Dockerfile](Dockerfile) defines OrbitDB base images that are based on [official node.js -image](https://hub.docker.com/_/node/). 

Build local images with command (in repository root):

```bash
docker build -t orbit-db -f docker/Dockerfile .
```

After building local image, run node.js-examples inside container:

```bash
docker run -ti --rm orbit-db npm run examples:node
```

## Tested versions

- Docker 1.13.1 (Fedora Linux 27)
