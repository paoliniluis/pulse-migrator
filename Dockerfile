## Provides a docker alternative method to execute index.ts without having to install bun on your computer

## You can then build this Docker image like this:
# docker build -t pulse-migrator .

## And then run the container like this:
# docker run -e NODE_TLS_REJECT_UNAUTHORIZED=0 -e HOST=<hostname> -e USERNAME=<username> -e PASSWORD=<password> pulse-migrator


# Use the official Node.js 16 image as a base
FROM node:16

# Install bun
RUN curl https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"

# Set the working directory in the container
WORKDIR /app

# Copy your TypeScript file and any other necessary files into the container
COPY . /app

# Expose the port Metabase runs on if necessary (you might not need this line)
# EXPOSE 3000

# Command to run your script
# Replace `index.ts` with the actual path to your TypeScript file if necessary
CMD ["bun", "index.ts"]


