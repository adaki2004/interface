# Use Node.js as the base image
FROM node:16

# Set working directory
WORKDIR /app

# Install dependencies
RUN apt-get update && apt-get install -y git

# Clone and build the Uniswap SDK
RUN git clone https://github.com/adaki2004/v2-sdk ../v2-sdk && \
    cd ../v2-sdk && \
    git checkout gwyneth_uniswapV2 && \
    yarn install && yarn build

# Copy UI project files
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy the entire UI code
COPY . .

# Expose the necessary port
EXPOSE 3000
# Set environment variable to allow connections from outside localhost
ENV CI=true
ENV WATCHPACK_POLLING=true
ENV WDS_SOCKET_HOST=0.0.0.0
ENV WDS_SOCKET_PORT=3000

# Start the app with nodemon to keep it running
CMD ["sh", "-c", "yarn start --host 0.0.0.0"]

