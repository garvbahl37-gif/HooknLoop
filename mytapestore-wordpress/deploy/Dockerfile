# syntax=docker/dockerfile:1.7
###############################################################################
# MyTapeStore draft store — WordPress 7.0.3 + WooCommerce 11.0 on SQLite
#
#   docker build -f deploy/Dockerfile -t mytapestore:draft .
#   (build context = the repo root, mytapestore-wordpress/)
#
# Base is php:8.3-apache, deliberately NOT the official `wordpress` image.
# The tree we ship already carries WP core 7.0.3 (wp_db_version 61833), which is
# what wrote the SQLite file. The `wordpress` image lays its own core down over
# the volume on entrypoint and would hand us a core/DB version mismatch plus a
# duplicate wp-config. We want the audited bytes, unchanged.
#
# blueprint.json is not used here. Playground supplied WooCommerce, the SQLite
# driver and the theme mount at boot; a container has to carry all three itself.
###############################################################################


###############################################################################
# Stage 1 — unpack the SQLite driver that Playground injected into the VFS.
# It exists nowhere in local/wordpress; without it WordPress falls through to
# the MySQL path in wp-config and dies on database_name_here@localhost.
###############################################################################
FROM debian:bookworm-slim AS sqlite-driver
RUN apt-get update \
 && apt-get install -y --no-install-recommends unzip \
 && rm -rf /var/lib/apt/lists/*
COPY node_modules/@wp-playground/cli/sqlite-database-integration.zip /tmp/sqlite.zip
# The zip's top-level dir is `plugin-sqlite-database-integration`; db.copy's
# fallback path resolver looks for `plugins/sqlite-database-integration`, so the
# rename is load-bearing.
RUN set -eux; \
    unzip -q /tmp/sqlite.zip -d /tmp/x; \
    mkdir -p /out; \
    mv /tmp/x/plugin-sqlite-database-integration /out/sqlite-database-integration; \
    test -f /out/sqlite-database-integration/wp-includes/sqlite/db.php


###############################################################################
# Stage 2 — runtime
###############################################################################
FROM php:8.3-apache

# --- PHP extensions -------------------------------------------------------
# pdo_sqlite  : mandatory. WP_SQLite_Connection does `new PDO('sqlite:...')`.
#               sqlite3 is NOT needed — the driver is PDO-only.
# gd          : WP media + WooCommerce resizing (imagick deliberately omitted;
#               WC probes for it and degrades to gd).
# mbstring    : theme mb_substr/mb_strtoupper/mb_strlen + WooCommerce.
# exif        : WP media orientation handling.
# zip         : WC CSV export, any plugin/theme upload.
# intl        : Collator, locale/currency formatting in WC.
# bcmath      : WC currency math.
# opcache     : the difference between 400ms and 90ms per page on a 0.5 vCPU box.
# dom/xml/simplexml/tokenizer/iconv/curl/openssl/json/hash/fileinfo/sodium are
# already on in php:8.3. mysqli/pdo_mysql are intentionally absent.
RUN set -eux; \
    savedAptMark="$(apt-mark showmanual)"; \
    apt-get update; \
    apt-get install -y --no-install-recommends \
        libsqlite3-dev \
        libfreetype6-dev libjpeg62-turbo-dev libpng-dev libwebp-dev \
        libonig-dev libzip-dev libicu-dev; \
    docker-php-ext-configure gd --with-freetype --with-jpeg --with-webp; \
    docker-php-ext-install -j"$(nproc)" \
        pdo_sqlite gd mbstring exif zip intl bcmath opcache; \
    apt-mark auto '.*' > /dev/null; \
    apt-mark manual $savedAptMark > /dev/null; \
    ldd "$(php -r 'echo ini_get("extension_dir");')"/*.so \
      | awk '/=>/ { so = $(NF-1); if (index(so, "/usr/local/") == 1) next; gsub("^/(usr/)?", "", so); print so }' \
      | sort -u \
      | xargs -r dpkg-query --search 2>/dev/null \
      | cut -d: -f1 | sort -u | xargs -r apt-mark manual; \
    apt-get purge -y --auto-remove -o APT::AutoRemove::RecommendsImportant=false; \
    rm -rf /var/lib/apt/lists/*

# htpasswd, for the review gate. Tiny; worth not hand-rolling bcrypt.
RUN apt-get update \
 && apt-get install -y --no-install-recommends apache2-utils \
 && rm -rf /var/lib/apt/lists/*

# --- hard floor check ------------------------------------------------------
# 59 of the 61 tables are STRICT and the file was written by SQLite 3.51.
# WP_MySQL_On_SQlite::MINIMUM_SQLITE_VERSION is 3.37.0. Fail the BUILD, not the
# first request, if the base image ever drifts below that.
RUN php -r '$v = (new PDO("sqlite::memory:"))->getAttribute(PDO::ATTR_SERVER_VERSION); \
    fwrite(STDERR, "libsqlite3: $v\n"); \
    if (version_compare($v, "3.37.0", "<")) { \
        fwrite(STDERR, "FATAL: libsqlite3 < 3.37.0 cannot open STRICT tables\n"); exit(1); }'

# --- Apache ----------------------------------------------------------------
# rewrite : no .htaccess exists anywhere in the tree and permalinks are
#           /blog/%postname%/ — Playground did the routing. Rules go in the
#           vhost instead, so AllowOverride stays None (faster, and one less
#           writable file).
# headers : X-Robots-Tag.
# remoteip: every host in scope terminates TLS at an edge proxy; without this
#           every request logs and rate-limits as the proxy's IP.
RUN a2enmod rewrite headers remoteip expires \
 && a2dismod -f autoindex status \
 && a2dissite 000-default
COPY deploy/apache-site.conf /etc/apache2/sites-available/mytapestore.conf
COPY deploy/apache-mpm.conf  /etc/apache2/mods-available/mpm_prefork.conf
COPY deploy/php.ini          /usr/local/etc/php/conf.d/zz-mytapestore.ini
RUN a2ensite mytapestore \
 && printf 'ServerName localhost\nServerTokens Prod\nServerSignature Off\n' \
      > /etc/apache2/conf-available/hardening.conf \
 && a2enconf hardening \
 && printf 'ok\n' > /var/www/healthz

# --- SQLite driver + db.php drop-in ---------------------------------------
COPY --from=sqlite-driver /out/sqlite-database-integration \
                          /var/www/html/wp-content/plugins/sqlite-database-integration
RUN sed 's#{SQLITE_IMPLEMENTATION_FOLDER_PATH}#/var/www/html/wp-content/plugins/sqlite-database-integration#' \
        /var/www/html/wp-content/plugins/sqlite-database-integration/db.copy \
        > /var/www/html/wp-content/db.php

###############################################################################
# --- the site ---
# Ordered coldest-first on purpose. `theme/` is the only tree that changes day
# to day; putting it last means a theme edit rebuilds ~55 MB of layers instead
# of ~460 MB, and `fly deploy` pushes seconds instead of minutes.
#
# Source is build/site (assembled by scripts/build-web-bundle.sh: core +
# WooCommerce + uploads + DB + theme/ already copied into
# wp-content/themes/mytapestore). If you are building straight from the working
# tree instead, swap the COPY lines for:
#     COPY local/wordpress/wp-admin     /var/www/html/wp-admin
#     COPY local/wordpress/wp-includes  /var/www/html/wp-includes
#     ...
#     COPY theme                        /var/www/html/wp-content/themes/mytapestore
# — note that wp-content/themes/mytapestore inside local/wordpress is an EMPTY
# mount point; copying local/wordpress alone ships a site with no active theme.
###############################################################################
COPY build/site/wp-includes  /var/www/html/wp-includes
COPY build/site/wp-admin     /var/www/html/wp-admin
COPY build/site/*.php /var/www/html/
COPY build/site/wp-content/index.php  /var/www/html/wp-content/index.php
COPY build/site/wp-content/plugins    /var/www/html/wp-content/plugins
COPY build/site/wp-content/fonts      /var/www/html/wp-content/fonts

# Mutable trees are staged under /usr/src/seed and copied to the data dir by the
# entrypoint — never served from here.
COPY build/site/wp-content/uploads    /usr/src/seed/uploads
COPY build/site/wp-content/database   /usr/src/seed/database

# Changes most often — keep last.
COPY build/site/wp-content/themes/mytapestore \
     /var/www/html/wp-content/themes/mytapestore

# The two bundled default themes and akismet are dead weight (14.4 MB + 0.4 MB)
# and akismet is inactive. Dropping twentytwentyfive/four leaves
# twentytwentythree as a fallback so a theme fatal degrades instead of
# white-screening.
RUN rm -rf /var/www/html/wp-content/themes/twentytwentyfour \
           /var/www/html/wp-content/themes/twentytwentyfive \
           /var/www/html/wp-content/plugins/akismet \
           /var/www/html/wp-content/plugins/hello.php \
           /var/www/html/wp-content/plugins/woocommerce/i18n/languages/woocommerce.pot \
           /var/www/html/mts-content /var/www/html/mts-scripts \
           /var/www/html/wp-config-sample.php /var/www/html/readme.html \
           /var/www/html/license.txt

# --- config + tooling ------------------------------------------------------
# The Playground-era wp-config.php is replaced wholesale: it has placeholder
# MySQL creds, all eight salts literally "put your unique phrase here",
# WP_DEBUG defined twice (the second define is a no-op that emits a warning),
# and no WP_HOME/WP_SITEURL to override the http://127.0.0.1:9400 in wp_options.
COPY deploy/wp-config.php        /var/www/html/wp-config.php
COPY deploy/migrate-urls.php     /usr/local/bin/migrate-urls.php
COPY deploy/gen-salts.php        /usr/local/bin/gen-salts.php
COPY deploy/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Code stays root-owned and read-only to the web user; only /var/www/data is
# writable, and the entrypoint chowns it. Paired with DISALLOW_FILE_MODS this
# means a compromised plugin cannot write PHP into the docroot.
RUN mkdir -p /var/www/data \
 && chown www-data:www-data /var/www/data \
 && chown -R root:root /var/www/html \
 && chmod -R go-w /var/www/html

ENV SITE_URL="" \
    SEED_MODE="image" \
    APACHE_RUN_USER=www-data \
    APACHE_RUN_GROUP=www-data

EXPOSE 80
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["apache2-foreground"]
