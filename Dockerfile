FROM node:24-slim
WORKDIR /app
# Named volumes inherit this ownership, so the node user can write node_modules and .next.
RUN mkdir -p node_modules .next && chown -R node:node /app
USER node
