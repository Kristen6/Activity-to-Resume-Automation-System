# This is still experimental

WORKDIR /usr/src/app
RUN apt-get update
RUN apt install nodejs

# frontend
# pnpm
RUN wget -qO- https://get.pnpm.io/install.sh | ENV="$HOME/.bashrc" SHELL="$(which bash)" bash -
RUN pnpm install
COPY frontend frontend
RUN cd frontend
# build static files
RUN pnpm next build
