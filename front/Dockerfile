FROM node:20-slim

WORKDIR /app

# ================
# |   frontend   |
# ================
#   o
#    o
#      o
#         /\      /\
#       -/--\----/--\-
#      /  /\      /\  \
#     /  (())    (())  \
#     \   \/      \/   /
#      \    (_/\_)    /
#       --------------

# install pnpm
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# copy files to docker image and install dependencies
COPY . .
RUN pnpm install

# build
RUN pnpm build

EXPOSE 3000
# this runs next.js's serving code, supposed to be fast and optimized
CMD ["pnpm", "next", "start"]