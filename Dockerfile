# Use Node.js as the base image
FROM node:18

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

# Start the app
CMD ["yarn", "start"]
