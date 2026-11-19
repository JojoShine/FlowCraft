# Test infrastructure only; never pushed or used in production.
FROM golang:1.24.2-bookworm AS build
WORKDIR /src
RUN git init . && git remote add origin https://github.com/minio/minio.git \
    && git fetch --depth=1 origin 0d7408fc9969caf07de6a8c3a84f9fbb10a6739e \
    && git checkout --detach FETCH_HEAD \
    && test "$(git rev-parse HEAD)" = 0d7408fc9969caf07de6a8c3a84f9fbb10a6739e
RUN CGO_ENABLED=0 go build -trimpath -o /out/minio .
FROM debian:bookworm-slim
COPY --from=build /out/minio /usr/local/bin/minio
ENTRYPOINT ["minio"]
CMD ["server", "/data"]
