FROM ubuntu:16.04

RUN apt-get update && apt-get install --force-yes -y nodejs npm git

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

ENTRYPOINT ["docker-entrypoint.sh"]
