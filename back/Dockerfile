# ===============
# |   backend   |
# ===============
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

FROM python:3.14.3-trixie
WORKDIR /app

# install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# copy the rest of the files
COPY . .

EXPOSE 8000
CMD ["fastapi", "run"]